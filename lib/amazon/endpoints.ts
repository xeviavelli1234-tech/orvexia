export const SP_API_ENDPOINTS = {
  sandbox: { eu: "https://sandbox.sellingpartnerapi-eu.amazon.com" },
  production: { eu: "https://sellingpartnerapi-eu.amazon.com" },
} as const;

export const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";
export const LWA_AUTHORIZE_URL = "https://sellercentral-europe.amazon.com/apps/authorize/consent";

export const MARKETPLACE_IDS = {
  ES: "A1RKKUPIHCS9HS",
  FR: "A13V1IB3VIYZZH",
  DE: "A1PA6795UKMFR9",
  IT: "APJ6JRA9NG5V4",
  NL: "A1805IZSGTT6HS",
  BE: "AMEN7PMS3EDWL",
  PL: "A1C3SOZRARQ6R3",
  SE: "A2NODRKZP88ZB9",
  UK: "A1F83G8C2ARO7P",
} as const;

/** Marketplaces EU soportados (mismo endpoint sellingpartnerapi-eu). */
export const EU_MARKETPLACES: Array<{
  id: string;
  code: keyof typeof MARKETPLACE_IDS;
  label: string;
  currency: string;
}> = [
  { id: MARKETPLACE_IDS.ES, code: "ES", label: "España", currency: "EUR" },
  { id: MARKETPLACE_IDS.FR, code: "FR", label: "Francia", currency: "EUR" },
  { id: MARKETPLACE_IDS.DE, code: "DE", label: "Alemania", currency: "EUR" },
  { id: MARKETPLACE_IDS.IT, code: "IT", label: "Italia", currency: "EUR" },
  { id: MARKETPLACE_IDS.NL, code: "NL", label: "Países Bajos", currency: "EUR" },
  { id: MARKETPLACE_IDS.BE, code: "BE", label: "Bélgica", currency: "EUR" },
  { id: MARKETPLACE_IDS.PL, code: "PL", label: "Polonia", currency: "PLN" },
  { id: MARKETPLACE_IDS.SE, code: "SE", label: "Suecia", currency: "SEK" },
  { id: MARKETPLACE_IDS.UK, code: "UK", label: "Reino Unido", currency: "GBP" },
];

export const EU_MARKETPLACE_IDS = EU_MARKETPLACES.map((m) => m.id);

export type SpApiEnv = "sandbox" | "production";
export type SpApiRegion = "eu";

export function getSpApiBaseUrl(env: SpApiEnv, region: SpApiRegion = "eu"): string {
  return SP_API_ENDPOINTS[env][region];
}
