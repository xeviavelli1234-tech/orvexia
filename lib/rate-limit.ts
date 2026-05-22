/**
 * Rate limit por clave (IP, email, userId…) con ventana deslizante y
 * limpieza automática para no acumular memoria en serverless cuando el
 * mismo contenedor se reutiliza mucho.
 *
 * Uso:
 *   import { rateLimit } from "@/lib/rate-limit";
 *   if (rateLimit("magic-email", email, 5, 10 * 60_000)) return tooMany();
 *
 * No es distribuido (cada instancia tiene su propio contador). Para
 * algo más robusto, mover a Upstash/Redis. Para tráfico moderado este
 * patrón ya cubre el 99 % (Vercel reutiliza el mismo contenedor durante
 * minutos consecutivos del mismo usuario).
 */

interface Bucket {
  timestamps: number[];
  lastTouched: number;
}

const STORE = new Map<string, Bucket>();

// Limpieza periódica: cada 5 min, descarta buckets sin uso >30 min.
// Se ejecuta lazy (solo cuando hay tráfico) para no instalar timers en
// edge runtimes.
let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const BUCKET_TTL_MS = 30 * 60 * 1000;

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [k, b] of STORE) {
    if (now - b.lastTouched > BUCKET_TTL_MS) STORE.delete(k);
  }
}

/**
 * Devuelve true si la operación con esa key+namespace ya superó el
 * límite en la ventana indicada. Idempotente: solo cuenta la llamada
 * actual.
 *
 * @param ns         Namespace lógico ("magic-email", "passkey-ip", …)
 * @param key        Identificador dentro del namespace (email, IP, userId)
 * @param limit      Máximo de operaciones permitidas en la ventana
 * @param windowMs   Ventana deslizante en ms
 */
export function rateLimit(
  ns: string,
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  if (!key) return false; // sin clave no contamos (mejor permitir que romper)
  const now = Date.now();
  maybeCleanup(now);
  const bucketKey = `${ns}:${key}`;
  const cutoff = now - windowMs;
  const bucket = STORE.get(bucketKey) ?? { timestamps: [], lastTouched: now };
  // Filtra timestamps fuera de ventana
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
  bucket.timestamps.push(now);
  bucket.lastTouched = now;
  STORE.set(bucketKey, bucket);
  return bucket.timestamps.length > limit;
}

/** Solo para tests: limpia el store entero. */
export function __resetRateLimitForTests() {
  STORE.clear();
  lastCleanup = 0;
}
