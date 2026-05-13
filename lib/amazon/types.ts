export interface LwaTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface LwaRefreshResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface SpApiListingItem {
  asin: string;
  sku: string;
  productType?: string;
  attributes?: Record<string, unknown>;
  summaries?: Array<{
    marketplaceId: string;
    asin?: string;
    itemName?: string;
    mainImage?: { link: string };
  }>;
  offers?: Array<{
    marketplaceId: string;
    offerType: string;
    price: { amount: number; currencyCode: string };
  }>;
}

export interface SpApiCompetitivePrice {
  ASIN: string;
  status: string;
  Product?: {
    CompetitivePricing?: {
      CompetitivePrices?: Array<{
        CompetitivePriceId: string;
        Price: {
          LandedPrice: { Amount: number; CurrencyCode: string };
          ListingPrice: { Amount: number; CurrencyCode: string };
        };
      }>;
    };
  };
}

export class SpApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "SpApiError";
  }
}

export class LwaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "LwaError";
  }
}
