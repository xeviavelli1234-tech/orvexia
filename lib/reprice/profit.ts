/**
 * Beneficio REALIZADO a partir de ventas reales — FUNCIONES PURAS, testeables.
 *
 * A diferencia de `margin.ts` (que calcula el margen TEÓRICO al precio actual
 * de un listing), este módulo parte de lo que se vendió de verdad
 * (`RepriceOrderItem`): unidades, precio realmente cobrado y costes del SKU.
 *
 * Modelo fiscal y de comisiones: el mismo de `margin.ts` (precios IVA incl.,
 * comisión Amazon sobre el PVP, coste fijo = compra + envío + FBA). Por eso
 * reutilizamos `profitAt` en lugar de duplicar la matemática.
 *
 * Nota de honestidad de los datos:
 *   - `unitPrice` puede no venir de SP-API. Si falta, usamos `fallbackPrice`
 *     (precio actual del listing) y marcamos la línea como `estimated`.
 *   - El coste usado es el ACTUAL del listing, no el del día de la venta.
 *     El beneficio es por tanto una ESTIMACIÓN bien fundada, no contabilidad.
 */

import { profitAt, type CostInputs } from "./margin";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Una línea de venta (un SKU dentro de un pedido) más sus costes. */
export interface SaleLine {
  /** Unidades vendidas en la línea. */
  quantity: number;
  /** Precio unitario realmente cobrado (IVA incl.). null/0 si no disponible. */
  unitPrice?: number | null;
  /** Precio del listing a usar si falta `unitPrice` (marca la línea estimada). */
  fallbackPrice?: number | null;
  /** Costes del SKU (compra, envío, FBA, comisión, IVA). */
  cost: CostInputs;
}

/** Beneficio realizado de una línea de venta. */
export interface LineProfit {
  /** Unidades contabilizadas (≥ 0). */
  units: number;
  /** Precio unitario aplicado en el cálculo (IVA incl.). */
  unitPrice: number;
  /** true si se usó `fallbackPrice` porque no había `unitPrice`. */
  estimated: boolean;
  /** Ingreso bruto de la línea (IVA incl.) = unitPrice · units. */
  revenue: number;
  /** Ingreso neto de la línea (sin IVA). */
  netRevenue: number;
  /** Comisión de Amazon de la línea (€). */
  referralFee: number;
  /** Coste fijo por unidad (compra + envío + FBA). */
  unitCost: number;
  /** Coste total de la línea (unitCost · units). */
  cost: number;
  /** Beneficio total de la línea (€). */
  profit: number;
  /** Margen sobre el ingreso neto (%). */
  marginPct: number;
}

const n0 = (x: number | null | undefined) =>
  x != null && Number.isFinite(x) && x > 0 ? x : 0;

/**
 * Calcula el beneficio realizado de una línea de venta.
 *
 * Toma el desglose por unidad de `profitAt` (que ya aplica IVA, comisión y
 * coste fijo) y lo escala por las unidades vendidas. Si no hay `unitPrice`
 * usa `fallbackPrice` y marca `estimated`. Sin precio válido → todo a 0.
 */
export function lineProfit(line: SaleLine): LineProfit {
  const units = Math.max(0, Math.floor(n0(line.quantity)));

  const real = n0(line.unitPrice);
  const estimated = real <= 0;
  const unitPrice = estimated ? n0(line.fallbackPrice) : real;

  // Sin precio usable no hay dato de venta: no atribuimos beneficio ni coste
  // (evita imputar una pérdida fantasma por el coste fijo a un precio 0).
  if (unitPrice <= 0 || units <= 0) {
    return {
      units,
      unitPrice: 0,
      estimated,
      revenue: 0,
      netRevenue: 0,
      referralFee: 0,
      unitCost: 0,
      cost: 0,
      profit: 0,
      marginPct: 0,
    };
  }

  const per = profitAt(unitPrice, line.cost);

  return {
    units,
    unitPrice,
    estimated,
    revenue: round2(unitPrice * units),
    netRevenue: round2(per.netRevenue * units),
    referralFee: round2(per.referralFee * units),
    unitCost: per.unitCost,
    cost: round2(per.unitCost * units),
    profit: round2(per.profit * units),
    marginPct: per.marginPct,
  };
}

/** Una venta identificada por SKU (línea de pedido + a qué SKU pertenece). */
export interface SaleRecord extends SaleLine {
  sku: string;
  asin?: string;
  title?: string;
}

/** Beneficio realizado agregado de un SKU en el periodo consultado. */
export interface SkuProfit {
  sku: string;
  asin: string;
  title: string;
  /** Nº de líneas de venta agregadas. */
  lines: number;
  units: number;
  revenue: number;
  netRevenue: number;
  referralFee: number;
  cost: number;
  profit: number;
  /** Margen ponderado = beneficio / ingreso neto (%). */
  marginPct: number;
  /** Unidades cuyo precio fue estimado o desconocido. */
  estimatedUnits: number;
  /** true si alguna unidad del SKU usó precio estimado. */
  hasEstimated: boolean;
}

/** Resumen de rentabilidad: totales globales + desglose por SKU. */
export interface ProfitSummary {
  totals: Omit<SkuProfit, "sku" | "asin" | "title">;
  /** SKUs ordenados por beneficio descendente. */
  bySku: SkuProfit[];
}

