import "server-only";
import { getSpApiBaseUrl, type SpApiEnv, type SpApiRegion } from "./endpoints";
import { refreshAccessToken } from "./lwa";
import { SpApiError } from "./types";

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number;
}

const TOKEN_TTL_BUFFER_MS = 60_000;

export class SpApiClient {
  private static tokenCache = new Map<string, TokenCacheEntry>();

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
    const fresh = await refreshAccessToken(this.refreshToken);
    SpApiClient.tokenCache.set(this.refreshToken, {
      accessToken: fresh.access_token,
      expiresAt: Date.now() + fresh.expires_in * 1000,
    });
    return fresh.access_token;
  }

  private async request<T>(
    method: "GET" | "PATCH" | "PUT" | "POST" | "DELETE",
    path: string,
    options: { query?: Record<string, string>; body?: unknown } = {},
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const url = new URL(path, getSpApiBaseUrl(this.env, this.region));
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      method,
      headers: {
        "x-amz-access-token": accessToken,
        "User-Agent": "OrvexiaRepricer/0.1 (Language=TypeScript)",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const requestId = res.headers.get("x-amzn-requestid") ?? undefined;
      const text = await res.text();
      let code = `http_${res.status}`;
      try {
        const parsed = JSON.parse(text) as { errors?: Array<{ code?: string; message?: string }> };
        if (parsed.errors?.[0]?.code) code = parsed.errors[0].code;
      } catch {
        /* not JSON */
      }
      throw new SpApiError(res.status, code, text, requestId);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
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
}
