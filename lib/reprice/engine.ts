/**
 * Motor de reprecio — FUNCIÓN PURA, sin side effects, 100% testeable.
 *
 * Regla MVP (sin negociar):
 *  - Si hay competidor → nos ponemos `undercutBy` por debajo del más barato.
 *  - Si NO hay competidor → subimos al máximo (maximizar margen estando solos).
 *  - El resultado SIEMPRE se acota a [priceMin, priceMax].
 *  - Redondeo a 2 decimales (céntimos).
 */

export type RepriceReason =
  | "competitor_undercut" // nos ajustamos por debajo del competidor
  | "min_floor" // el cálculo caía por debajo del mínimo → suelo
  | "max_ceiling" // el cálculo subía por encima del máximo → techo
  | "no_competition" // sin competencia → vamos al máximo
  | "no_change"; // el precio óptimo ya es el actual

export interface RepriceInput {
  priceCurrent: number;
  priceMin: number;
  priceMax: number;
  /** Precio del competidor más barato, o null si no hay competencia. */
  competitorPrice: number | null;
  /** Cuánto bajar respecto al competidor. Default 0,01 €. */
  undercutBy?: number;
}

export interface RepriceResult {
  newPrice: number;
  changed: boolean;
  reason: RepriceReason;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeNewPrice(input: RepriceInput): RepriceResult {
  const undercutBy = input.undercutBy ?? 0.01;
  const min = round2(input.priceMin);
  const max = round2(input.priceMax);
  const current = round2(input.priceCurrent);

  // Salvaguarda: rango inválido → no tocar nada.
  if (!(min > 0) || !(max > 0) || min > max) {
    return { newPrice: current, changed: false, reason: "no_change" };
  }

  let target: number;
  let baseReason: RepriceReason;

  if (input.competitorPrice == null || !Number.isFinite(input.competitorPrice)) {
    // Sin competencia → maximizar margen.
    target = max;
    baseReason = "no_competition";
  } else {
    target = round2(input.competitorPrice - undercutBy);
    baseReason = "competitor_undercut";
  }

  // Acotar al rango [min, max].
  let newPrice = target;
  let reason: RepriceReason = baseReason;

  if (newPrice < min) {
    newPrice = min;
    reason = "min_floor";
  } else if (newPrice > max) {
    newPrice = max;
    reason = baseReason === "no_competition" ? "no_competition" : "max_ceiling";
  }

  newPrice = round2(newPrice);
  const changed = newPrice !== current;

  return {
    newPrice,
    changed,
    reason: changed ? reason : "no_change",
  };
}
