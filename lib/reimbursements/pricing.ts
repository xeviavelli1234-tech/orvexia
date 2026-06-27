/**
 * Modelo de negocio del Auditor de Reembolsos FBA — FUNCIONES PURAS.
 *
 * A diferencia del Repricer (suscripción plana de 19 €/mes), esta herramienta
 * cobra un SUCCESS FEE: un % de lo que el vendedor RECUPERA de verdad. Si no
 * recupera nada, no paga nada. Eso elimina la objeción de presupuesto y alinea
 * el ingreso con el valor entregado.
 */

/** Comisión por éxito sobre lo recuperado (20%). */
export const SUCCESS_FEE_PCT = 20;

/** Confianza mínima para considerar una reclamación "lista para presentar". */
export const READY_MIN_CONFIDENCE = 70;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Comisión de Orvexia sobre un importe recuperado. */
export function successFee(recovered: number, pct: number = SUCCESS_FEE_PCT): number {
  if (!Number.isFinite(recovered) || recovered <= 0) return 0;
  return round2((recovered * pct) / 100);
}

/** Lo que el vendedor se queda tras descontar la comisión por éxito. */
export function sellerKeeps(recovered: number, pct: number = SUCCESS_FEE_PCT): number {
  if (!Number.isFinite(recovered) || recovered <= 0) return 0;
  return round2(recovered - successFee(recovered, pct));
}
