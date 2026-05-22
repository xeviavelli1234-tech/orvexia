import "server-only";
import { LWA_AUTHORIZE_URL, LWA_TOKEN_URL } from "./endpoints";
import { LwaError, type LwaRefreshResponse, type LwaTokenResponse } from "./types";

function getCredentials(): { clientId: string; clientSecret: string; appId: string } {
  const clientId = process.env.LWA_CLIENT_ID;
  const clientSecret = process.env.LWA_CLIENT_SECRET;
  const appId = process.env.SP_API_APP_ID;
  if (!clientId || !clientSecret || !appId) {
    throw new LwaError("missing_env", "LWA_CLIENT_ID, LWA_CLIENT_SECRET and SP_API_APP_ID must be set");
  }
  return { clientId, clientSecret, appId };
}

export function buildAuthUrl(params: {
  state: string;
  redirectUri: string;
  version?: "beta" | "stable";
}): string {
  const { appId } = getCredentials();
  const query = new URLSearchParams({
    application_id: appId,
    state: params.state,
    redirect_uri: params.redirectUri,
  });
  if (params.version === "beta") query.set("version", "beta");
  return `${LWA_AUTHORIZE_URL}?${query.toString()}`;
}

export async function exchangeCodeForRefreshToken(
  code: string,
  redirectUri: string,
): Promise<LwaTokenResponse> {
  const { clientId, clientSecret } = getCredentials();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(LWA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new LwaError("token_exchange_failed", `LWA ${res.status}: ${text}`);
  }
  return (await res.json()) as LwaTokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<LwaRefreshResponse> {
  const { clientId, clientSecret } = getCredentials();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(LWA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new LwaError("refresh_failed", `LWA ${res.status}: ${text}`);
  }
  return (await res.json()) as LwaRefreshResponse;
}
