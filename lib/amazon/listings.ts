import "server-only";
import { SpApiClient } from "./client";
import { MARKETPLACE_IDS } from "./endpoints";
import { FIXTURE_LISTINGS, isFixtureMode } from "./fixtures";

export interface NormalizedListing {
  asin: string;
  sku: string;
  title: string;
  imageUrl: string | null;
  productType: string | null;
  priceCurrent: number;
  currency: string;
}

interface ListingsApiResponse {
  items?: ListingItem[];
  pagination?: { nextToken?: string };
}

interface ListingItem {
  asin?: string;
  sku?: string;
  productType?: string;
  summaries?: Array<{
    marketplaceId: string;
    asin?: string;
    itemName?: string;
    mainImage?: { link?: string };
  }>;
  offers?: Array<{
    marketplaceId: string;
    offerType?: string;
    price?: { currencyCode?: string; amount?: number | string };
  }>;
}

const PAGE_SIZE = 20;       // SP-API 2021-08-01 max
const MAX_PAGES = 100;      // safety: 2000 items cap for MVP

/**
 * Fetches all listings of a seller from SP-API, paginated.
 * Normalizes each item to NormalizedListing.
 *
 * Note: SP-API Sandbox returns a fixed mock set (~3 items) regardless of seller.
 */
export async function fetchAllListings(params: {
  client: SpApiClient;
  amazonSellerId: string;
  marketplaceId?: string;
  spApiEnv?: string;
}): Promise<NormalizedListing[]> {
  // Modo fixtures: devuelve set mock realista sin tocar Amazon.
  if (params.spApiEnv && isFixtureMode(params.spApiEnv)) {
    return FIXTURE_LISTINGS.map((l) => ({ ...l }));
  }

  const marketplaceId = params.marketplaceId ?? MARKETPLACE_IDS.ES;
  const out: NormalizedListing[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const query: Record<string, string> = {
      marketplaceIds: marketplaceId,
      includedData: "summaries,offers,productTypes",
      pageSize: String(PAGE_SIZE),
    };
    if (pageToken) query.pageToken = pageToken;

    const res = await params.client.get<ListingsApiResponse>(
      `/listings/2021-08-01/items/${encodeURIComponent(params.amazonSellerId)}`,
      query,
    );

    for (const item of res.items ?? []) {
      const normalized = normalize(item, marketplaceId);
      if (normalized) out.push(normalized);
    }

    pageToken = res.pagination?.nextToken;
    pages += 1;
  } while (pageToken && pages < MAX_PAGES);

  return out;
}

function normalize(item: ListingItem, marketplaceId: string): NormalizedListing | null {
  const asin = item.asin ?? item.summaries?.[0]?.asin;
  const sku = item.sku;
  if (!asin || !sku) return null;

  const summary = item.summaries?.find((s) => s.marketplaceId === marketplaceId) ?? item.summaries?.[0];
  const offer = item.offers?.find((o) => o.marketplaceId === marketplaceId) ?? item.offers?.[0];

  const rawAmount = offer?.price?.amount;
  const priceCurrent =
    typeof rawAmount === "string" ? parseFloat(rawAmount) : typeof rawAmount === "number" ? rawAmount : NaN;
  if (!Number.isFinite(priceCurrent)) return null;

  return {
    asin,
    sku,
    title: summary?.itemName ?? sku,
    imageUrl: summary?.mainImage?.link ?? null,
    productType: item.productType ?? null,
    priceCurrent,
    currency: offer?.price?.currencyCode ?? "EUR",
  };
}
