import "server-only";

export const SELLERS_OAUTH_CALLBACK_PATH = "/api/sellers/amazon/oauth/callback";

/**
 * Returns the public base URL of the app (no trailing slash).
 * Priority: NEXT_PUBLIC_BASE_URL → VERCEL_URL → request host → localhost fallback.
 */
export function getBaseUrl(req?: Request): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (req) {
    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

export function getOauthRedirectUri(req?: Request): string {
  return `${getBaseUrl(req)}${SELLERS_OAUTH_CALLBACK_PATH}`;
}
