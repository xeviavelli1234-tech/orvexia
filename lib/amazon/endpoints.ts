export const SP_API_ENDPOINTS = {
  sandbox: { eu: "https://sandbox.sellingpartnerapi-eu.amazon.com" },
  production: { eu: "https://sellingpartnerapi-eu.amazon.com" },
} as const;

export const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";
export const LWA_AUTHORIZE_URL = "https://sellercentral-europe.amazon.com/apps/authorize/consent";

export const MARKETPLACE_IDS = {
  ES: "A1RKKUPIHCS9HS",
} as const;

export type SpApiEnv = "sandbox" | "production";
export type SpApiRegion = "eu";

export function getSpApiBaseUrl(env: SpApiEnv, region: SpApiRegion = "eu"): string {
  return SP_API_ENDPOINTS[env][region];
}
