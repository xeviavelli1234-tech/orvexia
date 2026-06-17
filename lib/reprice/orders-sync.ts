import "server-only";
import { prisma } from "@/lib/prisma";
import { SpApiClient } from "@/lib/amazon/client";
import { decryptToken } from "@/lib/crypto";
import { listOrdersSince } from "@/lib/amazon/orders";

export interface OrdersSyncResult {
  accountsProcessed: number;
  ordersImported: number;
  itemsImported: number;
  errors: string[];
}

interface OrderAccountRow {
  id: string;
  refreshToken: string;
  spApiEnv: string;
  marketplaceId: string;
}

const ORDER_ACCOUNT_SELECT = {
  id: true,
  refreshToken: true,
  spApiEnv: true,
  marketplaceId: true,
} as const;

function emptyOrdersResult(): OrdersSyncResult {
  return { accountsProcessed: 0, ordersImported: 0, itemsImported: 0, errors: [] };
}

/** Procesa los pedidos de UNA cuenta, acumulando en `result`. */
async function processAccountOrders(
  acc: OrderAccountRow,
  sinceDays: number,
  result: OrdersSyncResult,
): Promise<void> {
  result.accountsProcessed++;
  try {
      const client = new SpApiClient(
        decryptToken(acc.refreshToken),
        acc.spApiEnv as "sandbox" | "production",
        "eu",
      );
      const orders = await listOrdersSince(
        { client, spApiEnv: acc.spApiEnv, marketplaceId: acc.marketplaceId },
        sinceDays,
      );
      for (const o of orders) {
        // Idempotente: si ya existe, saltamos sin tocar (no machacamos)
        const existing = await prisma.repriceOrder.findUnique({
          where: {
            sellerAccountId_amazonOrderId: {
              sellerAccountId: acc.id,
              amazonOrderId: o.amazonOrderId,
            },
          },
          select: { id: true },
        });
        if (existing) continue;

        // Vinculación con listings: por SKU exacto
        const skus = [...new Set(o.items.map((i) => i.sku).filter(Boolean))];
        const listings = skus.length
          ? await prisma.sellerListing.findMany({
              where: { sellerAccountId: acc.id, sku: { in: skus } },
              select: { id: true, sku: true },
            })
          : [];
        const skuToListingId = new Map(listings.map((l) => [l.sku, l.id]));

        const created = await prisma.repriceOrder.create({
          data: {
            sellerAccountId: acc.id,
            amazonOrderId: o.amazonOrderId,
            purchaseDate: o.purchaseDate,
            orderStatus: o.orderStatus,
            totalAmount: o.totalAmount,
            currency: o.currency,
            marketplaceId: o.marketplaceId,
            buyerEmail: o.buyerEmail,
            fulfillment: o.fulfillment,
            items: {
              create: o.items.map((it) => ({
                asin: it.asin,
                sku: it.sku,
                title: it.title.slice(0, 500),
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                itemPrice: it.itemPrice,
                listingId: skuToListingId.get(it.sku) ?? null,
              })),
            },
          },
          select: { id: true, items: { select: { id: true } } },
        });
        result.ordersImported++;
        result.itemsImported += created.items.length;
      }
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : String(e);
    result.errors.push(`[${acc.id}] ${msg}`);
  }
}

/**
 * Sincroniza pedidos SP-API Orders de TODAS las cuentas activas (cron).
 * Idempotente: amazonOrderId como clave única. Vincula items con SellerListing.
 */
export async function syncAllAccountsOrders(opts?: {
  sinceDays?: number;
}): Promise<OrdersSyncResult> {
  const result = emptyOrdersResult();
  const sinceDays = opts?.sinceDays ?? 14;
  const accounts = await prisma.sellerAccount.findMany({
    where: { active: true },
    select: ORDER_ACCOUNT_SELECT,
  });
  for (const acc of accounts) await processAccountOrders(acc, sinceDays, result);
  return result;
}

