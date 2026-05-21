import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getListingForUser } from "@/lib/db/sellerListing";
import {
  suggestPrice,
  deriveHistory,
  type PricingInput,
  type Urgency,
  type Aggression,
} from "@/lib/assistant/pricing";

export const maxDuration = 45;

// ─── Rate limiting (20/min) ────────────────────────────────────────────────
const HITS = new Map<string, number[]>();
const LIMIT = 20;
const WINDOW = 60_000;
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (HITS.get(userId) ?? []).filter((t) => now - t < WINDOW);
  arr.push(now);
  HITS.set(userId, arr);
  return arr.length > LIMIT;
}

const URGENCIES: Urgency[] = ["low", "normal", "high"];
const AGGRESSIONS: Aggression[] = ["conservative", "balanced", "aggressive"];

/**
 * POST /api/sellers/pricing/suggest
 * Body: {
 *   listingId: string,                      // SellerListing.id
 *   urgency?: "low" | "normal" | "high",
 *   aggression?: "conservative" | "balanced" | "aggressive",
 *   desiredMargin?: number,                 // %
 * }
 *
 * Devuelve PricingOutput (JSON con recommended_price, confidence, etc.)
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(session.userId)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: {
    listingId?: unknown;
    urgency?: unknown;
    aggression?: unknown;
    desiredMargin?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  if (!listingId) return NextResponse.json({ error: "listingId_required" }, { status: 400 });

  const listing = await getListingForUser({ listingId, userId: session.userId });
  if (!listing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const urgency: Urgency =
    typeof body.urgency === "string" && (URGENCIES as string[]).includes(body.urgency)
      ? (body.urgency as Urgency)
      : "normal";
  const aggression: Aggression =
    typeof body.aggression === "string" && (AGGRESSIONS as string[]).includes(body.aggression)
      ? (body.aggression as Aggression)
      : "balanced";
  const desiredMargin =
    typeof body.desiredMargin === "number" && Number.isFinite(body.desiredMargin)
      ? body.desiredMargin
      : null;

  // Histórico (últimos 30 días, máx 200 eventos) para derivar averages/trend.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const events = await prisma.repricingEvent.findMany({
    where: { listingId: listing.id, createdAt: { gte: since }, success: true },
    select: { priceAfter: true, competitorPrice: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const history = deriveHistory(events);

  // Número de competidores aproximado: nº de competitorPrice distintos vistos en el último ciclo.
  const recentCompetitorPrices = new Set(
    events
      .slice(0, 30)
      .map((e) => e.competitorPrice)
      .filter((v): v is number => v != null),
  );
  const competitorCount =
    recentCompetitorPrices.size > 0 ? recentCompetitorPrices.size : null;

  const input: PricingInput = {
    product: listing.title,
    brand: null,
    category: null,
    condition: "nuevo",
    currency: listing.currency,
    currentPrice: listing.priceCurrent,
    competitorPrice: listing.buyBoxPrice ?? null,
    buyBoxPrice: listing.buyBoxPrice ?? null,
    competitorCount,
    competitorStockUnknown: true,
    averagePrice: history.averagePrice,
    minHistoricalPrice: history.minHistoricalPrice,
    maxHistoricalPrice: history.maxHistoricalPrice,
    lastPrices: history.lastPrices,
    trendPercent7d: history.trendPercent7d,
    cost: listing.cost ?? null,
    fbaFee: listing.fbaFee ?? null,
    shippingCost: listing.shippingCost ?? null,
    feePercent: listing.feePercent ?? null,
    vatRate: listing.vatRate ?? null,
    priceMin: listing.priceMin ?? null,
    priceMax: listing.priceMax ?? null,
    urgency,
    aggression,
    desiredMargin: desiredMargin ?? listing.targetMargin ?? null,
    salesVelocityKnown: false, // SP-API Orders no integrado todavía
    date: new Date().toISOString().slice(0, 10),
  };

  const output = await suggestPrice(input);
  return NextResponse.json({
    ok: true,
    listingId: listing.id,
    sku: listing.sku,
    input: {
      currency: input.currency,
      currentPrice: input.currentPrice,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      historical: history,
      urgency,
      aggression,
    },
    suggestion: output,
  });
}
