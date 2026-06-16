import "server-only";
import {
  initBucket,
  take,
  type BucketConfig,
  type BucketState,
} from "./throttle-core";

/**
 * Limitador PROACTIVO de SP-API (in-process).
 *
 * Antes, el cliente solo reaccionaba a los 429 con backoff: dejábamos que
 * Amazon nos throttleara y luego esperábamos. Esto pacea las llamadas ANTES de
 * mandarlas para no superar la cuota documentada, que es la causa nº1 de
 * `QuotaExceeded` cuando crecen SKUs/cuentas.
 *
 * Ámbito: una instancia de función (un ciclo del runner procesa cuentas y
 * listings en SECUENCIA dentro del mismo proceso, así que el limitador in-proc
 * los pacea de verdad). En Vercel cada lambda concurrente tiene su propio cubo;
 * el backoff reactivo del cliente sigue cubriendo la contención entre lambdas.
 *
 * Defaults conservadores; Amazon devuelve el límite real en
 * `x-amzn-RateLimit-Limit` y lo adoptamos en caliente (observeThrottleHeader).
 * Override por env: SP_API_THROTTLE_DISABLED=1 lo apaga por completo.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// req/seg sostenido y ráfaga por operación (valores documentados por Amazon,
// tirando a conservador). El header real ajusta la tasa al vuelo.
const DEFAULTS: Record<string, BucketConfig> = {
  competitivePrice: { capacity: 1, refillPerSec: 0.5 },
  getItemOffers: { capacity: 1, refillPerSec: 0.5 },
  getListingOffers: { capacity: 1, refillPerSec: 1 },
  patchListings: { capacity: 5, refillPerSec: 5 },
  default: { capacity: 5, refillPerSec: 5 },
};

interface Entry {
  cfg: BucketConfig;
  state: BucketState;
  /** Cadena de promesas para serializar las adquisiciones de esta clave. */
  chain: Promise<void>;
}

const buckets = new Map<string, Entry>();

function disabled(): boolean {
  return process.env.SP_API_THROTTLE_DISABLED === "1";
}

function getEntry(key: string): Entry {
  let e = buckets.get(key);
  if (!e) {
    const base = DEFAULTS[key] ?? DEFAULTS.default;
    e = {
      cfg: { ...base },
      state: initBucket(base, Date.now()),
      chain: Promise.resolve(),
    };
    buckets.set(key, e);
  }
  return e;
}

/** Deriva la clave de operación (= cubo) a partir de método + path. */
export function opKeyFor(method: string, path: string): string {
  if (path.includes("/products/pricing/")) {
    if (path.includes("competitivePrice")) return "competitivePrice";
    if (path.endsWith("/offers")) return "getItemOffers";
    if (path.includes("/listings/")) return "getListingOffers";
  }
  if (path.includes("/listings/2021-08-01/items/")) {
    // Solo PATCH/PUT consume la cuota de ESCRITURA de Listings; un GET no.
    return method === "GET" ? "default" : "patchListings";
  }
  return "default";
}

/**
 * Espera (paceada) hasta poder consumir 1 ficha de `key`. Serializa por clave
 * para que el pacing sea correcto aun con llamadas concurrentes.
 */
export async function acquireThrottle(key: string): Promise<void> {
  if (disabled()) return;
  const e = getEntry(key);

  // Encadena tras la adquisición previa de la misma clave (sección crítica).
  const prev = e.chain;
  let release!: () => void;
  e.chain = new Promise<void>((res) => (release = res));
  await prev;

  try {
    for (;;) {
      const { state, waitMs } = take(e.state, e.cfg, Date.now());
      e.state = state;
      if (waitMs <= 0) return;
      // Trocea esperas largas para no bloquear de golpe (tope 5 s por vuelta).
      await sleep(Math.min(waitMs, 5000));
    }
  } finally {
    release();
  }
}

/**
 * Ajusta la tasa de `key` con el límite REAL que reporta Amazon en
 * `x-amzn-RateLimit-Limit` (req/seg). Best-effort: ignora valores no válidos.
 */
export function observeThrottleHeader(key: string, header: string | null): void {
  if (!header) return;
  const rate = Number(header);
  if (!Number.isFinite(rate) || rate <= 0) return;
  const e = getEntry(key);
  e.cfg.refillPerSec = Math.min(rate, 50); // clamp defensivo
  if (e.cfg.capacity < 1) e.cfg.capacity = 1;
}

/** Solo para tests: vacía los cubos en memoria. */
export function __resetThrottle(): void {
  buckets.clear();
}
