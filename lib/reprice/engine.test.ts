import { test } from "node:test";
import assert from "node:assert/strict";
import { computeNewPrice } from "./engine";

test("competidor dentro de rango → nos ponemos 0,01 por debajo", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 80,
    priceMax: 120,
    competitorPrice: 95,
  });
  assert.equal(r.newPrice, 94.99);
  assert.equal(r.changed, true);
  assert.equal(r.reason, "competitor_undercut");
});

test("competidor por debajo del mínimo → suelo (min_floor)", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 90,
    priceMax: 120,
    competitorPrice: 70, // 70 - 0.01 = 69.99 < 90
  });
  assert.equal(r.newPrice, 90);
  assert.equal(r.reason, "min_floor");
  assert.equal(r.changed, true);
});

test("competidor por encima del máximo → techo (max_ceiling)", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 80,
    priceMax: 110,
    competitorPrice: 200, // 199.99 > 110
  });
  assert.equal(r.newPrice, 110);
  assert.equal(r.reason, "max_ceiling");
});

test("sin competencia → subimos al máximo", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 80,
    priceMax: 130,
    competitorPrice: null,
  });
  assert.equal(r.newPrice, 130);
  assert.equal(r.reason, "no_competition");
  assert.equal(r.changed, true);
});

test("sin competencia y ya en el máximo → no_change", () => {
  const r = computeNewPrice({
    priceCurrent: 130,
    priceMin: 80,
    priceMax: 130,
    competitorPrice: null,
  });
  assert.equal(r.newPrice, 130);
  assert.equal(r.changed, false);
  assert.equal(r.reason, "no_change");
});

test("precio óptimo ya es el actual → no_change", () => {
  const r = computeNewPrice({
    priceCurrent: 94.99,
    priceMin: 80,
    priceMax: 120,
    competitorPrice: 95,
  });
  assert.equal(r.newPrice, 94.99);
  assert.equal(r.changed, false);
  assert.equal(r.reason, "no_change");
});

test("redondeo a céntimos correcto", () => {
  const r = computeNewPrice({
    priceCurrent: 50,
    priceMin: 10,
    priceMax: 100,
    competitorPrice: 33.333,
  });
  assert.equal(r.newPrice, 33.32);
});

test("undercutBy personalizado", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 50,
    priceMax: 150,
    competitorPrice: 90,
    undercutBy: 1,
  });
  assert.equal(r.newPrice, 89);
});

test("rango inválido (min > max) → no toca nada", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 120,
    priceMax: 80,
    competitorPrice: 95,
  });
  assert.equal(r.newPrice, 100);
  assert.equal(r.changed, false);
  assert.equal(r.reason, "no_change");
});

test("min/max no positivos → no toca nada", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 0,
    priceMax: 120,
    competitorPrice: 95,
  });
  assert.equal(r.changed, false);
});

test("competidor exactamente en el mínimo + undercut → cae a min_floor", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 95,
    priceMax: 120,
    competitorPrice: 95, // 94.99 < 95
  });
  assert.equal(r.newPrice, 95);
  assert.equal(r.reason, "min_floor");
});

// ── Estrategias ──────────────────────────────────────────────

test("MATCH → iguala al competidor", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 80,
    priceMax: 120,
    competitorPrice: 95,
    strategy: "MATCH",
  });
  assert.equal(r.newPrice, 95);
  assert.equal(r.reason, "competitor_match");
});

test("undercut PERCENT → 2% por debajo del competidor", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 50,
    priceMax: 150,
    competitorPrice: 100,
    strategy: "BUYBOX",
    undercutType: "PERCENT",
    undercutValue: 2,
  });
  assert.equal(r.newPrice, 98);
  assert.equal(r.reason, "competitor_undercut");
});

test("FIXED → precio fijo, ignora competencia", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 50,
    priceMax: 150,
    competitorPrice: 70,
    strategy: "FIXED",
    fixedPrice: 119.9,
  });
  assert.equal(r.newPrice, 119.9);
  assert.equal(r.reason, "fixed_price");
});

