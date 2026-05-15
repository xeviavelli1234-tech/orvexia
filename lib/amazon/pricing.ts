import "server-only";
import { SpApiClient } from "./client";
import { MARKETPLACE_IDS } from "./endpoints";
import { getFixtureCompetitivePrice, isFixtureMode } from "./fixtures";
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
