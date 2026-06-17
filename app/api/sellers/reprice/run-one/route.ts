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
import { shouldRunAccount } from "@/lib/reprice/gating";
import { computeNewPrice } from "@/lib/reprice/engine";
import { minPriceForMargin } from "@/lib/reprice/margin";
import { LOCK_TTL_MS } from "@/lib/reprice/runner";
import { parseTags } from "@/lib/tags";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Límite: 12 reprecios manuales por minuto y usuario (best-effort, en
  // memoria por instancia; la garantía REAL anti doble-PATCH es el lock por
  // cuenta más abajo). El botón también está disabled mientras corre. PATCH
  // cuesta cuota a Amazon, no es gratis.
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
  // Misma puerta que el cron con force=true: respeta el plan y, sobre todo, las
  // VACACIONES (pausa total que el usuario declaró y que ni force salta). Salta
  // intervalo/horario, que es lo correcto para un disparo manual.
  const gate = shouldRunAccount(account, now, { force: true });
  if (!gate.run) {
    const status = gate.reason === "plan_expired" ? 402 : 409;
    return NextResponse.json({ error: gate.reason }, { status });
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

  // Lock de ciclo por cuenta (mismo mecanismo que el cron): evita que el cron
  // y este disparo manual reprecien el mismo listing a la vez (doble PATCH,
  // doble cuota, carrera sobre priceCurrent). Si el cron está procesando esta
  // cuenta ahora mismo, devolvemos 409 y el usuario reintenta en unos segundos.
  const lockStale = new Date(now.getTime() - LOCK_TTL_MS);
  const claim = await prisma.sellerAccount.updateMany({
    where: {
      id: account.id,
      OR: [{ lockedAt: null }, { lockedAt: { lt: lockStale } }],
    },
    data: { lockedAt: now },
  });
  if (claim.count === 0) {
    return NextResponse.json({ error: "busy" }, { status: 409 });
  }

  let run: { id: string } | null = null;
  try {
    run = await prisma.repricingRun.create({
      data: { sellerAccountId: account.id, startedAt: now },
    });

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
          buyBoxProbeUp: account.defaultBuyBoxProbeUp,
        }
      : {
          strategy: listing.strategy,
          undercutType: listing.undercutType,
          undercutValue: listing.undercutValue,
          noCompetition: listing.noCompetition,
          stepUpType: listing.stepUpType,
          stepUpValue: listing.stepUpValue,
          buyBoxProbeUp: listing.buyBoxProbeUp,
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
      weOwnBuyBox: comp.buyBox === "WON",
      strategy: eff.strategy,
      undercutType: eff.undercutType,
      undercutValue: eff.undercutValue,
      fixedPrice: listing.fixedPrice,
      marginFloor,
      noCompetition: eff.noCompetition,
      stepUpType: eff.stepUpType,
      stepUpValue: eff.stepUpValue,
      stepUpMult,
      buyBoxProbeUp: eff.buyBoxProbeUp,
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
      // Persistimos priceWarStreak igual que el cron (runner.ts): si no lo
      // hiciéramos, el detector de guerra de precios leería un streak obsoleto
      // tras un reprecio manual.
      await prisma.$transaction([
        prisma.repricingEvent.create({
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
        }),
        prisma.sellerListing.update({
          where: { id: listing.id },
          data: { priceWarStreak: nextWarStreak, consecutiveErrors: 0 },
        }),
        prisma.repricingRun.update({
          where: { id: run.id },
          data: { finishedAt: new Date(), listingsProcessed: 1, listingsRepriced: 0, errors: 0 },
        }),
      ]);
      return NextResponse.json({
        ok: true,
        changed: false,
        reason: result.reason,
        priceBefore: listing.priceCurrent,
        priceAfter: listing.priceCurrent,
        competitorPrice: comp.price,
      });
    }

    // Guerra de precios + acción PAUSE: pausamos el listing en vez de aplicar el
    // suelo en Amazon (igual que el cron, runner.ts). El usuario lo configuró
    // así para investigar; un reprecio manual no debe saltarse esa decisión.
    if (result.reason === "price_war" && account.priceWarAction === "PAUSE") {
      await prisma.$transaction([
        prisma.sellerListing.update({
          where: { id: listing.id },
          data: {
            repricingEnabled: false,
            autoPausedAt: now,
            autoPausedReason: "price_war",
            priceWarStreak: 0,
          },
        }),
        prisma.repricingEvent.create({
          data: {
            runId: run.id,
            listingId: listing.id,
            priceBefore: listing.priceCurrent,
            priceAfter: listing.priceCurrent,
            competitorPrice: comp.price,
            reason: "price_war_paused",
            success: true,
            buyBox: comp.buyBox,
          },
        }),
        prisma.repricingRun.update({
          where: { id: run.id },
          data: { finishedAt: new Date(), listingsProcessed: 1, listingsRepriced: 0, errors: 0 },
        }),
      ]);
      return NextResponse.json({
        ok: true,
        changed: false,
        reason: "price_war_paused",
        priceBefore: listing.priceCurrent,
        priceAfter: listing.priceCurrent,
        competitorPrice: comp.price,
      });
    }

    if (account.dryRun) {
      // Simulación: como el cron, guardamos el streak para que las stats no
      // mientan, pero NO tocamos el precio ni Amazon.
      await prisma.$transaction([
        prisma.repricingEvent.create({
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
        }),
        prisma.sellerListing.update({
          where: { id: listing.id },
          data: { priceWarStreak: nextWarStreak, consecutiveErrors: 0 },
        }),
        prisma.repricingRun.update({
          where: { id: run.id },
          data: { finishedAt: new Date(), listingsProcessed: 1, listingsRepriced: 1, errors: 0 },
        }),
      ]);
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
      // PATCH no aplicado: deshacemos el avance especulativo del streak de
      // "sin competencia" (igual que el cron en runner.ts).
      await prisma.sellerListing.update({
        where: { id: listing.id },
        data: {
          noCompetitionStreak: hasCompThisCycle ? 0 : listing.noCompetitionStreak,
        },
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
    // NO tocamos account.lastRunAt: es un reprecio manual de UN producto, no un
    // ciclo de cuenta. Escribirlo retrasaría el siguiente ciclo del cron para
    // TODOS los listings de la cuenta (el cron usa lastRunAt + intervalo).

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
    if (run) {
      await prisma.repricingRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), listingsProcessed: 1, listingsRepriced: 0, errors: 1, errorMessage: msg },
      }).catch(() => {});
    }
    return NextResponse.json({ error: "unexpected", detail: msg }, { status: 500 });
  } finally {
    // Libera el lock pase lo que pase (éxito, return temprano o excepción).
    await prisma.sellerAccount
      .updateMany({ where: { id: account.id }, data: { lockedAt: null } })
      .catch(() => {});
  }
}
