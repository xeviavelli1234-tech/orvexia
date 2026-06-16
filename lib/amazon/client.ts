import "server-only";
import { getSpApiBaseUrl, type SpApiEnv, type SpApiRegion } from "./endpoints";
import { refreshAccessToken } from "./lwa";
import { acquireThrottle, observeThrottleHeader, opKeyFor } from "./throttle";
import { SpApiError } from "./types";

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number;
}

const TOKEN_TTL_BUFFER_MS = 60_000;

export class SpApiClient {
  private static tokenCache = new Map<string, TokenCacheEntry>();
  // Refrescos en vuelo por refresh token: evita la estampida de N refrescos
  // concurrentes (todos los llamantes comparten la misma promesa).
  private static tokenInflight = new Map<string, Promise<string>>();

  constructor(
    private readonly refreshToken: string,
    private readonly env: SpApiEnv = "sandbox",
    private readonly region: SpApiRegion = "eu",
  ) {}

  private async getAccessToken(): Promise<string> {
    const cached = SpApiClient.tokenCache.get(this.refreshToken);
    if (cached && cached.expiresAt - TOKEN_TTL_BUFFER_MS > Date.now()) {
      return cached.accessToken;
    }
    // Dedup de refrescos concurrentes: un solo refresh por refresh token en
    // vuelo; el resto espera la misma promesa (anti-estampida contra LWA).
    let inflight = SpApiClient.tokenInflight.get(this.refreshToken);
    if (!inflight) {
      inflight = refreshAccessToken(this.refreshToken)
        .then((fresh) => {
          SpApiClient.tokenCache.set(this.refreshToken, {
            accessToken: fresh.access_token,
            expiresAt: Date.now() + fresh.expires_in * 1000,
          });
          return fresh.access_token;
        })
        .finally(() => {
          SpApiClient.tokenInflight.delete(this.refreshToken);
        });
      SpApiClient.tokenInflight.set(this.refreshToken, inflight);
    }
    return inflight;
  }

  private static readonly MAX_RETRIES = 4;
  private static readonly RETRYABLE = new Set([429, 500, 502, 503, 504]);

  private static sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** Backoff exponencial con jitter; respeta Retry-After si viene. */
  private static backoffMs(attempt: number, retryAfter: string | null): number {
    const ra = retryAfter ? Number(retryAfter) : NaN;
    if (Number.isFinite(ra) && ra > 0) return Math.min(ra * 1000, 15_000);
    const base = 500 * 2 ** attempt; // 0.5s, 1s, 2s, 4s…
    return Math.min(base + Math.random() * 400, 12_000);
  }

  private async request<T>(
    method: "GET" | "PATCH" | "PUT" | "POST" | "DELETE",
    path: string,
    options: { query?: Record<string, string>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(path, getSpApiBaseUrl(this.env, this.region));
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) url.searchParams.set(k, v);
    }
    const opKey = opKeyFor(method, path);

    let lastErr: SpApiError | null = null;
    let triedAuthRefresh = false;
    for (let attempt = 0; attempt <= SpApiClient.MAX_RETRIES; attempt++) {
      const accessToken = await this.getAccessToken();
      // Pacing proactivo: espera (si toca) a tener cuota antes de salir.
      await acquireThrottle(opKey);
      let res: Response;
      try {
        res = await fetch(url.toString(), {
          method,
          headers: {
            "x-amz-access-token": accessToken,
            "User-Agent": "OrvexiaRepricer/0.1 (Language=TypeScript)",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });
      } catch (e) {
        // Error de red → reintentar con backoff
        lastErr = new SpApiError(0, "network_error", String(e));
        if (attempt < SpApiClient.MAX_RETRIES) {
          await SpApiClient.sleep(SpApiClient.backoffMs(attempt, null));
          continue;
        }
        throw lastErr;
      }

      // Ajusta el cubo a la cuota real que reporta Amazon.
      observeThrottleHeader(opKey, res.headers.get("x-amzn-RateLimit-Limit"));

      if (res.ok) {
        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
      }

      const requestId = res.headers.get("x-amzn-requestid") ?? undefined;
      const text = await res.text();
      let code = `http_${res.status}`;
      try {
        const parsed = JSON.parse(text) as { errors?: Array<{ code?: string }> };
        if (parsed.errors?.[0]?.code) code = parsed.errors[0].code;
      } catch {
        /* not JSON */
      }
      lastErr = new SpApiError(res.status, code, text, requestId);

      // Token expirado/revocado en vuelo (401): invalida el cache y reintenta
      // UNA vez con token fresco. NO incluimos 403: un permiso/rol denegado es
      // PERMANENTE — refrescar no ayuda y gasta una llamada a LWA (orders.ts ya
      // trata 403 como caso normal). Si el 401 reincide, propaga el error.
      if (
        res.status === 401 &&
        !triedAuthRefresh &&
        attempt < SpApiClient.MAX_RETRIES
      ) {
        triedAuthRefresh = true;
        SpApiClient.tokenCache.delete(this.refreshToken);
        continue;
      }

      // 429 / 5xx → throttling: esperar y reintentar.
      // OJO: solo honramos `Retry-After` (segundos). `x-amzn-RateLimit-Limit`
      // es una TASA (req/s, p.ej. 0,5), NO segundos — usarla como Retry-After
      // hacía esperar 500 ms ante un límite de 0,5 req/s (infra-espera). La
      // tasa ya se aplica de forma proactiva en observeThrottleHeader (arriba).
      if (SpApiClient.RETRYABLE.has(res.status) && attempt < SpApiClient.MAX_RETRIES) {
        const wait = SpApiClient.backoffMs(attempt, res.headers.get("retry-after"));
        await SpApiClient.sleep(wait);
        continue;
      }
      throw lastErr;
    }
    throw lastErr ?? new SpApiError(0, "unknown", "request failed");
  }

  get<T>(path: string, query?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, { query });
  }

  patch<T>(path: string, body: unknown, query?: Record<string, string>): Promise<T> {
    return this.request<T>("PATCH", path, { body, query });
  }

  put<T>(path: string, body: unknown, query?: Record<string, string>): Promise<T> {
    return this.request<T>("PUT", path, { body, query });
  }

  post<T>(path: string, body: unknown, query?: Record<string, string>): Promise<T> {
    return this.request<T>("POST", path, { body, query });
  }

  delete<T>(path: string, query?: Record<string, string>): Promise<T> {
    return this.request<T>("DELETE", path, { query });
  }
}
