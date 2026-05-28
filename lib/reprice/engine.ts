/**
 * Motor de reprecio — FUNCIÓN PURA, sin side effects, 100% testeable.
 *
 * Estrategias:
 *  - BUYBOX        : nos ponemos por debajo del competidor más barato.
 *  - BUYBOX_WINNER : nos ponemos por debajo del precio actual de la Buy Box
 *                    (no necesariamente el más barato). Si no hay datos
 *                    de Buy Box, hace fallback a BUYBOX clásico.
 *  - MATCH         : igualamos al competidor.
 *  - FIXED         : precio fijo, ignora la competencia.
 *  - MARGIN        : como BUYBOX pero con suelo de beneficio (marginFloor).
 * Sin competencia: subir al máximo (MAX) o mantener (HOLD) o STEP_UP gradual.
 * El resultado SIEMPRE se acota a [priceMin, priceMax] (y a marginFloor).
 * Redondeo a 2 decimales.
 *
 * Histéresis (anti-flapping): si el cambio absoluto cae por debajo de
 * max(minChangeAmount, current * minChangePct/100), no cambiamos. Las
 * salvaguardas duras (suelo, techo, margen, guerra) NO se filtran por
 * histéresis: nunca dejamos al cliente sangrando para ahorrar un PATCH.
 *
 * Guerra de precios: si el runner detecta N ciclos seguidos bajando
 * arrastrados y pasa priceWarLocked=true, el motor salta al suelo efectivo
 * (effMin) con razón "price_war".
 *
 * Por defecto (sin pasar strategy) reproduce el comportamiento clásico:
 * BUYBOX, undercut 0,01 €, sin competencia → máximo.
 */

export type RepriceStrategy =
  | "BUYBOX"
  | "BUYBOX_WINNER"
  | "MATCH"
  | "FIXED"
  | "MARGIN";
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
  | "no_change"
  | "below_threshold"
  | "price_war";

export interface RepriceInput {
  priceCurrent: number;
  priceMin: number;
  priceMax: number;
  /** Precio del competidor más barato, o null si no hay competencia. */
  competitorPrice: number | null;
  /** Precio del ganador actual de la Buy Box (real, SP-API), o null. Usado por BUYBOX_WINNER. */
  buyBoxPrice?: number | null;

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
  /** STEP_UP: multiplicador acumulado del paso (≥1). Default 1 (sin acelerar). */
  stepUpMult?: number;

  // ── Anti-flapping ─────────────────────────────────────────────────────
  /** Umbral mínimo en €. Si |new-current| < threshold → no cambiar. Default 0. */
  minChangeAmount?: number;
  /** Umbral mínimo en % del precio actual. Se combina con minChangeAmount (max). Default 0. */
  minChangePct?: number;

  // ── Freno por guerra de precios ───────────────────────────────────────
  /** Si true, ignora la lógica normal y va al suelo con razón "price_war". */
  priceWarLocked?: boolean;
}

export interface RepriceResult {
  newPrice: number;
  changed: boolean;
  reason: RepriceReason;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Razones que son "constraints duros": el motor las debe respetar
 *  aunque salten la histéresis (son protección del usuario, no un movimiento). */
const HARD_REASONS = new Set<RepriceReason>([
  "min_floor",
  "max_ceiling",
  "margin_floor",
  "price_war",
]);

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

  // Freno por guerra de precios: salto directo al suelo, sin pasar por el
  // resto de la lógica. Es protección, así que ignora la histéresis.
  if (input.priceWarLocked === true) {
    // Garantiza la invariante [min, max] de forma explícita. effMin ya está
    // acotado a max (línea anterior) y nunca baja de min por construcción,
    // pero clampeamos por robustez para que NINGUNA rama escape del rango.
    let newPrice = round2(effMin);
    if (newPrice < min) newPrice = min;
    else if (newPrice > max) newPrice = max;
    newPrice = round2(newPrice);
    return {
      newPrice,
      changed: newPrice !== current,
      reason: newPrice !== current ? "price_war" : "no_change",
    };
  }

  const hasCompCheapest =
    input.competitorPrice != null && Number.isFinite(input.competitorPrice);
  const hasBuyBox =
    input.buyBoxPrice != null && Number.isFinite(input.buyBoxPrice);

  // Para BUYBOX_WINNER: competir contra buyBoxPrice; si no hay → fallback
  // al competidor más barato (BUYBOX clásico). Sin ninguno → noCompetition.
  const competeAgainst: number | null =
    strategy === "BUYBOX_WINNER"
      ? hasBuyBox
        ? (input.buyBoxPrice as number)
        : hasCompCheapest
          ? (input.competitorPrice as number)
          : null
      : hasCompCheapest
        ? (input.competitorPrice as number)
        : null;
  const hasComp = competeAgainst != null;

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
      // Subir poco a poco hacia el máximo. mult permite aceleración geométrica
      // controlada desde el runner cuando llevamos N ciclos solos.
      const stType: UndercutType = input.stepUpType ?? "AMOUNT";
      const rawV = input.stepUpValue;
      const v =
        rawV != null && Number.isFinite(rawV) && rawV > 0
          ? rawV
          : stType === "PERCENT"
            ? 1
            : 0.05;
      const mult =
        input.stepUpMult != null &&
        Number.isFinite(input.stepUpMult) &&
        input.stepUpMult >= 1
          ? input.stepUpMult
          : 1;
      const rawStep = (stType === "PERCENT" ? current * (v / 100) : v) * mult;
      const step = Math.max(0.01, rawStep); // garantiza avance
      target = round2(current + step);
      baseReason = "step_up";
    } else {
      target = max;
      baseReason = "no_competition";
    }
  } else {
    const comp = competeAgainst as number;
    if (strategy === "MATCH") {
      target = round2(comp);
      baseReason = "competitor_match";
    } else {
      // BUYBOX / BUYBOX_WINNER / MARGIN
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

  // ── Histéresis (anti-flapping) ─────────────────────────────────────────
  // Si el movimiento es más pequeño que el umbral configurado y NO es una
  // razón "dura" (suelo/techo/margen/guerra), lo descartamos. Esto evita
  // PATCHes inútiles cuando el competidor oscila ±0,01–0,02 €.
  const minAmt =
    input.minChangeAmount != null &&
    Number.isFinite(input.minChangeAmount) &&
    input.minChangeAmount > 0
      ? input.minChangeAmount
      : 0;
  const minPct =
    input.minChangePct != null &&
    Number.isFinite(input.minChangePct) &&
    input.minChangePct > 0
      ? input.minChangePct
      : 0;
  if ((minAmt > 0 || minPct > 0) && !HARD_REASONS.has(reason)) {
    const threshold = Math.max(minAmt, (current * minPct) / 100);
    if (Math.abs(newPrice - current) < threshold) {
      return { newPrice: current, changed: false, reason: "below_threshold" };
    }
  }

  const changed = newPrice !== current;
  return { newPrice, changed, reason: changed ? reason : "no_change" };
}
