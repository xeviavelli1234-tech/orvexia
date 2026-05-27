import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isFixtureMode,
  getFixtureCompetitivePrice,
  getFixtureOffers,
  FIXTURE_LISTINGS,
} from "./fixtures-core";

const NOW = new Date("2026-05-26T12:00:00Z").getTime();
const OUR_SELLER = "ORX-TEST-SELLER";

// ── isFixtureMode ────────────────────────────────────────────────────────

test("isFixtureMode: 'production' → false", () => {
  assert.equal(isFixtureMode("production"), false);
});

test("isFixtureMode: 'sandbox' / vacío / cualquier otro → true", () => {
  assert.equal(isFixtureMode("sandbox"), true);
  assert.equal(isFixtureMode(""), true);
  assert.equal(isFixtureMode("staging"), true);
});

// ── FIXTURE_LISTINGS integrity ────────────────────────────────────────────

test("FIXTURE_LISTINGS son coherentes (4 SKUs únicos)", () => {
  assert.equal(FIXTURE_LISTINGS.length, 4);
  const skus = new Set(FIXTURE_LISTINGS.map((l) => l.sku));
  assert.equal(skus.size, 4, "no duplicar SKUs");
  const asins = new Set(FIXTURE_LISTINGS.map((l) => l.asin));
  assert.equal(asins.size, 4, "no duplicar ASINs");
});

test("FIXTURE_LISTINGS tienen precio positivo y currency válida", () => {
  for (const l of FIXTURE_LISTINGS) {
    assert.ok(l.priceCurrent > 0, `precio inválido para ${l.sku}`);
    assert.equal(l.currency, "EUR");
    assert.ok(l.asin.startsWith("B0"), `ASIN no parece ASIN para ${l.sku}`);
  }
});

// ── getFixtureCompetitivePrice ────────────────────────────────────────────

test("getFixtureCompetitivePrice es determinista para mismo asin+now", () => {
  const a = getFixtureCompetitivePrice("B0TEST01", 100, NOW);
  const b = getFixtureCompetitivePrice("B0TEST01", 100, NOW);
  assert.equal(a, b);
});

test("getFixtureCompetitivePrice varía entre asins diferentes", () => {
  const samples = new Set<number | null>();
  for (let i = 0; i < 20; i++) {
    samples.add(getFixtureCompetitivePrice(`B0VAR${i}`, 100, NOW));
  }
  assert.ok(samples.size > 3, "debería producir variedad entre ASINs");
});

test("getFixtureCompetitivePrice cae dentro de la franja ±12% (cuando no es null)", () => {
  for (let i = 0; i < 50; i++) {
    const p = getFixtureCompetitivePrice(`B0RNG${i}`, 100, NOW);
    if (p == null) continue;
    assert.ok(p >= 88 && p <= 108, `fuera de rango: ${p}`);
  }
});

test("getFixtureCompetitivePrice produce null en ~20% de ASINs", () => {
  let nulls = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    if (getFixtureCompetitivePrice(`B0PCT${i}`, 100, NOW) == null) nulls++;
  }
  // distribución por hash — esperamos entre 10% y 30%.
  const pct = (nulls / N) * 100;
  assert.ok(pct > 10 && pct < 35, `nulos = ${pct.toFixed(1)}%`);
});

test("getFixtureCompetitivePrice cambia entre ventanas de 5 min", () => {
  const t0 = NOW;
  const t1 = NOW + 6 * 60 * 1000; // 6 min después → ventana siguiente
  // Probamos varios ASINs para que al menos uno difiera.
  let diff = 0;
  for (let i = 0; i < 10; i++) {
    const asin = `B0WIN${i}`;
    if (
      getFixtureCompetitivePrice(asin, 100, t0) !==
      getFixtureCompetitivePrice(asin, 100, t1)
    ) {
      diff++;
    }
  }
  assert.ok(diff >= 3, "esperaba que la mayoría cambiaran entre ventanas");
});

// ── getFixtureOffers ──────────────────────────────────────────────────────

test("getFixtureOffers siempre incluye al menos una oferta nuestra", () => {
  for (let i = 0; i < 20; i++) {
    const offers = getFixtureOffers(`B0OUR${i}`, 100, OUR_SELLER, NOW);
    const ours = offers.find((o) => o.sellerId === OUR_SELLER);
    assert.ok(ours, `falta nuestra oferta en muestra ${i}`);
  }
});

test("getFixtureOffers marca exactamente UN ganador de Buy Box", () => {
  for (let i = 0; i < 20; i++) {
    const offers = getFixtureOffers(`B0BB${i}`, 100, OUR_SELLER, NOW);
    const winners = offers.filter((o) => o.isBuyBoxWinner);
    assert.equal(winners.length, 1, `ronda ${i}: esperaba 1 ganador`);
  }
});

test("getFixtureOffers: ganador de Buy Box tiene el precio más bajo", () => {
  for (let i = 0; i < 20; i++) {
    const offers = getFixtureOffers(`B0LOW${i}`, 100, OUR_SELLER, NOW);
    const winner = offers.find((o) => o.isBuyBoxWinner)!;
    const minPrice = Math.min(...offers.map((o) => o.price));
    assert.equal(winner.price, minPrice, `ronda ${i}`);
  }
});

test("getFixtureOffers a veces devuelve solo nuestra oferta (sin competencia)", () => {
  let alone = 0;
  for (let i = 0; i < 60; i++) {
    const offers = getFixtureOffers(`B0SOL${i}`, 100, OUR_SELLER, NOW);
    if (offers.length === 1 && offers[0].sellerId === OUR_SELLER) alone++;
  }
  // ~1 de cada 6 → ~16%. Margen amplio (5–35%).
  const pct = (alone / 60) * 100;
  assert.ok(pct > 5 && pct < 40, `solos = ${pct.toFixed(1)}%`);
});
