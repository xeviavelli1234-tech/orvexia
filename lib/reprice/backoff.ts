/**
 * Backoff exponencial puro (sin BD, sin server-only) para hacerse testeable.
 * Lo usa lib/reprice/resilience.ts (server-only) que añade telemetría.
 */

export interface PatchExecutionResult {
  applied: boolean;
  rateLimited: boolean;
  retries: number;
  error?: { code: string; message: string };
}

const RATE_LIMIT_CODES = new Set([
  "QuotaExceeded",
  "TooManyRequests",
  "RequestThrottled",
  "Throttled", // SP-API v0 usa este code en algunas rutas
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
      if (info.isRateLimit) rateLimited = true;
      const retryable = info.isRateLimit || info.isTransient;
      if (retryable && attempt < maxRetries) {
        retries++;
        await sleep(jitter(baseDelay * Math.pow(2, attempt)));
        continue;
      }
      return {
        result: null,
        outcome: {
          applied: false,
          rateLimited,
          retries,
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
      error: { code: "unreachable", message: "" },
    },
  };
}

function classifyError(e: unknown) {
  const err = e as { code?: string; status?: number; message?: string };
  const code = err?.code ?? "unknown";
  const status = err?.status ?? 0;
  const message = (err?.message ?? String(e)).slice(0, 300);
  // Incluye detección por mensaje para cubrir variantes de naming de Amazon
  // ("Request is throttled", "Your request is throttled", etc.)
  const isRateLimit =
    status === 429 ||
    RATE_LIMIT_CODES.has(code) ||
    message.toLowerCase().includes("throttl");
  const isTransient = status >= 500 || code === "network_error";
  return { code, message, isRateLimit, isTransient };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
function jitter(ms: number) {
  return Math.round(ms * (0.75 + Math.random() * 0.5));
}
