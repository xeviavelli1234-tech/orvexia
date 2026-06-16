/**
 * Token-bucket SP-API — NÚCLEO PURO, sin timers ni server-only, 100% testeable.
 *
 * Modela un cubo de fichas por operación SP-API: `capacity` fichas de ráfaga
 * que se reponen a `refillPerSec` por segundo (la tasa sostenida que documenta
 * Amazon y que devuelve en la cabecera `x-amzn-RateLimit-Limit`).
 *
 * La parte con relojes y `sleep` vive en throttle.ts; aquí solo la aritmética,
 * para poder testear el pacing con un reloj inyectado y sin esperas reales.
 */

export interface BucketConfig {
  /** Fichas máximas acumulables (tamaño de la ráfaga permitida). */
  capacity: number;
  /** Fichas repuestas por segundo (tasa sostenida). */
  refillPerSec: number;
}

export interface BucketState {
  tokens: number;
  lastMs: number;
}

export function initBucket(cfg: BucketConfig, nowMs: number): BucketState {
  return { tokens: cfg.capacity, lastMs: nowMs };
}

/** Repone fichas según el tiempo transcurrido, sin pasar de `capacity`. */
export function refill(
  state: BucketState,
  cfg: BucketConfig,
  nowMs: number,
): BucketState {
  if (nowMs <= state.lastMs) return state;
  const elapsedSec = (nowMs - state.lastMs) / 1000;
  const tokens = Math.min(
    cfg.capacity,
    state.tokens + elapsedSec * Math.max(0, cfg.refillPerSec),
  );
  return { tokens, lastMs: nowMs };
}

/**
 * Intenta consumir 1 ficha.
 *  - Si hay ≥1: la consume y devuelve `waitMs: 0`.
 *  - Si no: NO consume y devuelve los ms que faltan para tener 1 ficha
 *    (el llamador debe esperar y reintentar).
 * Con `refillPerSec ≤ 0` el cubo no tiene tasa → trata como "sin límite"
 * (consume siempre) para no colgar nunca.
 */
export function take(
  state: BucketState,
  cfg: BucketConfig,
  nowMs: number,
): { state: BucketState; waitMs: number } {
  if (!(cfg.refillPerSec > 0)) {
    return { state: { tokens: cfg.capacity, lastMs: nowMs }, waitMs: 0 };
  }
  const r = refill(state, cfg, nowMs);
  if (r.tokens >= 1) {
    return { state: { tokens: r.tokens - 1, lastMs: r.lastMs }, waitMs: 0 };
  }
  const deficit = 1 - r.tokens;
  const waitMs = Math.ceil((deficit / cfg.refillPerSec) * 1000);
  return { state: r, waitMs };
}
