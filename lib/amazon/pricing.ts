import "server-only";
import { SpApiClient } from "./client";
import { MARKETPLACE_IDS } from "./endpoints";
import { getFixtureCompetitivePrice, getFixtureOffers, isFixtureMode } from "./fixtures";
import {
  selectCompetitor,
  type CompetitionFilters,
  type CompetitionResult,
  type CompetitorOffer,
} from "@/lib/reprice/competition";
import type { SpApiCompetitivePrice } from "./types";

interface PricingCtx {
  client: SpApiClient;
  spApiEnv: string;
  marketplaceId?: string;
}

/**
 * Precio del competidor más barato para un ASIN.
 * En modo fixtures devuelve un mock determinista pero variable en el tiempo.
 * En producción llama a SP-API getCompetitivePricing.
 */
export async function getCompetitivePrice(
  ctx: PricingCtx,
  asin: string,
  basePrice: number,
): Promise<number | null> {
  if (isFixtureMode(ctx.spApiEnv)) {
    return getFixtureCompetitivePrice(asin, basePrice);
  }

  const marketplaceId = ctx.marketplaceId ?? MARKETPLACE_IDS.ES;
  const res = await ctx.client.get<{ payload?: SpApiCompetitivePrice[] }>(
    "/products/pricing/v0/competitivePrice",
    { MarketplaceId: marketplaceId, Asins: asin, ItemType: "Asin" },
  );

  const prices =
    res.payload?.[0]?.Product?.CompetitivePricing?.CompetitivePrices ?? [];
  const landed = prices
    .map((p) => p.Price?.LandedPrice?.Amount)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));

  if (landed.length === 0) return null;
  return Math.min(...landed);
}

interface ItemOffersResponse {
  payload?: {
    Offers?: Array<{
      SellerId?: string;
      ListingPrice?: { Amount?: number };
      Shipping?: { Amount?: number };
      IsFulfilledByAmazon?: boolean;
      IsBuyBoxWinner?: boolean;
      SellerFeedbackRating?: { SellerPositiveFeedbackRating?: number };
    }>;
  };
}

/**
 * Competencia + Buy Box para un ASIN, aplicando los filtros del listing.
 * Fixtures: ofertas mock deterministas. Producción: getItemOffers (v0).
 */
export async function getCompetition(
  ctx: PricingCtx,
  asin: string,
  basePrice: number,
  filters: CompetitionFilters,
  ourSellerId: string,
): Promise<CompetitionResult> {
  if (isFixtureMode(ctx.spApiEnv)) {
    const offers = getFixtureOffers(asin, basePrice, ourSellerId);
    return selectCompetitor(offers, filters, ourSellerId);
  }

  const marketplaceId = ctx.marketplaceId ?? MARKETPLACE_IDS.ES;
  const res = await ctx.client.get<ItemOffersResponse>(
    `/products/pricing/v0/items/${encodeURIComponent(asin)}/offers`,
    { MarketplaceId: marketplaceId, ItemCondition: "New" },
  );

  const offers: CompetitorOffer[] = (res.payload?.Offers ?? []).map((o) => {
    const fb = o.SellerFeedbackRating?.SellerPositiveFeedbackRating;
    return {
      sellerId: o.SellerId,
      price: (o.ListingPrice?.Amount ?? 0) + (o.Shipping?.Amount ?? 0),
      // Amazon retail no es fácil de identificar de forma fiable vía v0;
      // el filtro "ignorar Amazon" se evalúa igualmente (best-effort false).
      isAmazon: false,
      isFba: !!o.IsFulfilledByAmazon,
      rating: typeof fb === "number" ? Math.round((fb / 20) * 100) / 100 : null,
      isBuyBoxWinner: !!o.IsBuyBoxWinner,
    };
  });

  return selectCompetitor(offers, filters, ourSellerId);
}

/**
 * Aplica un precio nuevo a un listing del seller.
 * En modo fixtures es un no-op (solo log) — NO toca Amazon real.
 * En producción hace PATCH /listings/2021-08-01/items/{sellerId}/{sku}.
 */
export async function patchListingPrice(
  ctx: PricingCtx,
  params: {
    amazonSellerId: string;
    sku: string;
    productType: string | null;
    newPrice: number;
    currency: string;
  },
): Promise<{ applied: boolean; mode: "fixture" | "live" }> {
  if (isFixtureMode(ctx.spApiEnv)) {
    // No-op seguro: el precio nuevo se persiste en NUESTRA BD igualmente,
    // solo no se envía a Amazon (porque estamos en modo demo/fixtures).
    return { applied: true, mode: "fixture" };
  }

  const marketplaceId = ctx.marketplaceId ?? MARKETPLACE_IDS.ES;
  const productType = params.productType ?? "PRODUCT";

  await ctx.client.patch(
    `/listings/2021-08-01/items/${encodeURIComponent(params.amazonSellerId)}/${encodeURIComponent(params.sku)}`,
    {
      productType,
      patches: [
        {
          op: "replace",
          path: "/attributes/purchasable_offer",
          value: [
            {
              marketplace_id: marketplaceId,
              currency: params.currency,
              our_price: [
                { schedule: [{ value_with_tax: params.newPrice }] },
              ],
            },
          ],
        },
      ],
    },
    { marketplaceIds: marketplaceId, issueLocale: "es_ES" },
  );

  return { applied: true, mode: "live" };
}
