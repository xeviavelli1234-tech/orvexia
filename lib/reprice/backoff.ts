/**
 * Backoff exponencial puro (sin BD, sin server-only) para hacerse testeable.
 * Lo usa lib/reprice/resilience.ts (server-only) que añade telemetría.
 *
 * Clasificación de errores en 4 categorías para que cada una reciba su
 * tratamiento óptimo (en vez de "retry todo o nada"):
 *
 *  - RATE_LIMIT : throttling de Amazon. Reintentar con backoff base.
 *  - TRANSIENT  : 5xx / network / timeout. Reintentar con backoff más largo.
 *  - AUTH       : 401/403 / InvalidToken. NO reintentar — el problema es la
 *                 credencial; resilience.ts pausa el listing al instante.
 *  - INVALID    : 400/404/422 sin códigos de throttle. NO reintentar — el
 *                 PATCH está malformado (productType incorrecto, SKU que ya
 *                 no existe, etc.). resilience.ts pausa el listing al instante.
 *  - UNKNOWN    : se trata como TRANSIENT por prudencia (1 retry).
 */

export type PatchErrorCategory =
  | "RATE_LIMIT"
  | "TRANSIENT"
  | "AUTH"
  | "INVALID"
  | "UNKNOWN";

export interface PatchExecutionResult {
  applied: boolean;
  rateLimited: boolean;
  retries: number;
  /** Categoría del error final si applied=false; undefined si applied=true. */
  errorCategory?: PatchErrorCategory;
  error?: { code: string; message: string };
}

const RATE_LIMIT_CODES = new Set([
  "QuotaExceeded",
  "TooManyRequests",
  "RequestThrottled",
  "Throttled", // SP-API v0 usa este code en algunas rutas
]);

const AUTH_CODES = new Set([
  "InvalidToken",
  "AccessDenied",
  "Unauthorized",
  "InvalidSignature",
  "SignatureDoesNotMatch",
  "ExpiredToken",
  "MissingAuthenticationToken",
]);

const INVALID_CODES = new Set([
  "InvalidInput",
  "InvalidParameterValue",
  "MissingParameter",
  "MalformedQueryString",
  "ResourceNotFound",
  "NotFound",
  "InvalidProductType",
  "InvalidSku",
]);

export async function runPatchWithBackoff<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number } = {},
): Promise<{ result: T | null; outcome: PatchExecutionResult }> {
  const maxRetries = opts.maxRetries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 1000;

  let retries = 0;
  let rateLimited = false;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, outcome: { applied: true, rateLimited, retries } };
    } catch (e) {
      const info = classifyError(e);
      if (info.category === "RATE_LIMIT") rateLimited = true;

      // Política de retry por categoría.
      //  - AUTH / INVALID: nunca. Reintentar gasta cuota y no resuelve nada.
      //  - RATE_LIMIT: hasta maxRetries con jitter sobre baseDelay.
      //  - TRANSIENT / UNKNOWN: hasta maxRetries con jitter sobre baseDelay*2
      //    (más lento, para no martillear un servicio que está caído).
      const canRetry =
        info.category === "RATE_LIMIT" ||
        info.category === "TRANSIENT" ||
        info.category === "UNKNOWN";
      if (canRetry && attempt < maxRetries) {
        retries++;
        const factor =
          info.category === "RATE_LIMIT" ? 1 : 2; // 5xx duplica el espaciado
        await sleep(jitter(baseDelay * factor * Math.pow(2, attempt)));
        continue;
      }
      return {
        result: null,
        outcome: {
          applied: false,
          rateLimited,
          retries,
          errorCategory: info.category,
          error: { code: info.code, message: info.message },
        },
      };
    }
  }
  return {
    result: null,
    outcome: {
      applied: false,
      rateLimited,
      retries,
      errorCategory: "UNKNOWN",
      error: { code: "unreachable", message: "" },
    },
  };
}

export function classifyError(e: unknown): {
  category: PatchErrorCategory;
  code: string;
  message: string;
} {
  const err = e as { code?: string; status?: number; message?: string };
  const code = err?.code ?? "unknown";
  const status = err?.status ?? 0;
  const message = (err?.message ?? String(e)).slice(0, 300);
  const lower = message.toLowerCase();

  // Rate limit: 429 o códigos/messages de throttle. Tiene prioridad sobre
  // status 4xx porque algunos throttles llegan como 400 con código Throttled.
  if (
    status === 429 ||
    RATE_LIMIT_CODES.has(code) ||
    lower.includes("throttl")
  ) {
    return { category: "RATE_LIMIT", code, message };
  }
  // Auth: 401/403 o códigos de credencial / firma.
  if (status === 401 || status === 403 || AUTH_CODES.has(code)) {
    return { category: "AUTH", code, message };
  }
  // Transient: 5xx o errores de red / timeout.
  if (
    status >= 500 ||
    code === "network_error" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    lower.includes("timeout") ||
    lower.includes("socket hang up")
  ) {
    return { category: "TRANSIENT", code, message };
  }
  // Invalid: 4xx no-auth o códigos de payload malformado.
  if ((status >= 400 && status < 500) || INVALID_CODES.has(code)) {
    return { category: "INVALID", code, message };
  }
  return { category: "UNKNOWN", code, message };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
function jitter(ms: number) {
  return Math.round(ms * (0.75 + Math.random() * 0.5));
}
