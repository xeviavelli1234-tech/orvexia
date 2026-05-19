/**
 * Motor de reprecio — FUNCIÓN PURA, sin side effects, 100% testeable.
 *
 * Estrategias:
 *  - BUYBOX  : nos ponemos por debajo del competidor más barato (importe o %).
 *  - MATCH   : igualamos al competidor.
 *  - FIXED   : precio fijo, ignora la competencia.
 *  - MARGIN  : como BUYBOX pero con suelo de beneficio (marginFloor).
 * Sin competencia: subir al máximo (MAX) o mantener (HOLD).
 * El resultado SIEMPRE se acota a [priceMin, priceMax] (y a marginFloor).
 * Redondeo a 2 decimales.
 *
 * Por defecto (sin pasar strategy) reproduce el comportamiento clásico:
 * BUYBOX, undercut 0,01 €, sin competencia → máximo.
 */

export type RepriceStrategy = "BUYBOX" | "MATCH" | "FIXED" | "MARGIN";
export type UndercutType = "AMOUNT" | "PERCENT";
export type NoCompetitionMode = "MAX" | "HOLD" | "STEP_UP";

export type RepriceReason =
  | "competitor_undercut"
  | "competitor_match"
  | "fixed_price"
  | "margin_floor"
  | "min_floor"
  | "max_ceiling"
  | "no_competition"
  | "step_up"
  | "hold"
  | "no_change";

export interface RepriceInput {
  priceCurrent: number;
  priceMin: number;
  priceMax: number;
  /** Precio del competidor más barato, o null si no hay competencia. */
  competitorPrice: number | null;

  strategy?: RepriceStrategy;
  undercutType?: UndercutType;
  /** Importe (€) o porcentaje según undercutType. */
  undercutValue?: number;
  /** Alias retro-compatible de undercutValue (importe). */
  undercutBy?: number;
  /** Estrategia FIXED. */
  fixedPrice?: number | null;
  /** Estrategia MARGIN: precio mínimo rentable ya calculado. */
  marginFloor?: number | null;
  /** Comportamiento sin competencia. Default MAX. */
  noCompetition?: NoCompetitionMode;
  /** STEP_UP: tipo del paso de subida (importe € o %). Default AMOUNT. */
  stepUpType?: UndercutType;
  /** STEP_UP: tamaño del paso por ciclo (importe o %). */
  stepUpValue?: number;
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
  const strategy: RepriceStrategy = input.strategy ?? "BUYBOX";
  const undercutType: UndercutType = input.undercutType ?? "AMOUNT";
  const undercutValue = input.undercutValue ?? input.undercutBy ?? 0.01;
  const noComp: NoCompetitionMode = input.noCompetition ?? "MAX";

  const min = round2(input.priceMin);
  const max = round2(input.priceMax);
  const current = round2(input.priceCurrent);

  // Salvaguarda: rango inválido → no tocar nada.
  if (!(min > 0) || !(max > 0) || min > max) {
    return { newPrice: current, changed: false, reason: "no_change" };
  }

  // Suelo efectivo: el mínimo, elevado por el suelo de beneficio (MARGIN).
  let effMin = min;
  let minHitReason: RepriceReason = "min_floor";
  if (
    strategy === "MARGIN" &&
    input.marginFloor != null &&
    Number.isFinite(input.marginFloor) &&
    input.marginFloor > effMin
  ) {
    effMin = round2(input.marginFloor);
    minHitReason = "margin_floor";
  }
  if (effMin > max) effMin = max; // el suelo nunca supera el techo

  const hasComp =
    input.competitorPrice != null && Number.isFinite(input.competitorPrice);

  let target: number;
  let baseReason: RepriceReason;

  if (strategy === "FIXED") {
    target = round2(input.fixedPrice ?? max);
    baseReason = "fixed_price";
  } else if (!hasComp) {
    if (noComp === "HOLD") {
      return { newPrice: current, changed: false, reason: "no_change" };
    }
    if (noComp === "STEP_UP") {
      // Subir poco a poco hacia el máximo (no saltar de golpe).
      const stType: UndercutType = input.stepUpType ?? "AMOUNT";
      const rawV = input.stepUpValue;
      const v =
        rawV != null && Number.isFinite(rawV) && rawV > 0
          ? rawV
          : stType === "PERCENT"
            ? 1
            : 0.05;
      const rawStep = stType === "PERCENT" ? current * (v / 100) : v;
      const step = Math.max(0.01, rawStep); // garantiza avance
      target = round2(current + step);
      baseReason = "step_up";
    } else {
      target = max;
      baseReason = "no_competition";
    }
  } else {
    const comp = input.competitorPrice as number;
    if (strategy === "MATCH") {
      target = round2(comp);
      baseReason = "competitor_match";
    } else {
      // BUYBOX / MARGIN
      target =
        undercutType === "PERCENT"
          ? round2(comp * (1 - undercutValue / 100))
          : round2(comp - undercutValue);
      baseReason = "competitor_undercut";
    }
  }

  let newPrice = target;
  let reason: RepriceReason = baseReason;

  if (newPrice < effMin) {
    newPrice = effMin;
    reason = minHitReason;
  } else if (newPrice > max) {
    newPrice = max;
    reason = baseReason === "no_competition" ? "no_competition" : "max_ceiling";
  }

  newPrice = round2(newPrice);
  const changed = newPrice !== current;

  return { newPrice, changed, reason: changed ? reason : "no_change" };
}
