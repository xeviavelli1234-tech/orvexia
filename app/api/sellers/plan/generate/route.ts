import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { prisma } from "@/lib/prisma";
import { suggestPrice, type PricingInput } from "@/lib/assistant/pricing";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * POST /api/sellers/plan/generate
 *
 * Modo MANUAL: para cada listing del vendedor calcula un precio sugerido con
 * el mismo motor heurístico que /pricing/suggest, sin llamar a Amazon. El
 * resultado se cachea en SellerListing.suggested* para que /plan/export pueda
 * servir el CSV sin recomputar.
 *
 * El endpoint es idempotente: regenerar reemplaza los valores anteriores.
 */
export async function POST(req: Request) {
  void req;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Generar plan ejecuta suggestPrice() por cada listing; costoso en CPU
  // y, si se conecta IA externa, en tokens. 3 ejecuciones cada 10 min.
  if (rateLimit("plan-generate", session.userId, 3, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const account = await getSellerAccountByUserId(session.userId);
  if (!account) return NextResponse.json({ error: "no_account" }, { status: 404 });
  if (account.mode !== "manual") {
    return NextResponse.json({ error: "not_manual_mode" }, { status: 400 });
  }

  const listings = await prisma.sellerListing.findMany({
    where: { sellerAccountId: account.id },
    select: {
      id: true,
      sku: true,
      title: true,
      priceCurrent: true,
      priceMin: true,
      priceMax: true,
      cost: true,
      shippingCost: true,
      fbaFee: true,
      vatRate: true,
      feePercent: true,
      targetMargin: true,
      currency: true,
    },
  });

  if (listings.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      generated: 0,
      skipped: 0,
    });
  }

  let generated = 0;
  let skipped = 0;
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  for (const l of listings) {
    if (!l.priceCurrent || l.priceCurrent <= 0) {
      skipped++;
      continue;
    }
    const input: PricingInput = {
      product: l.title,
      brand: null,
      category: null,
      condition: "nuevo",
      currency: l.currency,
      currentPrice: l.priceCurrent,
      competitorPrice: null,
      buyBoxPrice: null,
      competitorCount: null,
      competitorStockUnknown: true,
      averagePrice: null,
      minHistoricalPrice: null,
      maxHistoricalPrice: null,
      lastPrices: [],
      trendPercent7d: null,
      cost: l.cost ?? null,
      fbaFee: l.fbaFee ?? null,
      shippingCost: l.shippingCost ?? null,
      feePercent: l.feePercent ?? null,
      vatRate: l.vatRate ?? null,
      priceMin: l.priceMin ?? null,
      priceMax: l.priceMax ?? null,
      urgency: "normal",
      aggression: "balanced",
      desiredMargin: l.targetMargin ?? null,
      salesVelocityKnown: false,
      date: today,
    };
    const out = await suggestPrice(input);
    await prisma.sellerListing.update({
      where: { id: l.id },
      data: {
        suggestedPrice: out.recommended_price,
        suggestedAt: now,
        suggestedConfidence: out.confidence,
        suggestedStrategy: out.strategy,
        suggestedReason: out.explanation?.slice(0, 1000) ?? null,
      },
    });
    generated++;
  }

  return NextResponse.json({
    ok: true,
    processed: listings.length,
    generated,
    skipped,
    generatedAt: now.toISOString(),
  });
}
