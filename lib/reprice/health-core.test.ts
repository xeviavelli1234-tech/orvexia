import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateHealth,
  generateSuggestions,
  type ListingSnapshot,
} from "./health-core";

const baseListing: ListingSnapshot = {
  id: "1",
  sku: "TEST-1",
  title: "Test",
  priceCurrent: 100,
  priceMin: 80,
  priceMax: 130,
  cost: 60,
  repricingEnabled: true,
  autoPausedAt: null,
  manualPriceDetected: false,
  buyBoxStatus: "WON",
  lastBuyBoxLossStreak: 0,
  daysSinceLastReprice: 1,
  daysSinceLastBuyBoxWon: 0,
  daysAtPriceFloor: 0,
  consecutiveErrors: 0,
  asinValid: true,
};

test("calculateHealth: catálogo perfecto → A 100", () => {
  const r = calculateHealth([{ ...baseListing }]);
  assert.equal(r.score, 100);
  assert.equal(r.letter, "A");
  assert.equal(r.breakdown.active, 100);
  assert.equal(r.breakdown.configured, 100);
});

test("calculateHealth: catálogo vacío → 0 / F", () => {
  const r = calculateHealth([]);
  assert.equal(r.score, 0);
  assert.equal(r.letter, "F");
});

test("calculateHealth: sin coste baja el score", () => {
  const withCost = calculateHealth([{ ...baseListing }]);
  const noCost = calculateHealth([{ ...baseListing, cost: null }]);
  assert.ok(noCost.score < withCost.score);
});

test("calculateHealth: autopausa cuenta como insano", () => {
  const r = calculateHealth([
    { ...baseListing, autoPausedAt: new Date(), repricingEnabled: false },
  ]);
  assert.equal(r.breakdown.healthy, 0);
  assert.equal(r.breakdown.byBucket.autopaused, 1);
});

test("generateSuggestions: sin rango → warn 'no_range'", () => {
  const s = generateSuggestions([
    { ...baseListing, priceMin: null, priceMax: null },
  ]);
  assert.ok(s.some((x) => x.kind === "no_range" && x.severity === "warn"));
});

test("generateSuggestions: autopausa → severity critical y va primero", () => {
  const s = generateSuggestions([
    { ...baseListing, autoPausedAt: new Date() },
    { ...baseListing, id: "2", sku: "T-2", cost: null },
  ]);
  assert.equal(s[0].severity, "critical");
  assert.equal(s[0].kind, "auto_paused");
});

test("generateSuggestions: días en mínimo dispara warn 'stuck_at_floor'", () => {
  const s = generateSuggestions([
    { ...baseListing, daysAtPriceFloor: 7 },
  ]);
  assert.ok(s.some((x) => x.kind === "stuck_at_floor"));
});

test("generateSuggestions: precio manual detectado → warn", () => {
  const s = generateSuggestions([
    { ...baseListing, manualPriceDetected: true },
  ]);
  assert.ok(s.some((x) => x.kind === "manual_price"));
});

test("generateSuggestions: sincronización antigua → warn global", () => {
  const s = generateSuggestions([baseListing], { lastSyncAgeHours: 96 });
  assert.ok(s.some((x) => x.kind === "stale_sync"));
});

test("generateSuggestions: ordena critical > warn > info", () => {
  const s = generateSuggestions([
    { ...baseListing, autoPausedAt: new Date() },
    { ...baseListing, id: "2", sku: "T-2", priceMin: null, priceMax: null },
    { ...baseListing, id: "3", sku: "T-3", cost: null },
  ]);
  const sevs = s.map((x) => x.severity);
  // Verificamos que el primer crítico precede a los warn, y los warn a los info.
  const crit = sevs.indexOf("critical");
  const warn = sevs.indexOf("warn");
  const info = sevs.indexOf("info");
  if (crit !== -1 && warn !== -1) assert.ok(crit < warn);
  if (warn !== -1 && info !== -1) assert.ok(warn < info);
});
