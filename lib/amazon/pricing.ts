import "server-only";
import { SpApiClient } from "./client";
import { MARKETPLACE_IDS } from "./endpoints";
import { isAmazonRetail, parseAmazonRetailOverride } from "./amazon-retail";
import { getFixtureOffers, isFixtureMode } from "./fixtures";
import {
  selectCompetitor,
  type CompetitionFilters,
  type CompetitionResult,
  type CompetitorOffer,
} from "@/lib/reprice/competition";
import { SpApiError } from "./types";
import {
  submissionRejection,
  type ListingsSubmissionResponse,
} from "./listings-submission";

interface PricingCtx {
  client: SpApiClient;
  spApiEnv: string;
  marketplaceId?: string;
}

interface ItemOffersResponse {
  payload?: {
    Offers?: Array<{
      SellerId?: string;
      /** SP-API marca NUESTRA oferta con MyOffer=true. Es el identificador
       *  fiable: v0 anonimiza el SellerId de la competencia. */
      MyOffer?: boolean;
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

  // getItemOffers v0 no trae un flag de Amazon: lo detectamos por SellerId
  // (tabla por marketplace + override AMAZON_RETAIL_SELLER_IDS). Si el SellerId
  // no viene en la oferta, queda false → sin regresión respecto al anterior.
  const amazonRetailIds = parseAmazonRetailOverride(
    process.env.AMAZON_RETAIL_SELLER_IDS,
  );
  const offers: CompetitorOffer[] = (res.payload?.Offers ?? []).map((o) => {
    const fb = o.SellerFeedbackRating?.SellerPositiveFeedbackRating;
    return {
      sellerId: o.SellerId,
      isMyOffer: o.MyOffer === true,
      price: (o.ListingPrice?.Amount ?? 0) + (o.Shipping?.Amount ?? 0),
      isAmazon: isAmazonRetail(o.SellerId, marketplaceId, amazonRetailIds),
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

  const res = await ctx.client.patch<ListingsSubmissionResponse>(
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

  // Amazon responde 200 aunque RECHACE el cambio (status INVALID / issues
  // ERROR). Si no lanzáramos, el runner lo daría por aplicado y actualizaría
  // priceCurrent con un precio que NO está vivo en Amazon. Lanzar lo encauza
  // por classifyError → INVALID → persistPatchOutcome (sin reintentar, pausa
  // el listing y audita el motivo real que devuelve Amazon).
  const rejection = submissionRejection(res);
  if (rejection) {
    throw new SpApiError(
      422,
      rejection.code,
      `PATCH rechazado por Amazon — ${rejection.detail}`,
    );
  }

  return { applied: true, mode: "live" };
}
