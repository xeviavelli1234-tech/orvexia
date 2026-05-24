import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { upsertListingsBatch } from "@/lib/db/sellerListing";
import { fetchAllListings } from "@/lib/amazon/listings";
import { SpApiClient } from "@/lib/amazon/client";
import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type SpApiEnv = "sandbox" | "production";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const account = await getSellerAccountByUserId(session.userId);
  if (!account || !account.active) {
    return NextResponse.json({ error: "no_active_seller_account" }, { status: 400 });
  }
  // Modo manual no usa SP-API: el sync se hace subiendo CSV en
  // /api/sellers/manual/import. Rechazamos aquí para no llamar a Amazon con
  // credenciales sintéticas.
  if (account.mode === "manual") {
    return NextResponse.json(
      { error: "manual_mode_no_sync", detail: "Sube tu catálogo en CSV." },
      { status: 400 },
    );
  }

  // En modo demo/fixtures el token es el placeholder sin cifrar y no se usa
  // (fetchAllListings devuelve fixtures). Solo exigimos descifrado real en
  // producción. Mismo criterio que el runner.
  let refreshToken: string;
  try {
    refreshToken = decryptToken(account.refreshToken);
  } catch {
    refreshToken = "FIXTURE_NO_TOKEN";
  }

  const client = new SpApiClient(refreshToken, account.spApiEnv as SpApiEnv);

  let items;
  try {
    items = await fetchAllListings({
      client,
      amazonSellerId: account.amazonSellerId,
      marketplaceId: account.marketplaceId,
      spApiEnv: account.spApiEnv,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[listings/sync] SP-API fetch failed:", msg);
    return NextResponse.json({ error: "sp_api_fetch_failed", detail: msg }, { status: 502 });
  }

  let result;
  try {
    result = await upsertListingsBatch({
      sellerAccountId: account.id,
      items,
    });
  } catch (e) {
    console.error("[listings/sync] DB upsert failed:", e);
    return NextResponse.json({ error: "db_persist_failed" }, { status: 500 });
  }

  await prisma.sellerAccount.update({
    where: { id: account.id },
    data: { lastSyncAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    count: items.length,
    inserted: result.inserted,
    updated: result.updated,
    deleted: result.deleted,
    syncedAt: new Date().toISOString(),
  });
}