/**
 * Sincroniza pedidos SOLO de la cuenta indicada. Para la acción por-usuario:
 * cada vendedor sincroniza LA SUYA, sin disparar fetches a Amazon con las
 * credenciales de otros tenants.
 */
export async function syncOrdersForAccount(
  accountId: string,
  opts?: { sinceDays?: number },
): Promise<OrdersSyncResult> {
  const result = emptyOrdersResult();
  const sinceDays = opts?.sinceDays ?? 14;
  const acc = await prisma.sellerAccount.findFirst({
    where: { id: accountId, active: true },
    select: ORDER_ACCOUNT_SELECT,
  });
  if (acc) await processAccountOrders(acc, sinceDays, result);
  return result;
}

// ─── KPIs derivados ────────────────────────────────────────────────────────
export interface SalesKpis {
  ordersTotal: number;
  unitsTotal: number;
  revenueTotal: number;
  ordersByDay: Array<{ day: string; orders: number; units: number; revenue: number }>;
  topSkus: Array<{ sku: string; title: string; units: number; revenue: number }>;
  hourlyDistribution: number[]; // 0..23
}

export async function getSalesKpisForUser(
  userId: string,
  days = 30,
): Promise<SalesKpis> {
  const empty: SalesKpis = {
    ordersTotal: 0,
    unitsTotal: 0,
    revenueTotal: 0,
    ordersByDay: [],
    topSkus: [],
    hourlyDistribution: new Array(24).fill(0),
  };
  const acc = await prisma.sellerAccount.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!acc) return empty;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const orders = await prisma.repriceOrder.findMany({
    where: { sellerAccountId: acc.id, purchaseDate: { gte: since } },
    select: {
      purchaseDate: true,
      totalAmount: true,
      items: {
        select: { sku: true, title: true, quantity: true, itemPrice: true },
      },
    },
    orderBy: { purchaseDate: "asc" },
  });

  const byDay = new Map<string, { orders: number; units: number; revenue: number }>();
  const hourly = new Array(24).fill(0);
  const bySku = new Map<string, { sku: string; title: string; units: number; revenue: number }>();
  let unitsTotal = 0;
  let revenueTotal = 0;

  for (const o of orders) {
    const day = o.purchaseDate.toISOString().slice(0, 10);
    const cell = byDay.get(day) ?? { orders: 0, units: 0, revenue: 0 };
    cell.orders++;
    hourly[o.purchaseDate.getHours()]++;
    for (const it of o.items) {
      cell.units += it.quantity;
      cell.revenue += it.itemPrice ?? 0;
      unitsTotal += it.quantity;
      revenueTotal += it.itemPrice ?? 0;
      const key = it.sku;
      const prev = bySku.get(key) ?? { sku: key, title: it.title, units: 0, revenue: 0 };
      prev.units += it.quantity;
      prev.revenue += it.itemPrice ?? 0;
      bySku.set(key, prev);
    }
    byDay.set(day, cell);
  }

  const topSkus = [...bySku.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 10);

  return {
    ordersTotal: orders.length,
    unitsTotal,
    revenueTotal: Math.round(revenueTotal * 100) / 100,
    ordersByDay: [...byDay.entries()]
      .map(([day, v]) => ({ day, ...v, revenue: Math.round(v.revenue * 100) / 100 }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    topSkus: topSkus.map((s) => ({ ...s, revenue: Math.round(s.revenue * 100) / 100 })),
    hourlyDistribution: hourly,
  };
}

/** Velocidad de venta diaria para un listing concreto (últimos N días). */
export async function getSalesVelocity(
  listingId: string,
  days = 30,
): Promise<{ unitsPerDay: number; totalUnits: number; days: number } | null> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const items = await prisma.repriceOrderItem.findMany({
    where: { listingId, createdAt: { gte: since } },
    select: { quantity: true },
  });
  if (items.length === 0) return { unitsPerDay: 0, totalUnits: 0, days };
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  return {
    totalUnits,
    days,
    unitsPerDay: Math.round((totalUnits / days) * 100) / 100,
  };
}
