import { getSmartRoutingConfig, normalizeRetailerName } from "./config";
import type { RoutingOfferInput, ScoredRetailer, SmartRoutingDecision, SmartRoutingConfig } from "./types";

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasValidUrl(url: string | null): url is string {
  return typeof url === "string" && url.trim().length > 0;
}

function buildScoredRetailer(offer: RoutingOfferInput, config: SmartRoutingConfig): ScoredRetailer | null {
  const retailerKey = normalizeRetailerName(offer.retailerName);
  const override = config.retailerOverrides[retailerKey];

  if (!hasValidUrl(offer.affiliateUrl)) return null;
  if (typeof offer.price !== "number" || !Number.isFinite(offer.price)) return null;
  if (offer.price < config.minimumValidPrice || offer.price > config.maximumValidPrice) return null;

  const commission = override?.commission ?? offer.commission ?? config.defaultCommission;
  const trustWeight = override?.trustWeight ?? offer.trustWeight ?? config.defaultTrustWeight;
  const priorityWeight = override?.priorityWeight ?? offer.priorityWeight ?? config.defaultPriorityWeight;
  const isActive = override?.isActive ?? offer.isActive ?? true;
  const inStock = offer.inStock ?? true;
  const availabilityWeight =
    override?.availabilityWeight ??
    offer.availabilityWeight ??
    (inStock ? config.inStockWeight : config.outOfStockWeight);

  if (!isActive) return null;

  const expectedRevenue = offer.price * commission;
  const weightedRevenue = expectedRevenue * config.scoreWeights.revenue;
  const weightedTrust = trustWeight * config.scoreWeights.trust;
  const weightedAvailability = availabilityWeight * config.scoreWeights.availability;
  const weightedPriority = priorityWeight * config.scoreWeights.priority;
  const score = weightedRevenue * weightedTrust * weightedAvailability * weightedPriority;

  if (!Number.isFinite(score) || score <= 0) return null;

  return {
    retailerName: offer.retailerName,
    affiliateUrl: offer.affiliateUrl,
    price: offer.price,
    commission,
    inStock,
    isActive,
    trustWeight,
    priorityWeight,
    availabilityWeight,
    lastUpdated: parseDate(offer.lastUpdated),
    score,
    debug: {
      expectedRevenue,
      multipliers: {
        trust: weightedTrust,
        availability: weightedAvailability,
        priority: weightedPriority,
      },
      reasons: [],
    },
  };
}

function compareRetailers(a: ScoredRetailer, b: ScoredRetailer): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.priorityWeight !== a.priorityWeight) return b.priorityWeight - a.priorityWeight;
  if (a.price !== b.price) return a.price - b.price;
  return a.retailerName.localeCompare(b.retailerName);
}

function resolveFallback(
  offers: RoutingOfferInput[],
  config: SmartRoutingConfig,
): ScoredRetailer | null {
  const fallbackKey = normalizeRetailerName(config.fallbackRetailer);
  const fallbackOffer = offers.find(
    (offer) =>
      normalizeRetailerName(offer.retailerName) === fallbackKey &&
      hasValidUrl(offer.affiliateUrl) &&
      typeof offer.price === "number" &&
      Number.isFinite(offer.price),
  );

  if (!fallbackOffer) return null;
  const override = config.retailerOverrides[fallbackKey];
  const inStock = fallbackOffer.inStock ?? true;
  const availabilityWeight =
    override?.availabilityWeight ??
    fallbackOffer.availabilityWeight ??
    (inStock ? config.inStockWeight : config.outOfStockWeight);
  const commission = override?.commission ?? fallbackOffer.commission ?? config.defaultCommission;
  const trustWeight = override?.trustWeight ?? fallbackOffer.trustWeight ?? config.defaultTrustWeight;
  const priorityWeight = override?.priorityWeight ?? fallbackOffer.priorityWeight ?? config.defaultPriorityWeight;
  const expectedRevenue = fallbackOffer.price! * commission;
  const score = Math.max(
    expectedRevenue *
      trustWeight *
      availabilityWeight *
      priorityWeight *
      config.scoreWeights.revenue *
      config.scoreWeights.trust *
      config.scoreWeights.availability *
      config.scoreWeights.priority,
    0.0001,
  );

  return {
    retailerName: fallbackOffer.retailerName,
    affiliateUrl: fallbackOffer.affiliateUrl!,
    price: fallbackOffer.price!,
    commission,
    inStock,
    isActive: override?.isActive ?? fallbackOffer.isActive ?? true,
    trustWeight,
    priorityWeight,
    availabilityWeight,
    lastUpdated: parseDate(fallbackOffer.lastUpdated),
    score,
    debug: {
      expectedRevenue,
      multipliers: {
        trust: trustWeight,
        availability: availabilityWeight,
        priority: priorityWeight,
      },
      reasons: ["fallback retailer selected"],
    },
  };
}

export function selectBestRetailer(
  offers: RoutingOfferInput[],
  config: SmartRoutingConfig = getSmartRoutingConfig(),
): SmartRoutingDecision {
  const warnings: string[] = [];

  if (!Array.isArray(offers) || offers.length === 0) {
    return {
      primary: null,
      alternatives: [],
      reason: "none",
      debug: { warnings: ["no retailers provided"], evaluatedRetailers: 0, validRetailers: 0 },
    };
  }

  const scored = offers
    .map((offer) => {
      const candidate = buildScoredRetailer(offer, config);
      if (!candidate) {
        warnings.push(`retailer skipped: ${offer.retailerName}`);
      }
      return candidate;
    })
    .filter((candidate): candidate is ScoredRetailer => candidate !== null)
    .sort(compareRetailers);

  if (scored.length > 0) {
    scored[0].debug.reasons.push("highest score selected");
    return {
      primary: scored[0],
      alternatives: scored.slice(1),
      reason: "scored",
      debug: {
        warnings,
        evaluatedRetailers: offers.length,
        validRetailers: scored.length,
      },
    };
  }

  // Si había candidatos in-stock pero el operador los deshabilitó
  // explícitamente con `isActive: false` en config.retailerOverrides,
  // respetamos esa decisión y NO recurrimos al fallback: el operador
  // probablemente sabe algo que el motor de scoring no (suspensión
  // temporal, problema de pago, etc.).
  const hasExplicitlyDisabledInStock = offers.some((offer) => {
    const inStock = offer.inStock ?? true;
    if (!inStock) return false;
    const key = normalizeRetailerName(offer.retailerName);
    return config.retailerOverrides[key]?.isActive === false;
  });
  if (hasExplicitlyDisabledInStock) {
    warnings.push(
      "in-stock retailers exist but are explicitly disabled via config; fallback skipped to honor operator intent",
    );
    return {
      primary: null,
      alternatives: [],
      reason: "none",
      debug: {
        warnings,
        evaluatedRetailers: offers.length,
        validRetailers: 0,
      },
    };
  }

  const fallback = resolveFallback(offers, config);
  if (fallback) {
    warnings.push("scoring returned no valid retailers, fallback applied");
    return {
      primary: fallback,
      alternatives: [],
      reason: "fallback",
      debug: {
        warnings,
        evaluatedRetailers: offers.length,
        validRetailers: 1,
      },
    };
  }

  warnings.push("no valid retailer or fallback available");
  return {
    primary: null,
    alternatives: [],
    reason: "none",
    debug: {
      warnings,
      evaluatedRetailers: offers.length,
      validRetailers: 0,
    },
  };
}
