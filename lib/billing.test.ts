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

test("plan único Pro — ignora el volumen", () => {
  // Da igual cuántos SKUs tenga el catálogo: siempre el mismo plan a 19 €.
  assert.equal(tierForSkuCount(0).id, "pro");
  assert.equal(tierForSkuCount(50).id, "pro");
  assert.equal(tierForSkuCount(5_000).id, "pro");
  assert.equal(tierForSkuCount(-5).id, "pro");
  assert.equal(tierForSkuCount(NaN).id, "pro");
});

test("priceForSkuCount: 19 € sea cual sea el catálogo", () => {
  assert.equal(priceForSkuCount(10), 19);
  assert.equal(priceForSkuCount(120), 19);
  assert.equal(priceForSkuCount(5000), 19);
});

test("PRICE_TIERS tiene un solo elemento (plan único)", () => {
  assert.equal(PRICE_TIERS.length, 1);
  assert.equal(PRICE_TIERS[0].priceEur, 19);
  assert.equal(PRICE_TIERS[0].maxSkus, Infinity);
});

// ── repricingActiveLimit ─────────────────────────────────────────────────

test("repricingActiveLimit: TRIAL siempre 50 activos máx, ignora catálogo", () => {
  assert.equal(repricingActiveLimit("TRIAL", 5), TRIAL_ACTIVE_LIMIT);
  assert.equal(repricingActiveLimit("TRIAL", 500), TRIAL_ACTIVE_LIMIT);
  assert.equal(repricingActiveLimit("TRIAL", 50_000), TRIAL_ACTIVE_LIMIT);
});

test("repricingActiveLimit: PRO sin límite (Infinity), independiente del catálogo", () => {
  assert.equal(repricingActiveLimit("PRO", 0), Infinity);
  assert.equal(repricingActiveLimit("PRO", 30), Infinity);
  assert.equal(repricingActiveLimit("PRO", 5000), Infinity);
});
