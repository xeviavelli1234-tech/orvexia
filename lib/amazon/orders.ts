import "server-only";
import { SpApiClient } from "./client";
import { MARKETPLACE_IDS } from "./endpoints";
import { isFixtureMode } from "./fixtures";

/**
 * Cliente SP-API Orders v0.
 *
 * IMPORTANTE: requiere rol "Orders" en la app SP-API (PII). Sin ese rol,
 * Amazon devuelve 403 — devolvemos un array vacío silenciosamente y
 * dejamos un warn en logs. En modo fixtures generamos pedidos sintéticos
 * para que el resto del producto (KPIs, heatmap) funcione visualmente.
 */

export interface NormalizedOrder {
  amazonOrderId: string;
  purchaseDate: Date;
  orderStatus: string;
  totalAmount: number | null;
  currency: string;
  marketplaceId: string;
  buyerEmail: string | null;
  fulfillment: string | null;
  items: NormalizedOrderItem[];
}

export interface NormalizedOrderItem {
  asin: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number | null;
  itemPrice: number | null;
}

interface SpOrdersResponse {
  payload?: {
    Orders?: SpOrder[];
    NextToken?: string;
  };
}
interface SpOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderStatus: string;
  OrderTotal?: { Amount: string; CurrencyCode: string };
  MarketplaceId?: string;
  BuyerInfo?: { BuyerEmail?: string };
  FulfillmentChannel?: string;
}
interface SpOrderItemsResponse {
  payload?: {
    OrderItems?: SpOrderItem[];
    NextToken?: string;
  };
}
interface SpOrderItem {
  ASIN?: string;
  SellerSKU?: string;
  Title?: string;
  QuantityOrdered?: number;
  ItemPrice?: { Amount: string; CurrencyCode: string };
  PromotionDiscount?: { Amount: string };
}

interface OrdersCtx {
  client: SpApiClient;
  spApiEnv: string;
  marketplaceId?: string;
}

export async function listOrdersSince(
  ctx: OrdersCtx,
  sinceDays = 14,
): Promise<NormalizedOrder[]> {
  if (isFixtureMode(ctx.spApiEnv)) {
    return generateFixtureOrders(sinceDays);
  }
  const marketplaceId = ctx.marketplaceId ?? MARKETPLACE_IDS.ES;
  const createdAfter = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
    .toISOString();

  const orders: NormalizedOrder[] = [];
  let nextToken: string | undefined;
  let pages = 0;
  try {
    do {
      const params: Record<string, string> = {
        MarketplaceIds: marketplaceId,
        CreatedAfter: createdAfter,
      };
      if (nextToken) params.NextToken = nextToken;
      const res = await ctx.client.get<SpOrdersResponse>("/orders/v0/orders", params);
      const list = res.payload?.Orders ?? [];
      for (const o of list) {
        const items = await fetchOrderItems(ctx, o.AmazonOrderId);
        orders.push({
          amazonOrderId: o.AmazonOrderId,
          purchaseDate: new Date(o.PurchaseDate),
          orderStatus: o.OrderStatus,
          totalAmount: o.OrderTotal ? Number(o.OrderTotal.Amount) : null,
          currency: o.OrderTotal?.CurrencyCode ?? "EUR",
          marketplaceId: o.MarketplaceId ?? marketplaceId,
          buyerEmail: o.BuyerInfo?.BuyerEmail ?? null,
          fulfillment: o.FulfillmentChannel ?? null,
          items,
        });
      }
      nextToken = res.payload?.NextToken;
      pages++;
      if (pages > 50) break; // freno de mano por si NextToken bucleara
    } while (nextToken);
  } catch (e) {
    const err = e as { status?: number; code?: string; message?: string };
    if (err.status === 403) {
      console.warn(
        "[orders] SP-API Orders devolvió 403 — la app no tiene el rol Orders aprobado todavía.",
      );
      return [];
    }
    throw e;
  }
  return orders;
}

async function fetchOrderItems(
  ctx: OrdersCtx,
  orderId: string,
): Promise<NormalizedOrderItem[]> {
  const out: NormalizedOrderItem[] = [];
  let nextToken: string | undefined;
  let pages = 0;
  do {
    const params: Record<string, string> = {};
    if (nextToken) params.NextToken = nextToken;
    const res = await ctx.client.get<SpOrderItemsResponse>(
      `/orders/v0/orders/${encodeURIComponent(orderId)}/orderItems`,
      params,
    );
    for (const it of res.payload?.OrderItems ?? []) {
      const itemPrice = it.ItemPrice ? Number(it.ItemPrice.Amount) : null;
      const qty = it.QuantityOrdered ?? 1;
      out.push({
        asin: it.ASIN ?? "",
        sku: it.SellerSKU ?? "",
        title: it.Title ?? "",
        quantity: qty,
        unitPrice: itemPrice != null && qty > 0 ? Math.round((itemPrice / qty) * 100) / 100 : null,
        itemPrice,
      });
    }
    nextToken = res.payload?.NextToken;
    pages++;
    if (pages > 20) break;
  } while (nextToken);
  return out;
}

/**
 * Genera pedidos sintéticos para modo fixtures: distribución plausible por
 * hora del día (más ventas 10-22h) y reparto entre 2-3 SKUs de muestra.
 */
function generateFixtureOrders(sinceDays: number): NormalizedOrder[] {
  const out: NormalizedOrder[] = [];
  const skus = [
    { asin: "B0FIXTURE01", sku: "ORX-LAV-001", title: "Lavadora demo" },
    { asin: "B0FIXTURE02", sku: "ORX-TV-001", title: "TV demo" },
    { asin: "B0FIXTURE03", sku: "ORX-FRI-001", title: "Frigorífico demo" },
  ];
  const baseSeed = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  for (let d = 0; d < sinceDays; d++) {
    const dayBase = baseSeed - d;
    const ordersThisDay = 2 + ((dayBase * 7) % 5); // 2..6 pedidos / día
    for (let i = 0; i < ordersThisDay; i++) {
      const hour = 10 + ((dayBase * 13 + i * 31) % 12); // 10..21h
      const minute = ((dayBase * 23 + i * 7) % 60);
      const purchase = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
      purchase.setHours(hour, minute, 0, 0);
      const sku = skus[(dayBase + i) % skus.length];
      const qty = 1 + ((dayBase + i) % 2);
      const unit = 99.99 + ((dayBase * 11 + i) % 200);
      const total = Math.round(unit * qty * 100) / 100;
      out.push({
        amazonOrderId: `DEMO-${dayBase}-${i}`,
        purchaseDate: purchase,
        orderStatus: "Shipped",
        totalAmount: total,
        currency: "EUR",
        marketplaceId: MARKETPLACE_IDS.ES,
        buyerEmail: null,
        fulfillment: "AFN",
        items: [
          {
            asin: sku.asin,
            sku: sku.sku,
            title: sku.title,
            quantity: qty,
            unitPrice: Math.round(unit * 100) / 100,
            itemPrice: total,
          },
        ],
      });
    }
  }
  return out;
}
