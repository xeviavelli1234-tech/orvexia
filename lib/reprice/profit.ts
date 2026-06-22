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
