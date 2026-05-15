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
