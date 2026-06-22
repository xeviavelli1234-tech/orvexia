import "server-only";

import { prisma } from "@/lib/prisma";
import {
  aggregateProfit,
  recordsFromOrderItems,
  type ListingCost,
  type ProfitSummary,
} from "./profit";

export interface ProfitReport extends ProfitSummary {
  /** Ventana consultada, en días. */
  days: number;
  /** true si el vendedor tiene cuenta conectada. */
  hasAccount: boolean;
  /** Nº de SKUs vendidos sin coste de producto definido (beneficio incompleto). */
  skusMissingCost: number;
}

const EMPTY: ProfitReport = {
  days: 0,
  hasAccount: false,
  skusMissingCost: 0,
  totals: {
    lines: 0,
    units: 0,
    revenue: 0,
    netRevenue: 0,
    referralFee: 0,
    cost: 0,
    profit: 0,
    marginPct: 0,
    estimatedUnits: 0,
    hasEstimated: false,
  },
  bySku: [],
};

/**
 * Informe de beneficio realizado de un vendedor en los últimos `days` días.
 *
 * Capa de datos delgada: carga listings (costes) y pedidos del periodo y
 * delega TODO el cálculo en las funciones puras `recordsFromOrderItems` +
 * `aggregateProfit`. Solo lectura, no muta nada.
 */
export async function getProfitSummary(
  userId: string,
  days = 30,
): Promise<ProfitReport> {
  const acc = await prisma.sellerAccount.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!acc) return { ...EMPTY, days };

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [listings, orders] = await Promise.all([
    prisma.sellerListing.findMany({
      where: { sellerAccountId: acc.id },
      select: {
        sku: true,
        asin: true,
        title: true,
        cost: true,
        shippingCost: true,
        fbaFee: true,
        feePercent: true,
        vatRate: true,
        priceCurrent: true,
      },
    }),
    prisma.repriceOrder.findMany({
      where: { sellerAccountId: acc.id, purchaseDate: { gte: since } },
      select: {
        items: {
          select: {
            sku: true,
            asin: true,
            title: true,
            quantity: true,
            itemPrice: true,
            unitPrice: true,
          },
        },
      },
    }),
  ]);

  const listingsBySku = new Map<string, ListingCost>(
    listings.map((l) => [l.sku, l]),
  );
  const skusWithCost = new Set(
    listings.filter((l) => l.cost != null && l.cost > 0).map((l) => l.sku),
  );

  const items = orders.flatMap((o) => o.items);
  const records = recordsFromOrderItems(items, listingsBySku);
  const summary = aggregateProfit(records);

  const skusMissingCost = summary.bySku.filter(
    (s) => !skusWithCost.has(s.sku),
  ).length;

  return { ...summary, days, hasAccount: true, skusMissingCost };
}