test("FIXED se acota al techo", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 50,
    priceMax: 110,
    competitorPrice: null,
    strategy: "FIXED",
    fixedPrice: 999,
  });
  assert.equal(r.newPrice, 110);
  assert.equal(r.reason, "max_ceiling");
});

test("MARGIN → no baja por debajo del suelo de beneficio", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 40,
    priceMax: 150,
    competitorPrice: 60, // 59.99 pero marginFloor 75
    strategy: "MARGIN",
    marginFloor: 75,
  });
  assert.equal(r.newPrice, 75);
  assert.equal(r.reason, "margin_floor");
});

test("MARGIN con competidor alto → undercut normal (no toca suelo)", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 40,
    priceMax: 150,
    competitorPrice: 120,
    strategy: "MARGIN",
    marginFloor: 75,
  });
  assert.equal(r.newPrice, 119.99);
  assert.equal(r.reason, "competitor_undercut");
});

test("sin competencia + HOLD → no_change", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 80,
    priceMax: 130,
    competitorPrice: null,
    noCompetition: "HOLD",
  });
  assert.equal(r.changed, false);
  assert.equal(r.reason, "no_change");
});

test("sin competencia + STEP_UP (importe) → sube un paso, no salta al máximo", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 80,
    priceMax: 130,
    competitorPrice: null,
    noCompetition: "STEP_UP",
    stepUpType: "AMOUNT",
    stepUpValue: 2,
  });
  assert.equal(r.newPrice, 102);
  assert.equal(r.changed, true);
  assert.equal(r.reason, "step_up");
});

test("sin competencia + STEP_UP (porcentaje) → sube ese % del precio actual", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 80,
    priceMax: 130,
    competitorPrice: null,
    noCompetition: "STEP_UP",
    stepUpType: "PERCENT",
    stepUpValue: 5,
  });
  assert.equal(r.newPrice, 105);
  assert.equal(r.reason, "step_up");
});

test("STEP_UP no supera el máximo (se acota al techo)", () => {
  const r = computeNewPrice({
    priceCurrent: 129,
    priceMin: 80,
    priceMax: 130,
    competitorPrice: null,
    noCompetition: "STEP_UP",
    stepUpType: "AMOUNT",
    stepUpValue: 5,
  });
  assert.equal(r.newPrice, 130);
  assert.equal(r.reason, "max_ceiling");
});

test("STEP_UP ya en el máximo → no_change", () => {
  const r = computeNewPrice({
    priceCurrent: 130,
    priceMin: 80,
    priceMax: 130,
    competitorPrice: null,
    noCompetition: "STEP_UP",
    stepUpValue: 3,
  });
  assert.equal(r.changed, false);
  assert.equal(r.reason, "no_change");
});

// ── BUYBOX_WINNER ───────────────────────────────────────────────

test("BUYBOX_WINNER → undercut sobre el precio de la Buy Box, no del más barato", () => {
  // Hay un competidor más barato (80) pero la Buy Box está a 95: competimos contra 95.
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 70,
    priceMax: 120,
    competitorPrice: 80,
    buyBoxPrice: 95,
    strategy: "BUYBOX_WINNER",
  });
  assert.equal(r.newPrice, 94.99);
  assert.equal(r.reason, "competitor_undercut");
});

test("BUYBOX_WINNER sin buyBoxPrice → fallback al competidor más barato", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 70,
    priceMax: 120,
    competitorPrice: 90,
    buyBoxPrice: null,
    strategy: "BUYBOX_WINNER",
  });
  assert.equal(r.newPrice, 89.99);
  assert.equal(r.reason, "competitor_undercut");
});

test("BUYBOX_WINNER sin Buy Box ni competidor → no_competition", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 70,
    priceMax: 120,
    competitorPrice: null,
    buyBoxPrice: null,
    strategy: "BUYBOX_WINNER",
  });
  assert.equal(r.newPrice, 120);
  assert.equal(r.reason, "no_competition");
});

// ── Histéresis (anti-flapping) ─────────────────────────────────

