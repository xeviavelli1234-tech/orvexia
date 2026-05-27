import { test } from "node:test";
import assert from "node:assert/strict";
import {
  intervalForPlan,
  trialDaysLeft,
  isTrialExpired,
  isRepricingAllowed,
  getBillingState,
  tierForSkuCount,
  priceForSkuCount,
  repricingActiveLimit,
  TRIAL_ACTIVE_LIMIT,
  PRICE_TIERS,
} from "./billing";

const NOW = new Date("2026-05-15T12:00:00Z");
const inDays = (d: number) => new Date(NOW.getTime() + d * 86400000);

test("intervalo por plan", () => {
  assert.equal(intervalForPlan("TRIAL"), 900);
  assert.equal(intervalForPlan("PRO"), 300);
});

test("días de trial restantes redondea hacia arriba", () => {
  assert.equal(trialDaysLeft(inDays(13.2), NOW), 14);
  assert.equal(trialDaysLeft(inDays(0.1), NOW), 1);
  assert.equal(trialDaysLeft(inDays(-1), NOW), 0);
  assert.equal(trialDaysLeft(null, NOW), 0);
});

test("trial expirado", () => {
  assert.equal(isTrialExpired("TRIAL", inDays(-1), NOW), true);
  assert.equal(isTrialExpired("TRIAL", inDays(3), NOW), false);
  assert.equal(isTrialExpired("TRIAL", null, NOW), false);
});

test("PRO nunca expira aunque trialEndsAt sea pasado", () => {
  assert.equal(isTrialExpired("PRO", inDays(-100), NOW), false);
  assert.equal(isRepricingAllowed("PRO", inDays(-100), NOW), true);
});

test("reprecio no permitido con trial expirado", () => {
  assert.equal(isRepricingAllowed("TRIAL", inDays(-1), NOW), false);
  assert.equal(isRepricingAllowed("TRIAL", inDays(2), NOW), true);
});

test("getBillingState coherente — trial activo", () => {
  const s = getBillingState("TRIAL", inDays(10), NOW);
  assert.equal(s.plan, "TRIAL");
  assert.equal(s.trialExpired, false);
  assert.equal(s.repricingAllowed, true);
  assert.equal(s.trialDaysLeft, 10);
  assert.equal(s.intervalMinutes, 15);
});

test("getBillingState coherente — PRO", () => {
  const s = getBillingState("PRO", null, NOW);
  assert.equal(s.label, "Pro");
  assert.equal(s.repricingAllowed, true);
  assert.equal(s.intervalMinutes, 5);
});

test("getBillingState coherente — trial expirado", () => {
  const s = getBillingState("TRIAL", inDays(-2), NOW);
  assert.equal(s.trialExpired, true);
  assert.equal(s.repricingAllowed, false);
  assert.equal(s.trialDaysLeft, 0);
});

test("tramo por volumen de SKUs (límites inclusivos)", () => {
  assert.equal(tierForSkuCount(0).id, "starter");
  assert.equal(tierForSkuCount(50).id, "starter");
  assert.equal(tierForSkuCount(51).id, "growth");
  assert.equal(tierForSkuCount(200).id, "growth");
  assert.equal(tierForSkuCount(201).id, "scale");
  assert.equal(tierForSkuCount(1000).id, "scale");
  assert.equal(tierForSkuCount(1001).id, "unlimited");
});

test("priceForSkuCount por tramo y bordes inválidos", () => {
  assert.equal(priceForSkuCount(10), 29);
  assert.equal(priceForSkuCount(120), 49);
  assert.equal(priceForSkuCount(500), 99);
  assert.equal(priceForSkuCount(5000), 149);
  assert.equal(tierForSkuCount(-5).id, "starter");
  assert.equal(tierForSkuCount(NaN).id, "starter");
});

test("tramos crecientes en SKUs y precio", () => {
  for (let i = 1; i < PRICE_TIERS.length; i++) {
    assert.ok(PRICE_TIERS[i].maxSkus > PRICE_TIERS[i - 1].maxSkus);
    assert.ok(PRICE_TIERS[i].priceEur > PRICE_TIERS[i - 1].priceEur);
  }
});

// ── repricingActiveLimit ─────────────────────────────────────────────────

test("repricingActiveLimit: TRIAL siempre 50 activos máx, ignora catálogo", () => {
  assert.equal(repricingActiveLimit("TRIAL", 5), TRIAL_ACTIVE_LIMIT);
  assert.equal(repricingActiveLimit("TRIAL", 500), TRIAL_ACTIVE_LIMIT);
  assert.equal(repricingActiveLimit("TRIAL", 50_000), TRIAL_ACTIVE_LIMIT);
});

test("repricingActiveLimit: PRO usa el tier por catálogo", () => {
  // Catálogo de 30 SKUs → starter (50).
  assert.equal(repricingActiveLimit("PRO", 30), 50);
  // 120 SKUs → growth (200).
  assert.equal(repricingActiveLimit("PRO", 120), 200);
  // 500 SKUs → scale (1000).
  assert.equal(repricingActiveLimit("PRO", 500), 1000);
  // 5000 SKUs → unlimited (Infinity).
  assert.equal(repricingActiveLimit("PRO", 5000), Infinity);
});

test("repricingActiveLimit: PRO con catálogo 0 → starter 50", () => {
  // Un PRO recién suscrito sin productos sigue teniendo 50 disponibles.
  assert.equal(repricingActiveLimit("PRO", 0), 50);
});
