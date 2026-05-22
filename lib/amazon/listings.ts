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

interface PurchasableOfferAttr {
  marketplace_id?: string;
  currency?: string;
  our_price?: Array<{
    schedule?: Array<{ value_with_tax?: number | string }>;
  }>;
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
    status?: string[];
  }>;
  offers?: Array<{
    marketplaceId: string;
    offerType?: string;
    price?: { currencyCode?: string; amount?: number | string };
  }>;
  attributes?: {
    purchasable_offer?: PurchasableOfferAttr[];
    list_price?: Array<{ value?: number | string; currency?: string }>;
    item_name?: Array<{ value?: string }>;
  };
}

const PAGE_SIZE = 20; // SP-API 2021-08-01 max
const MAX_PAGES = 250; // safety: hasta 5000 items

/**
 * Trae TODOS los listings del seller desde SP-API, paginado, y los normaliza.
 *
 * Objetivo: que se vean TODOS los productos publicados al sincronizar.
 * Por eso NO se descarta un listing por no tener precio: el precio puede
 * venir en `offers` o en `attributes.purchasable_offer` o en `list_price`,
 * y algunos listings válidos (sin stock, oferta incompleta) no traen precio
 * en absoluto. En ese caso se importa con priceCurrent = 0 y el usuario
 * decide si lo configura.
 *
 * Nota: el Sandbox SP-API devuelve un mock fijo (~3 items) sea cual sea el seller.
 */
export async function fetchAllListings(params: {
  client: SpApiClient;
  amazonSellerId: string;
  marketplaceId?: string;
  spApiEnv?: string;
}): Promise<NormalizedListing[]> {
  // Modo fixtures: set mock realista sin tocar Amazon.
  if (params.spApiEnv && isFixtureMode(params.spApiEnv)) {
    return FIXTURE_LISTINGS.map((l) => ({ ...l }));
  }

  const marketplaceId = params.marketplaceId ?? MARKETPLACE_IDS.ES;
  const out: NormalizedListing[] = [];
  const seenSkus = new Set<string>();
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const query: Record<string, string> = {
      marketplaceIds: marketplaceId,
      includedData: "summaries,attributes,offers,productTypes",
      pageSize: String(PAGE_SIZE),
    };
    if (pageToken) query.pageToken = pageToken;

    const res = await params.client.get<ListingsApiResponse>(
      `/listings/2021-08-01/items/${encodeURIComponent(params.amazonSellerId)}`,
      query,
    );

    for (const item of res.items ?? []) {
      const normalized = normalize(item, marketplaceId);
      if (normalized && !seenSkus.has(normalized.sku)) {
        seenSkus.add(normalized.sku);
        out.push(normalized);
      }
    }

    pageToken = res.pagination?.nextToken;
    pages += 1;
  } while (pageToken && pages < MAX_PAGES);

  return out;
}

function toNumber(v: number | string | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v === "string") return parseFloat(v);
  return NaN;
}

/** Extrae el precio actual del listing probando offers → attributes. */
function extractPrice(
  item: ListingItem,
  marketplaceId: string,
): { price: number; currency: string } {
  // 1) offers[]
  const offer =
    item.offers?.find((o) => o.marketplaceId === marketplaceId) ?? item.offers?.[0];
  const offerPrice = toNumber(offer?.price?.amount);
  if (Number.isFinite(offerPrice) && offerPrice > 0) {
    return { price: offerPrice, currency: offer?.price?.currencyCode ?? "EUR" };
  }

  // 2) attributes.purchasable_offer[].our_price[].schedule[].value_with_tax
  const po =
    item.attributes?.purchasable_offer?.find((p) => p.marketplace_id === marketplaceId) ??
    item.attributes?.purchasable_offer?.[0];
  const poPrice = toNumber(po?.our_price?.[0]?.schedule?.[0]?.value_with_tax);
  if (Number.isFinite(poPrice) && poPrice > 0) {
    return { price: poPrice, currency: po?.currency ?? offer?.price?.currencyCode ?? "EUR" };
  }

  // 3) attributes.list_price[]
  const lp = item.attributes?.list_price?.[0];
  const lpPrice = toNumber(lp?.value);
  if (Number.isFinite(lpPrice) && lpPrice > 0) {
    return { price: lpPrice, currency: lp?.currency ?? "EUR" };
  }

  // Sin precio: lo importamos igualmente (priceCurrent 0) para que se vea.
  return { price: 0, currency: offer?.price?.currencyCode ?? po?.currency ?? "EUR" };
}

function normalize(item: ListingItem, marketplaceId: string): NormalizedListing | null {
  const sku = item.sku;
  if (!sku) return null; // SKU es la clave única; sin él no se puede operar.

  const summary =
    item.summaries?.find((s) => s.marketplaceId === marketplaceId) ?? item.summaries?.[0];
  const asin = item.asin ?? summary?.asin ?? "";

  const { price, currency } = extractPrice(item, marketplaceId);

  const title =
    summary?.itemName?.trim() ||
    item.attributes?.item_name?.[0]?.value?.trim() ||
    sku;

  return {
    asin,
    sku,
    title,
    imageUrl: summary?.mainImage?.link ?? null,
    productType: item.productType ?? null,
    priceCurrent: price,
    currency,
  };
}
