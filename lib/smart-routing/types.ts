export interface RoutingOfferInput {
  retailerName: string;
  affiliateUrl: string | null;
  price: number | null;
  commission?: number | null;
  inStock?: boolean | null;
  isActive?: boolean | null;
  trustWeight?: number | null;
  priorityWeight?: number | null;
  availabilityWeight?: number | null;
  lastUpdated?: Date | string | null;
}

export interface RetailerConfigOverride {
  commission?: number;
  isActive?: boolean;
  trustWeight?: number;
  priorityWeight?: number;
  availabilityWeight?: number;
}

export interface SmartRoutingConfig {
  fallbackRetailer: string;
  minimumValidPrice: number;
  maximumValidPrice: number;
  defaultCommission: number;
  defaultTrustWeight: number;
  defaultPriorityWeight: number;
  inStockWeight: number;
  outOfStockWeight: number;
  scoreWeights: {
    revenue: number;
    trust: number;
    availability: number;
    priority: number;
  };
  retailerOverrides: Record<string, RetailerConfigOverride>;
}

export interface ScoredRetailer {
  retailerName: string;
  affiliateUrl: string;
  price: number;
  commission: number;
  inStock: boolean;
  isActive: boolean;
  trustWeight: number;
  priorityWeight: number;
  availabilityWeight: number;
  lastUpdated: Date | null;
  score: number;
  debug: {
    expectedRevenue: number;
    multipliers: {
      trust: number;
      availability: number;
      priority: number;
    };
    reasons: string[];
  };
}

export interface SmartRoutingDecision {
  primary: ScoredRetailer | null;
  alternatives: ScoredRetailer[];
  reason: "scored" | "fallback" | "none";
  debug: {
    warnings: string[];
    evaluatedRetailers: number;
    validRetailers: number;
  };
}