test("histéresis por € → cambio inferior al umbral se descarta", () => {
  // El motor querría bajar 0,01 € (de 100 a 99,99) pero el umbral son 0,05 €.
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 50,
    priceMax: 150,
    competitorPrice: 100, // 100 - 0.01 = 99.99 → delta 0.01 < 0.05
    minChangeAmount: 0.05,
  });
  assert.equal(r.newPrice, 100);
  assert.equal(r.changed, false);
  assert.equal(r.reason, "below_threshold");
});

test("histéresis por % → cambio inferior al % se descarta", () => {
  // Cambio propuesto: 99,99. Delta 0,01. Umbral: 0,5% de 100 = 0,5 €.
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 50,
    priceMax: 150,
    competitorPrice: 100,
    minChangePct: 0.5,
  });
  assert.equal(r.changed, false);
  assert.equal(r.reason, "below_threshold");
});

test("histéresis NO se aplica si la razón es dura (min_floor)", () => {
  // El motor toca suelo: aunque el delta sea pequeño, hay que aplicarlo
  // porque el suelo es una protección del usuario.
  const r = computeNewPrice({
    priceCurrent: 100.01,
    priceMin: 100,
    priceMax: 150,
    competitorPrice: 50, // querría caer muy abajo → topa con 100
    minChangeAmount: 1, // umbral grande
  });
  assert.equal(r.newPrice, 100);
  assert.equal(r.reason, "min_floor");
  assert.equal(r.changed, true);
});

test("histéresis: cambio por encima del umbral se aplica normal", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 50,
    priceMax: 150,
    competitorPrice: 90, // 89.99 → delta ~10
    minChangeAmount: 0.05,
    minChangePct: 0.5,
  });
  assert.equal(r.newPrice, 89.99);
  assert.equal(r.reason, "competitor_undercut");
});

// ── Freno por guerra de precios ─────────────────────────────────

test("priceWarLocked → salta al suelo con razón price_war", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 70,
    priceMax: 150,
    competitorPrice: 60,
    priceWarLocked: true,
  });
  assert.equal(r.newPrice, 70);
  assert.equal(r.reason, "price_war");
  assert.equal(r.changed, true);
});

test("priceWarLocked usa marginFloor cuando es superior al mínimo", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 50,
    priceMax: 150,
    competitorPrice: 60,
    strategy: "MARGIN",
    marginFloor: 80,
    priceWarLocked: true,
  });
  assert.equal(r.newPrice, 80);
  assert.equal(r.reason, "price_war");
});

test("priceWarLocked y ya estamos en el suelo → no_change", () => {
  const r = computeNewPrice({
    priceCurrent: 70,
    priceMin: 70,
    priceMax: 150,
    competitorPrice: 60,
    priceWarLocked: true,
  });
  assert.equal(r.changed, false);
  assert.equal(r.reason, "no_change");
});

// ── STEP_UP geométrico (multiplicador) ─────────────────────────

test("STEP_UP con stepUpMult=4 → cuadruplica el paso", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 80,
    priceMax: 150,
    competitorPrice: null,
    noCompetition: "STEP_UP",
    stepUpType: "AMOUNT",
    stepUpValue: 1,
    stepUpMult: 4,
  });
  assert.equal(r.newPrice, 104);
  assert.equal(r.reason, "step_up");
});

test("STEP_UP mult invalida (<1) → tratado como 1", () => {
  const r = computeNewPrice({
    priceCurrent: 100,
    priceMin: 80,
    priceMax: 150,
    competitorPrice: null,
    noCompetition: "STEP_UP",
    stepUpType: "AMOUNT",
    stepUpValue: 2,
    stepUpMult: 0.5,
  });
  assert.equal(r.newPrice, 102);
});

test("STEP_UP mult acelerado se acota igualmente al techo", () => {
  const r = computeNewPrice({
    priceCurrent: 128,
    priceMin: 80,
    priceMax: 130,
    competitorPrice: null,
    noCompetition: "STEP_UP",
    stepUpType: "AMOUNT",
    stepUpValue: 2,
    stepUpMult: 8, // 2*8=16 → 128+16=144 → acotado a 130
  });
  assert.equal(r.newPrice, 130);
  assert.equal(r.reason, "max_ceiling");
});
