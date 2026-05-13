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

  let refreshToken: string;
  try {
    refreshToken = decryptToken(account.refreshToken);
  } catch (e) {
    console.error("[listings/sync] decrypt failed:", e);
    return NextResponse.json({ error: "token_decrypt_failed" }, { status: 500 });
  }

  const client = new SpApiClient(refreshToken, account.spApiEnv as SpApiEnv);

  let items;
  try {
    items = await fetchAllListings({
      client,
      amazonSellerId: account.amazonSellerId,
      marketplaceId: account.marketplaceId,
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
    syncedAt: new Date().toISOString(),
  });
}
