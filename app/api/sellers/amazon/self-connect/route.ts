import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { upsertSellerAccount } from "@/lib/db/sellerAccount";
import { isAdminUser } from "@/lib/admin";

/**
 * Self-authorization de producción (app privada, cuenta propia).
 *
 * El refresh token de producción se obtuvo vía "Autorizar" en el Solution
 * Provider Portal y se guarda como variable de entorno en Vercel
 * (SP_API_REFRESH_TOKEN) — NUNCA en git. El merchant token (sellerId) va
 * en SP_API_SELLER_ID. Este endpoint crea/actualiza el SellerAccount del
 * usuario logueado con esas credenciales reales, cifrando el token.
 *
 * Pensado para uso propio (un solo seller). Para multi-seller real se
 * volvería al flujo OAuth web.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?next=/dashboard/repricer", req.url));
  }

  // Este endpoint provisiona las credenciales SP-API del SERVIDOR (el refresh
  // token REAL de producción del operador) en la cuenta del usuario que llama.
  // Es SOLO para el dueño: sin este gate, cualquier usuario registrado quedaría
  // con el token real y podría reprecir las fichas Amazon del operador y quemar
  // su cuota. El "Solo dueño" de la UI no basta (es ocultación en cliente).
  if (!(await isAdminUser(session.userId))) {
    return NextResponse.redirect(
      new URL("/dashboard/repricer?status=error_forbidden", req.url),
    );
  }

  const refreshToken = process.env.SP_API_REFRESH_TOKEN;
  const sellerId = process.env.SP_API_SELLER_ID;
  const env = (process.env.SP_API_ENV ?? "sandbox") as "sandbox" | "production";

  if (!refreshToken || !sellerId) {
    return NextResponse.redirect(
      new URL("/dashboard/repricer?status=error_selfconnect_env", req.url),
    );
  }
  if (env !== "production") {
    return NextResponse.redirect(
      new URL("/dashboard/repricer?status=error_not_production", req.url),
    );
  }

  // Deriva el marketplace real del vendedor (best-effort; si falla, ES).
  let marketplaceId: string | undefined;
  try {
    const { SpApiClient } = await import("@/lib/amazon/client");
    const { getSellerEuMarketplaces, pickPrimaryMarketplace } = await import(
      "@/lib/amazon/sellers"
    );
    const client = new SpApiClient(refreshToken, "production");
    marketplaceId = pickPrimaryMarketplace(await getSellerEuMarketplaces(client));
  } catch (e) {
    console.warn("[self-connect] no se pudo derivar marketplace; usando default:", e);
  }

  let account;
  try {
    account = await upsertSellerAccount({
      userId: session.userId,
      amazonSellerId: sellerId,
      refreshToken,
      spApiEnv: "production",
      marketplaceId,
    });
  } catch (e) {
    console.error("[self-connect] failed:", e);
    return NextResponse.redirect(
      new URL("/dashboard/repricer?status=error_persist", req.url),
    );
  }

  // Sync inicial best-effort para no aterrizar en un panel vacío.
  let syncedCount = 0;
  try {
    const { SpApiClient } = await import("@/lib/amazon/client");
    const { fetchAllListings } = await import("@/lib/amazon/listings");
    const { upsertListingsBatch } = await import("@/lib/db/sellerListing");
    const { prisma } = await import("@/lib/prisma");
    const client = new SpApiClient(refreshToken, "production");
    const items = await fetchAllListings({
      client,
      amazonSellerId: sellerId,
      marketplaceId: account.marketplaceId,
      spApiEnv: "production",
    });
    await upsertListingsBatch({ sellerAccountId: account.id, items });
    await prisma.sellerAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date() },
    });
    syncedCount = items.length;
  } catch (e) {
    console.warn("[self-connect] sync inicial best-effort falló:", e);
  }

  return NextResponse.redirect(
    new URL(`/sellers/productos?status=connected&synced=${syncedCount}`, req.url),
  );
}
