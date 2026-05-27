import type { RetailerConfigOverride, SmartRoutingConfig } from "./types";

const DEFAULT_CONFIG: SmartRoutingConfig = {
  fallbackRetailer: "amazon",
  minimumValidPrice: 1,
  maximumValidPrice: 50000,
  defaultCommission: 0.03,
  defaultTrustWeight: 1,
  defaultPriorityWeight: 1,
  inStockWeight: 1,
  outOfStockWeight: 0.15,
  scoreWeights: {
    revenue: 1,
    trust: 1,
    availability: 1,
    priority: 1,
  },
  retailerOverrides: {},
};

function normalizeRetailerName(value: string): string {
  return value.trim().toLowerCase();
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseRetailerOverrides(raw: string | undefined): Record<string, RetailerConfigOverride> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, RetailerConfigOverride>;
    return Object.entries(parsed).reduce<Record<string, RetailerConfigOverride>>((acc, [key, value]) => {
      const normalized = normalizeRetailerName(key);
      if (!normalized || !value || typeof value !== "object") return acc;
      acc[normalized] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function getSmartRoutingConfig(): SmartRoutingConfig {
  const overrides = parseRetailerOverrides(process.env.SMART_ROUTING_RETAILER_OVERRIDES_JSON);

  return {
    fallbackRetailer: normalizeRetailerName(
      process.env.SMART_ROUTING_FALLBACK_RETAILER ?? DEFAULT_CONFIG.fallbackRetailer,
    ),
    minimumValidPrice: toNumber(process.env.SMART_ROUTING_MIN_PRICE, DEFAULT_CONFIG.minimumValidPrice),
    maximumValidPrice: toNumber(process.env.SMART_ROUTING_MAX_PRICE, DEFAULT_CONFIG.maximumValidPrice),
    defaultCommission: toNumber(process.env.SMART_ROUTING_DEFAULT_COMMISSION, DEFAULT_CONFIG.defaultCommission),
    defaultTrustWeight: toNumber(process.env.SMART_ROUTING_DEFAULT_TRUST_WEIGHT, DEFAULT_CONFIG.defaultTrustWeight),
    defaultPriorityWeight: toNumber(
      process.env.SMART_ROUTING_DEFAULT_PRIORITY_WEIGHT,
      DEFAULT_CONFIG.defaultPriorityWeight,
    ),
    inStockWeight: toNumber(process.env.SMART_ROUTING_IN_STOCK_WEIGHT, DEFAULT_CONFIG.inStockWeight),
    outOfStockWeight: toNumber(process.env.SMART_ROUTING_OUT_OF_STOCK_WEIGHT, DEFAULT_CONFIG.outOfStockWeight),
    scoreWeights: {
      revenue: toNumber(process.env.SMART_ROUTING_SCORE_REVENUE_WEIGHT, DEFAULT_CONFIG.scoreWeights.revenue),
      trust: toNumber(process.env.SMART_ROUTING_SCORE_TRUST_WEIGHT, DEFAULT_CONFIG.scoreWeights.trust),
      availability: toNumber(
        process.env.SMART_ROUTING_SCORE_AVAILABILITY_WEIGHT,
        DEFAULT_CONFIG.scoreWeights.availability,
      ),
      priority: toNumber(process.env.SMART_ROUTING_SCORE_PRIORITY_WEIGHT, DEFAULT_CONFIG.scoreWeights.priority),
    },
    retailerOverrides: overrides,
  };
}

export { normalizeRetailerName };
