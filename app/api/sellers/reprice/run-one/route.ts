import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { SpApiClient } from "@/lib/amazon/client";
import { getCompetition, patchListingPrice } from "@/lib/amazon/pricing";
import { runPatchWithBackoff } from "@/lib/reprice/backoff";
import { persistPatchOutcome } from "@/lib/reprice/resilience";
import { isFixtureMode } from "@/lib/amazon/fixtures";
import { isRepricingAllowed, type SellerPlan } from "@/lib/billing";
import { computeNewPrice } from "@/lib/reprice/engine";
import { minPriceForMargin } from "@/lib/reprice/margin";
import { parseTags } from "@/lib/tags";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // 1 reprecio manual cada 5 s por usuario — el botón también está
  // disabled mientras corre, pero defendemos el endpoint contra clicks
  // rápidos / scripting. PATCH cuesta cuota a Amazon, no es gratis.
  if (rateLimit("reprice-run-one", session.userId, 12, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const account = await getSellerAccountByUserId(session.userId);
  if (!account || !account.active) {
    return NextResponse.json({ error: "no_active_account" }, { status: 400 });
  }
  if (account.mode === "manual") {
    return NextResponse.json({ error: "manual_mode" }, { status: 400 });
  }

  const now = new Date();
  if (!isRepricingAllowed(account.plan as SellerPlan, account.trialEndsAt, now)) {
    return NextResponse.json({ error: "plan_limit" }, { status: 402 });
  }

  const body = await req.json().catch(() => ({})) as { listingId?: string };
  const { listingId } = body;
  if (!listingId) {
    return NextResponse.json({ error: "listingId_required" }, { status: 400 });
  }

  const listing = await prisma.sellerListing.findFirst({
    where: { id: listingId, sellerAccountId: account.id },
  });
  if (!listing) {
    return NextResponse.json({ error: "listing_not_found" }, { status: 404 });
  }
  if (listing.priceCurrent <= 0 || !listing.asin) {
    return NextResponse.json({ error: "listing_not_repriceable" }, { status: 400 });
  }
  if (!listing.priceMin || !listing.priceMax) {
    return NextResponse.json({ error: "missing_price_range" }, { status: 400 });
  }

  // Token
  let refreshToken: string;
  if (account.refreshToken === "FIXTURE_NO_TOKEN") {
    refreshToken = "FIXTURE_NO_TOKEN";
  } else {
    try {
      refreshToken = decryptToken(account.refreshToken);
    } catch {
      if (isFixtureMode(account.spApiEnv)) {
        refreshToken = "FIXTURE_NO_TOKEN";
      } else {
        return NextResponse.json({ error: "token_no_descifrable" }, { status: 500 });
      }
    }
  }

  const client = new SpApiClient(refreshToken, account.spApiEnv as "sandbox" | "production");
  const ctx = {
    client,
    spApiEnv: account.spApiEnv,
    marketplaceId: account.marketplaceId,
  };

  // Crear run
  const run = await prisma.repricingRun.create({
    data: { sellerAccountId: account.id, startedAt: now },
  });

  try {
    const comp = await getCompetition(
      ctx,
      listing.asin,
      listing.priceCurrent,
      {
        ignoreAmazon: listing.ignoreAmazon,
        fulfillment: listing.fulfillmentFilter,
        minRating: listing.minSellerRating ?? null,
        excludeSellers: parseTags(listing.excludeSellers),
        onlySellers: parseTags(listing.onlySellers),
      },
      account.amazonSellerId,
    );

    const hasCompThisCycle = comp.price != null;
    const nextNoCompStreak = hasCompThisCycle
      ? 0
      : listing.noCompetitionStreak + 1;
    let stepUpMult = 1;
    if (account.stepUpAccelCycles > 0 && nextNoCompStreak > account.stepUpAccelCycles) {
      const excess = nextNoCompStreak - account.stepUpAccelCycles;
      stepUpMult = Math.min(
        Math.max(1, account.stepUpMaxMult),
        Math.pow(2, excess),
      );
    }

    // Actualizar Buy Box + cache de competencia (igual que el runner).
    await prisma.sellerListing.update({
      where: { id: listing.id },
      data: {
        buyBoxStatus: comp.buyBox,
        buyBoxPrice: comp.buyBoxPrice ?? comp.price ?? undefined,
        buyBoxAt: now,
        lastCompetitorPrice: comp.price ?? null,
        lastCompetitorAt: now,
        noCompetitionStreak: nextNoCompStreak,
      },
    });

    const eff = listing.useAccountDefaults
      ? {
          strategy: account.defaultStrategy,
          undercutType: account.defaultUndercutType,
          undercutValue: account.defaultUndercutValue,
          noCompetition: account.defaultNoCompetition,
          stepUpType: account.defaultStepUpType,
          stepUpValue: account.defaultStepUpValue,
        }
      : {
          strategy: listing.strategy,
          undercutType: listing.undercutType,
          undercutValue: listing.undercutValue,
          noCompetition: listing.noCompetition,
          stepUpType: listing.stepUpType,
          stepUpValue: listing.stepUpValue,
        };

    let marginFloor: number | null = null;
    if (listing.cost != null && listing.cost > 0) {
      marginFloor = minPriceForMargin(
        {
          cost: listing.cost,
          shipping: listing.shippingCost,
          fbaFee: listing.fbaFee,
          referralPct: listing.feePercent ?? 15,
          vatPct: listing.vatRate ?? 21,
        },
        listing.targetMargin ?? 0,
      );
    }

    const priceWarLocked =
      account.priceWarCycles > 0 &&
      listing.priceWarStreak >= account.priceWarCycles;

    const result = computeNewPrice({
      priceCurrent: listing.priceCurrent,
      priceMin: listing.priceMin!,
      priceMax: listing.priceMax!,
      competitorPrice: comp.price,
      buyBoxPrice: comp.buyBoxPrice ?? null,
      strategy: eff.strategy,
      undercutType: eff.undercutType,
      undercutValue: eff.undercutValue,
      fixedPrice: listing.fixedPrice,
      marginFloor,
      noCompetition: eff.noCompetition,
      stepUpType: eff.stepUpType,
      stepUpValue: eff.stepUpValue,
      stepUpMult,
      minChangeAmount: account.minChangeAmount,
      minChangePct: account.minChangePct,
      priceWarLocked,
    });

    const goingDown =
      result.changed && result.newPrice < listing.priceCurrent;
    const pulledByCompetitor = result.reason === "competitor_undercut";
    const nextWarStreak =
      result.reason === "price_war"
        ? 0
        : goingDown && pulledByCompetitor
          ? listing.priceWarStreak + 1
          : 0;
    const newDir =
      !result.changed
        ? null
        : result.newPrice > listing.priceCurrent
          ? "UP"
          : "DOWN";

    if (!result.changed) {
      await prisma.repricingEvent.create({
        data: {
          runId: run.id,
          listingId: listing.id,
          priceBefore: listing.priceCurrent,
          priceAfter: listing.priceCurrent,
          competitorPrice: comp.price,
          reason: "no_change",
          success: true,
          buyBox: comp.buyBox,
        },
      });
      await prisma.repricingRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), listingsProcessed: 1, listingsRepriced: 0, errors: 0 },
      });
      return NextResponse.json({
        ok: true,
        changed: false,
        reason: result.reason,
        priceBefore: listing.priceCurrent,
        priceAfter: listing.priceCurrent,
        competitorPrice: comp.price,
      });
    }

    if (account.dryRun) {
      await prisma.repricingEvent.create({
        data: {
          runId: run.id,
          listingId: listing.id,
          priceBefore: listing.priceCurrent,
          priceAfter: result.newPrice,
          competitorPrice: comp.price,
          reason: result.reason,
          success: true,
          simulated: true,
          buyBox: comp.buyBox,
        },
      });
      await prisma.repricingRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), listingsProcessed: 1, listingsRepriced: 1, errors: 0 },
      });
      return NextResponse.json({
        ok: true,
        changed: true,
        simulated: true,
        reason: result.reason,
        priceBefore: listing.priceCurrent,
        priceAfter: result.newPrice,
        competitorPrice: comp.price,
      });
    }

    // Aplicar precio
    const { outcome } = await runPatchWithBackoff(() =>
      patchListingPrice(ctx, {
        amazonSellerId: account.amazonSellerId,
        sku: listing.sku,
        productType: listing.productType,
        newPrice: result.newPrice,
        currency: listing.currency,
      }),
    );

    if (!outcome.applied) {
      await prisma.repricingEvent.create({
        data: {
          runId: run.id,
          listingId: listing.id,
          priceBefore: listing.priceCurrent,
          priceAfter: listing.priceCurrent,
          competitorPrice: comp.price,
          reason: outcome.rateLimited ? "throttled" : "patch_error",
          success: false,
          errorMessage: outcome.error?.message ?? "",
          buyBox: comp.buyBox,
        },
      });
      await persistPatchOutcome({
        sellerAccountId: account.id,
        listingId: listing.id,
        outcome,
      });
      await prisma.repricingRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), listingsProcessed: 1, listingsRepriced: 0, errors: 1 },
      });
      return NextResponse.json(
        { error: "patch_failed", detail: outcome.error?.message ?? "unknown" },
        { status: 502 },
      );
    }

    // Éxito
    await prisma.$transaction([
      prisma.sellerListing.update({
        where: { id: listing.id },
        data: {
          priceCurrent: result.newPrice,
          consecutiveErrors: 0,
          lastRepricedAt: now,
          priceWarStreak: nextWarStreak,
          lastDirection: newDir ?? listing.lastDirection,
        },
      }),
      prisma.repricingEvent.create({
        data: {
          runId: run.id,
          listingId: listing.id,
          priceBefore: listing.priceCurrent,
          priceAfter: result.newPrice,
          competitorPrice: comp.price,
          reason: result.reason,
          success: true,
          buyBox: comp.buyBox,
        },
      }),
      prisma.repricingRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), listingsProcessed: 1, listingsRepriced: 1, errors: 0 },
      }),
    ]);
    // Quota tracker + lastExpectedPrice (best-effort, igual que en runner.ts)
    await persistPatchOutcome({
      sellerAccountId: account.id,
      listingId: listing.id,
      outcome,
      appliedPrice: result.newPrice,
    });
    await prisma.sellerAccount.update({
      where: { id: account.id },
      data: { lastRunAt: now },
    });

    return NextResponse.json({
      ok: true,
      changed: true,
      simulated: false,
      reason: result.reason,
      priceBefore: listing.priceCurrent,
      priceAfter: result.newPrice,
      competitorPrice: comp.price,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.repricingRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), listingsProcessed: 1, listingsRepriced: 0, errors: 1, errorMessage: msg },
    }).catch(() => {});
    return NextResponse.json({ error: "unexpected", detail: msg }, { status: 500 });
  }
}