function emptyAccumulator(): Omit<SkuProfit, "sku" | "asin" | "title" | "marginPct"> {
  return {
    lines: 0,
    units: 0,
    revenue: 0,
    netRevenue: 0,
    referralFee: 0,
    cost: 0,
    profit: 0,
    estimatedUnits: 0,
    hasEstimated: false,
  };
}

const marginOf = (profit: number, netRevenue: number) =>
  netRevenue > 0 ? round2((profit / netRevenue) * 100) : 0;

/**
 * Agrega varias ventas (`SaleRecord`) en un resumen de rentabilidad.
 *
 * Calcula cada línea con `lineProfit`, las acumula por SKU y produce los
 * totales globales. El margen es PONDERADO (beneficio total / ingreso neto
 * total), no la media de los márgenes por línea. Los SKUs salen ordenados
 * por beneficio descendente para ver de un vistazo qué deja dinero y qué no.
 */
export function aggregateProfit(records: SaleRecord[]): ProfitSummary {
  const groups = new Map<
    string,
    { meta: { asin: string; title: string }; acc: ReturnType<typeof emptyAccumulator> }
  >();
  const totalsAcc = emptyAccumulator();

  for (const rec of records) {
    const lp = lineProfit(rec);
    const sku = rec.sku || "";

    let g = groups.get(sku);
    if (!g) {
      g = { meta: { asin: rec.asin ?? "", title: rec.title ?? "" }, acc: emptyAccumulator() };
      groups.set(sku, g);
    }
    // Completa metadatos si esta línea los trae y faltaban.
    if (!g.meta.asin && rec.asin) g.meta.asin = rec.asin;
    if (!g.meta.title && rec.title) g.meta.title = rec.title;

    for (const acc of [g.acc, totalsAcc]) {
      acc.lines += 1;
      acc.units += lp.units;
      acc.revenue = round2(acc.revenue + lp.revenue);
      acc.netRevenue = round2(acc.netRevenue + lp.netRevenue);
      acc.referralFee = round2(acc.referralFee + lp.referralFee);
      acc.cost = round2(acc.cost + lp.cost);
      acc.profit = round2(acc.profit + lp.profit);
      if (lp.estimated) {
        acc.estimatedUnits += lp.units;
        acc.hasEstimated = true;
      }
    }
  }

  const bySku: SkuProfit[] = [...groups.entries()]
    .map(([sku, g]) => ({
      sku,
      asin: g.meta.asin,
      title: g.meta.title,
      ...g.acc,
      marginPct: marginOf(g.acc.profit, g.acc.netRevenue),
    }))
    .sort((a, b) => b.profit - a.profit);

  return {
    totals: { ...totalsAcc, marginPct: marginOf(totalsAcc.profit, totalsAcc.netRevenue) },
    bySku,
  };
}

// ── Mapeo desde datos crudos de la DB → SaleRecord ────────────────

/** Línea de pedido tal como llega de `RepriceOrderItem`. */
export interface OrderItemInput {
  sku: string;
  asin?: string | null;
  title?: string | null;
  quantity: number;
  /** Total bruto de la línea (IVA incl.), `RepriceOrderItem.itemPrice`. */
  itemPrice?: number | null;
  /** Precio unitario alternativo, `RepriceOrderItem.unitPrice`. */
  unitPrice?: number | null;
}

/** Costes y datos de un `SellerListing` necesarios para valorar sus ventas. */
export interface ListingCost {
  cost?: number | null;
  shippingCost?: number | null;
  fbaFee?: number | null;
  feePercent?: number | null;
  vatRate?: number | null;
  /** Precio actual del listing, usado como fallback si la venta no trae precio. */
  priceCurrent?: number | null;
  asin?: string | null;
  title?: string | null;
}

const numOr = (x: number | null | undefined, def: number) =>
  x != null && Number.isFinite(x) ? x : def;

/**
 * Convierte líneas de pedido crudas en `SaleRecord[]` listos para
 * `aggregateProfit`, cruzando cada línea con los costes de su listing (por SKU).
 *
 * Precio de venta por unidad (IVA incl.): se prefiere `itemPrice / quantity`
 * (bruto de línea) y, si no, `unitPrice`. Si la línea no trae precio, se deja
 * que `lineProfit` use el `priceCurrent` del listing como estimación.
 *
 * Comisión e IVA: si el listing no los define, se asumen los de Amazon ES
 * (15 % comisión, 21 % IVA), iguales a los defaults del repricer.
 *
 * Función pura: recibe ya resuelto el mapa de listings, no toca la DB.
 */
export function recordsFromOrderItems(
  items: OrderItemInput[],
  listingsBySku: Map<string, ListingCost>,
): SaleRecord[] {
  return items.map((it) => {
    const listing = listingsBySku.get(it.sku);
    const qty = Math.max(0, Math.floor(numOr(it.quantity, 0)));

    const gross = numOr(it.itemPrice, 0);
    const perUnit =
      gross > 0 && qty > 0 ? gross / qty : numOr(it.unitPrice, 0) || null;

    return {
      sku: it.sku,
      asin: it.asin ?? listing?.asin ?? "",
      title: it.title ?? listing?.title ?? "",
      quantity: qty,
      unitPrice: perUnit,
      fallbackPrice: listing?.priceCurrent ?? null,
      cost: {
        cost: numOr(listing?.cost, 0),
        shipping: listing?.shippingCost ?? null,
        fbaFee: listing?.fbaFee ?? null,
        referralPct: numOr(listing?.feePercent, 15),
        vatPct: numOr(listing?.vatRate, 21),
      },
    };
  });
}
