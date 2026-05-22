import "server-only";

/**
 * Extracción de IP / país / user-agent desde una NextRequest o headers.
 * Compatible con Vercel (x-vercel-ip-*) y proxies estándar (x-forwarded-for).
 */
export interface RequestMeta {
  ip: string | null;
  country: string | null;
  userAgent: string | null;
}

export function readRequestMeta(req: Request): RequestMeta {
  const h = req.headers;
  const ipFromXff =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ip =
    h.get("x-real-ip") ??
    ipFromXff ??
    h.get("cf-connecting-ip") ??
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const country =
    h.get("x-vercel-ip-country") ??
    h.get("cf-ipcountry") ??
    null;
  const userAgent = h.get("user-agent") ?? null;
  return {
    ip: ip && ip !== "::1" ? ip : null,
    country: country && country !== "XX" ? country : null,
    userAgent,
  };
}

/**
 * Reduce una IP a su prefijo para agruparlas tolerando cambios menores:
 *  - IPv4 → /24 (descarta el último octeto)
 *  - IPv6 → /64 (primeros 4 grupos)
 * No es perfecto, pero evita marcar "ubicación nueva" cuando el ISP rota
 * la IP del cliente dentro del mismo bloque.
 */
export function normalizeIp(raw: string): string {
  const ip = raw.trim();
  if (ip.includes(":")) {
    // IPv6
    const groups = ip.split(":");
    return groups.slice(0, 4).join(":") + "::/64";
  }
  const parts = ip.split(".");
  if (parts.length !== 4) return ip;
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}
