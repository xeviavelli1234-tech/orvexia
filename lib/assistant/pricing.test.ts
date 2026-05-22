import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsePricingResponse,
  enforceBounds,
  heuristicSuggest,
  deriveHistory,
  type PricingOutput,
} from "./pricing-core";

test("parsePricingResponse: JSON limpio", () => {
  const raw = JSON.stringify({
    recommended_price: 19.99,
    confidence: 87,
    strategy: "market_gap_capture",
    explanation: "Texto largo aquí",
    risk_analysis: ["riesgo 1", "riesgo 2"],
    conservative_price: 17.99,
    aggressive_price: 22.49,
  });
  const out = parsePricingResponse(raw)!;
  assert.equal(out.recommended_price, 19.99);
  assert.equal(out.confidence, 87);
  assert.equal(out.strategy, "market_gap_capture");
  assert.deepEqual(out.risk_analysis, ["riesgo 1", "riesgo 2"]);
});

test("parsePricingResponse: envuelto en ```json", () => {
  const raw = "```json\n" + JSON.stringify({
    recommended_price: 9.5,
    confidence: 70,
    strategy: "x",
    explanation: "y",
    risk_analysis: [],
    conservative_price: 8,
    aggressive_price: 11,
  }) + "\n```";
  const out = parsePricingResponse(raw)!;
  assert.equal(out.recommended_price, 9.5);
});

test("parsePricingResponse: extrae JSON dentro de prosa", () => {
  const raw = `Aquí tienes la sugerencia: {
    "recommended_price": 12.34,
    "confidence": 60,
    "strategy": "x",
    "explanation": "ok",
    "risk_analysis": ["a"],
    "conservative_price": 10,
    "aggressive_price": 14
  } Espero te sirva.`;
  const out = parsePricingResponse(raw)!;
  assert.equal(out.recommended_price, 12.34);
});

test("parsePricingResponse: null ante basura sin JSON", () => {
  assert.equal(parsePricingResponse("nada de JSON aquí"), null);
});

test("parsePricingResponse: null ante precios <= 0", () => {
  const raw = JSON.stringify({
    recommended_price: -5,
    confidence: 50,
    strategy: "x",
    explanation: "y",
    risk_analysis: [],
    conservative_price: 10,
    aggressive_price: 12,
  });
  assert.equal(parsePricingResponse(raw), null);
});

test("parsePricingResponse: confidence se clampa a [0,100]", () => {
  const raw = JSON.stringify({
    recommended_price: 10,
    confidence: 250,
    strategy: "x",
    explanation: "y",
    risk_analysis: [],
    conservative_price: 9,
    aggressive_price: 11,
  });
  const out = parsePricingResponse(raw)!;
  assert.equal(out.confidence, 100);
});

test("parsePricingResponse: risk_analysis se trunca a 4", () => {
  const raw = JSON.stringify({
    recommended_price: 10,
    confidence: 50,
    strategy: "x",
    explanation: "y",
    risk_analysis: ["1", "2", "3", "4", "5", "6"],
    conservative_price: 9,
    aggressive_price: 11,
  });
  const out = parsePricingResponse(raw)!;
  assert.equal(out.risk_analysis.length, 4);
});

test("enforceBounds: recorta a priceMin / priceMax", () => {
  const out: PricingOutput = {
    recommended_price: 50,
    confidence: 80,
    strategy: "x",
    explanation: "y",
    risk_analysis: [],
    conservative_price: 30,
    aggressive_price: 90,
  };
  const clamped = enforceBounds(out, 40, 70);
  assert.ok(clamped.conservative_price >= 40);
  assert.ok(clamped.aggressive_price <= 70);
  assert.ok(clamped.recommended_price >= 40 && clamped.recommended_price <= 70);
});

test("enforceBounds: ordena si recommended < conservative", () => {
  const out: PricingOutput = {
    recommended_price: 10,
    confidence: 50,
    strategy: "x",
    explanation: "y",
    risk_analysis: [],
    conservative_price: 20, // mayor que recommended ¡incoherente!
    aggressive_price: 30,
  };
  const fixed = enforceBounds(out);
  assert.ok(fixed.conservative_price <= fixed.recommended_price);
  assert.ok(fixed.recommended_price <= fixed.aggressive_price);
});

test("heuristicSuggest: respeta priceMin y priceMax", () => {
  const out = heuristicSuggest({
    product: "Test",
    currency: "EUR",
    currentPrice: 100,
    priceMin: 80,
    priceMax: 110,
    aggression: "aggressive",
  });
  assert.ok(out.recommended_price >= 80);
  assert.ok(out.recommended_price <= 110);
  assert.ok(out.conservative_price >= 80);
  assert.ok(out.aggressive_price <= 110);
});

test("heuristicSuggest: urgency=high baja el precio respecto a balanced", () => {
  const base = heuristicSuggest({
    product: "X",
    currency: "EUR",
    currentPrice: 100,
    competitorPrice: 100,
    aggression: "balanced",
    urgency: "normal",
  });
  const urgent = heuristicSuggest({
    product: "X",
    currency: "EUR",
    currentPrice: 100,
    competitorPrice: 100,
    aggression: "balanced",
    urgency: "high",
  });
  assert.ok(urgent.recommended_price < base.recommended_price);
});

test("heuristicSuggest: cuanta menos info, menor confianza", () => {
  const full = heuristicSuggest({
    product: "X",
    currency: "EUR",
    currentPrice: 50,
    competitorPrice: 49,
    averagePrice: 50,
    trendPercent7d: 1,
    salesVelocityKnown: true,
  });
  const sparse = heuristicSuggest({
    product: "X",
    currency: "EUR",
    currentPrice: 50,
  });
  assert.ok(full.confidence >= sparse.confidence);
});

test("deriveHistory: medias, mín, máx y tendencia 7d", () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const events = [
    { priceAfter: 10, competitorPrice: 9, createdAt: new Date(now - 13 * day) },
    { priceAfter: 10, competitorPrice: 9, createdAt: new Date(now - 10 * day) },
    { priceAfter: 12, competitorPrice: 11, createdAt: new Date(now - 3 * day) },
    { priceAfter: 14, competitorPrice: 13, createdAt: new Date(now - 1 * day) },
  ];
  const d = deriveHistory(events);
  assert.equal(d.minHistoricalPrice, 10);
  assert.equal(d.maxHistoricalPrice, 14);
  assert.equal(d.lastPrices.length, 4);
  assert.ok(d.averagePrice !== null);
  // recientes 13>10, anteriores 10=10 → tendencia positiva
  assert.ok(d.trendPercent7d !== null);
  assert.ok((d.trendPercent7d as number) > 0);
});

test("deriveHistory: array vacío → todo null", () => {
  const d = deriveHistory([]);
  assert.equal(d.averagePrice, null);
  assert.equal(d.minHistoricalPrice, null);
  assert.equal(d.maxHistoricalPrice, null);
  assert.deepEqual(d.lastPrices, []);
  assert.equal(d.trendPercent7d, null);
});
