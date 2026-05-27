import test from "node:test";
import assert from "node:assert/strict";
import { selectBestRetailer } from "./selectBestRetailer";
import type { RoutingOfferInput, SmartRoutingConfig } from "./types";

const baseConfig: SmartRoutingConfig = {
  fallbackRetailer: "amazon",
  minimumValidPrice: 1,
  maximumValidPrice: 10000,
  defaultCommission: 0.03,
  defaultTrustWeight: 1,
  defaultPriorityWeight: 1,
  inStockWeight: 1,
  outOfStockWeight: 0.1,
  scoreWeights: { revenue: 1, trust: 1, availability: 1, priority: 1 },
  retailerOverrides: {},
};

test("selects highest score among valid retailers", () => {
  const offers: RoutingOfferInput[] = [
    { retailerName: "Amazon", affiliateUrl: "https://a", price: 500, commission: 0.03, inStock: true },
    { retailerName: "Fnac", affiliateUrl: "https://f", price: 490, commission: 0.06, inStock: true },
  ];
  const decision = selectBestRetailer(offers, baseConfig);

  assert.equal(decision.reason, "scored");
  assert.equal(decision.primary?.retailerName, "Fnac");
  assert.equal(decision.alternatives.length, 1);
});

test("filters out retailers that are out of stock and inactive via config override", () => {
  const decision = selectBestRetailer(
    [
      { retailerName: "Amazon", affiliateUrl: "https://a", price: 500, commission: 0.03, inStock: false },
      { retailerName: "LG", affiliateUrl: "https://l", price: 540, commission: 0.07, inStock: true },
    ],
    {
      ...baseConfig,
      retailerOverrides: {
        lg: { isActive: false },
      },
      outOfStockWeight: 0,
    },
  );

  assert.equal(decision.reason, "none");
  assert.equal(decision.primary, null);
});

test("uses defaults for missing data and still returns a valid winner", () => {
  const decision = selectBestRetailer(
    [
      { retailerName: "Amazon", affiliateUrl: "https://a", price: 300, inStock: true },
      { retailerName: "Fnac", affiliateUrl: "https://f", price: 280, inStock: true },
    ],
    baseConfig,
  );

  assert.equal(decision.primary?.retailerName, "Amazon");
});

test("uses fallback retailer when no candidate can be scored", () => {
  const decision = selectBestRetailer(
    [
      { retailerName: "Fnac", affiliateUrl: "https://fnac", price: 500, inStock: false, availabilityWeight: 0 },
      { retailerName: "Amazon", affiliateUrl: "https://amazon", price: 400, inStock: false, availabilityWeight: 0 },
    ],
    {
      ...baseConfig,
      fallbackRetailer: "amazon",
      outOfStockWeight: 0,
    },
  );

  assert.equal(decision.reason, "fallback");
  assert.equal(decision.primary?.retailerName, "Amazon");
});

test("resolves ties using manual priority weight", () => {
  const offers: RoutingOfferInput[] = [
    { retailerName: "Amazon", affiliateUrl: "https://a", price: 200, commission: 0.05, trustWeight: 1, priorityWeight: 1 },
    { retailerName: "Fnac", affiliateUrl: "https://f", price: 200, commission: 0.05, trustWeight: 1, priorityWeight: 1.4 },
  ];
  const decision = selectBestRetailer(offers, baseConfig);

  assert.equal(decision.primary?.retailerName, "Fnac");
});
