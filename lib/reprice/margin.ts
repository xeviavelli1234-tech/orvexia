/**
 * Calculadora de costes y margen — FUNCIONES PURAS, 100% testeables.
 *
 * Modelo (precios de Amazon ES = IVA incluido):
 *   - v = IVA (fracción)            ej. 0,21
 *   - r = comisión Amazon (frac.)   sobre el PVP con IVA
 *   - F = coste fijo por unidad     = coste compra + envío + tarifa FBA
 *   A un precio de venta P (IVA incl.):
 *     ingreso neto (sin IVA) = P / (1 + v)
 *     comisión Amazon        = r · P
 *     beneficio              = P/(1+v) − r·P − F
 *
 *   Precio de equilibrio (beneficio 0):
 *     P = F / ( 1/(1+v) − r )
 *   Precio mínimo para un margen objetivo m (sobre el ingreso neto):
 *     P = F / ( (1−m)/(1+v) − r )
 *
 * Si el denominador ≤ 0 el producto NUNCA es rentable con esos parámetros
 * (la comisión se come el ingreso neto) → se devuelve null.
 */

export interface CostInputs {
  /** Coste de compra por unidad (€, sin IVA recuperable). */
  cost: number;
  /** Envío / logística propia por unidad (€). */
  shipping?: number | null;
  /** Tarifa fija FBA / gestión por unidad (€). */
  fbaFee?: number | null;
  /** % comisión de Amazon sobre el PVP (IVA incl.). Def. 15. */
  referralPct: number;
  /** % IVA del PVP (España 21). Def. 21. */
  vatPct: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const n0 = (x: number | null | undefined) =>
  x != null && Number.isFinite(x) && x > 0 ? x : 0;

/** Coste fijo total por unidad (compra + envío + FBA). */
export function fixedUnitCost(c: CostInputs): number {
  return round2(n0(c.cost) + n0(c.shipping) + n0(c.fbaFee));
}

/** Factor que multiplica al PVP: ingreso neto menos comisión, por € de precio. */
function priceFactor(c: CostInputs, marginFrac: number): number {
  const v = Math.max(0, c.vatPct) / 100;
  const r = Math.max(0, c.referralPct) / 100;
  return (1 - marginFrac) / (1 + v) - r;
}

/** Precio de venta (IVA incl.) al que el beneficio es 0. null si imposible. */
export function breakEvenPrice(c: CostInputs): number | null {
  const F = fixedUnitCost(c);
  if (F <= 0) return null;
  const denom = priceFactor(c, 0);
  if (denom <= 0) return null;
  return round2(F / denom);
}

/**
 * Precio mínimo (IVA incl.) para alcanzar `targetMarginPct` % de margen
 * sobre el ingreso neto. null si los parámetros lo hacen imposible.
 */
export function minPriceForMargin(
  c: CostInputs,
  targetMarginPct: number,
): number | null {
  const F = fixedUnitCost(c);
  if (F <= 0) return null;
  const m = Math.max(0, Math.min(0.95, (targetMarginPct || 0) / 100));
  const denom = priceFactor(c, m);
  if (denom <= 0) return null;
  return round2(F / denom);
}

export interface ProfitBreakdown {
  /** Ingreso neto sin IVA. */
  netRevenue: number;
  /** Comisión de Amazon (€). */
  referralFee: number;
  /** Coste fijo por unidad (€). */
  unitCost: number;
  /** Beneficio neto (€). */
  profit: number;
  /** Margen sobre el ingreso neto (%). */
  marginPct: number;
}

/** Desglose de rentabilidad a un precio de venta dado (IVA incl.). */
export function profitAt(price: number, c: CostInputs): ProfitBreakdown {
  const v = Math.max(0, c.vatPct) / 100;
  const r = Math.max(0, c.referralPct) / 100;
  const F = fixedUnitCost(c);
  const p = price > 0 ? price : 0;
  const netRevenue = round2(p / (1 + v));
  const referralFee = round2(r * p);
  const profit = round2(netRevenue - referralFee - F);
  const marginPct = netRevenue > 0 ? round2((profit / netRevenue) * 100) : 0;
  return { netRevenue, referralFee, unitCost: F, profit, marginPct };
}
