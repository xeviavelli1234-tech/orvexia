import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { exchangeCodeForRefreshToken } from "@/lib/amazon/lwa";
import { upsertSellerAccount } from "@/lib/db/sellerAccount";
import { getOauthRedirectUri } from "@/lib/url";
import { OAUTH_STATE_COOKIE } from "../start/route";

type SpApiEnv = "sandbox" | "production";

function dashboardUrl(req: Request, status: string) {
  return new URL(`/dashboard/repricer?status=${status}`, req.url);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("spapi_oauth_code");
  const stateParam = url.searchParams.get("state");
  const sellerId = url.searchParams.get("selling_partner_id");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(dashboardUrl(req, `error_${errorParam}`));
  }
  if (!code || !stateParam || !sellerId) {
    return NextResponse.redirect(dashboardUrl(req, "error_missing_params"));
  }

  // CSRF check
  const cookieStore = await cookies();
  const cookieState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);
  if (!cookieState || cookieState !== stateParam) {
    return NextResponse.redirect(dashboardUrl(req, "error_state_mismatch"));
  }

  // Auth check — the seller must still be logged in
  const session = await getSession();
  if (!session) {
    const target = encodeURIComponent("/dashboard/repricer");
    return NextResponse.redirect(new URL(`/login?next=${target}`, req.url));
  }

  // Exchange code → refresh token
  let refreshToken: string;
  try {
    const tokens = await exchangeCodeForRefreshToken(code, getOauthRedirectUri(req));
    refreshToken = tokens.refresh_token;
  } catch (e) {
    console.error("[oauth/callback] LWA exchange failed:", e);
    return NextResponse.redirect(dashboardUrl(req, "error_token_exchange"));
  }

  // Persist (encrypted)
  const spApiEnv = (process.env.SP_API_ENV ?? "sandbox") as SpApiEnv;
  try {
    await upsertSellerAccount({
      userId: session.userId,
      amazonSellerId: sellerId,
      refreshToken,
      spApiEnv,
    });
  } catch (e) {
    console.error("[oauth/callback] DB upsert failed:", e);
    return NextResponse.redirect(dashboardUrl(req, "error_persist"));
  }

  // Suscripción a ANY_OFFER_CHANGED (best-effort, GATED). Solo si hay destino
  // configurado y estamos en producción: en sandbox/demo no hay eventos reales.
  // Nunca bloquea la conexión.
  const destinationId = process.env.SP_API_NOTIF_DESTINATION_ID;
  if (destinationId && spApiEnv === "production") {
    try {
      const { SpApiClient } = await import("@/lib/amazon/client");
      const { ensureAnyOfferChangedSubscription } = await import(
        "@/lib/amazon/notifications"
      );
      await ensureAnyOfferChangedSubscription(
        new SpApiClient(refreshToken, spApiEnv),
        destinationId,
      );
    } catch (e) {
      console.warn(
        "[oauth/callback] suscripción ANY_OFFER_CHANGED falló (best-effort):",
        e,
      );
    }
  }

  return NextResponse.redirect(dashboardUrl(req, "connected"));
}
