import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { exchangeCodeForRefreshToken } from "@/lib/amazon/lwa";
import { upsertSellerAccount } from "@/lib/db/sellerAccount";
import { getOauthRedirectUri } from "@/lib/url";
import { OAUTH_STATE_COOKIE } from "../start/route";

type SpApiEnv = "sandbox" | "production";

function dashboardUrl(req: Request, status: string) {
  // relink=1 evita que /dashboard/repricer rebote a /sellers/productos cuando ya
  // hay una cuenta activa (p.ej. manual): sin él, el error de conexión se perdía
  // y el usuario aterrizaba en modo manual sin saber qué falló.
  return new URL(`/dashboard/repricer?relink=1&status=${status}`, req.url);
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

  const spApiEnv = (process.env.SP_API_ENV ?? "sandbox") as SpApiEnv;

  // Deriva el marketplace REAL del vendedor (solo producción; el sandbox da un
  // mock fijo). Sin esto la cuenta quedaba clavada en ES y un vendedor de
  // .de/.fr/.it/.uk sincronizaba 0 productos. Best-effort: si falla, ES.
  let marketplaceId: string | undefined;
  if (spApiEnv === "production") {
    try {
      const { SpApiClient } = await import("@/lib/amazon/client");
      const { getSellerEuMarketplaces, pickPrimaryMarketplace } = await import(
        "@/lib/amazon/sellers"
      );
      const client = new SpApiClient(refreshToken, spApiEnv);
      marketplaceId = pickPrimaryMarketplace(await getSellerEuMarketplaces(client));
    } catch (e) {
      console.warn("[oauth/callback] no se pudo derivar marketplace; usando default:", e);
    }
  }

  // Persist (encrypted)
  let account;
  try {
    account = await upsertSellerAccount({
      userId: session.userId,
      amazonSellerId: sellerId,
      refreshToken,
      spApiEnv,
      marketplaceId,
    });
  } catch (e) {
    console.error("[oauth/callback] DB upsert failed:", e);
    // Distingue un ENCRYPTION_KEY ausente/inválido del fallo genérico de BD:
    // ambos daban "error_persist" y eran indistinguibles desde la UI.
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("ENCRYPTION_KEY") ? "error_encryption" : "error_persist";
    return NextResponse.redirect(dashboardUrl(req, status));
  }

  // Sincronización inicial de listings (best-effort, solo producción). Sin
  // esto el vendedor aterrizaba en un panel VACÍO tras conectar y tenía que
  // pulsar "Sincronizar" a mano. Nunca bloquea la conexión: si Amazon falla,
  // cae al estado vacío con el botón Sincronizar como respaldo.
  let syncedCount = 0;
  if (spApiEnv === "production") {
    try {
      const { SpApiClient } = await import("@/lib/amazon/client");
      const { fetchAllListings } = await import("@/lib/amazon/listings");
      const { upsertListingsBatch } = await import("@/lib/db/sellerListing");
      const { prisma } = await import("@/lib/prisma");
      const client = new SpApiClient(refreshToken, spApiEnv);
      const items = await fetchAllListings({
        client,
        amazonSellerId: sellerId,
        marketplaceId: account.marketplaceId,
        spApiEnv,
      });
      await upsertListingsBatch({ sellerAccountId: account.id, items });
      await prisma.sellerAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: new Date() },
      });
      syncedCount = items.length;
    } catch (e) {
      console.warn("[oauth/callback] sync inicial best-effort falló:", e);
    }

    // Suscripción a ANY_OFFER_CHANGED (best-effort, GATED). Solo si hay destino
    // configurado: en sandbox/demo no hay eventos reales. Nunca bloquea.
    const destinationId = process.env.SP_API_NOTIF_DESTINATION_ID;
    if (destinationId) {
      try {
        const { SpApiClient } = await import("@/lib/amazon/client");
        const { ensureAnyOfferChangedSubscription } = await import(
          "@/lib/amazon/notifications"
        );
        const subscriptionId = await ensureAnyOfferChangedSubscription(
          new SpApiClient(refreshToken, spApiEnv),
          destinationId,
        );
        // Guardamos el id para poder CANCELAR la suscripción al desconectar/
        // borrar la cuenta (si no, queda huérfana enviando eventos a la cola).
        if (subscriptionId) {
          const { prisma } = await import("@/lib/prisma");
          await prisma.sellerAccount.update({
            where: { id: account.id },
            data: { notifSubscriptionId: subscriptionId },
          });
        }
      } catch (e) {
        console.warn(
          "[oauth/callback] suscripción ANY_OFFER_CHANGED falló (best-effort):",
          e,
        );
      }
    }
  }

  // Redirige directo al Centro de control con feedback (status + nº importados).
  // Antes pasaba por /dashboard/repricer?status=connected, que rebotaba a
  // /sellers/productos descartando el banner de confirmación.
  return NextResponse.redirect(
    new URL(`/sellers/productos?status=connected&synced=${syncedCount}`, req.url),
  );
}
