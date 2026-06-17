import { test } from "node:test";
import assert from "node:assert/strict";
import { parseManualCatalogCsv } from "./manualImport";

test("separador de miles español: '1.299' → 1299 (no 1,299)", () => {
  const r = parseManualCatalogCsv("sku,title,price\nA,Lavadora,1.299");
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].priceCurrent, 1299);
});

test("decimal con punto se conserva: '449.00' → 449", () => {
  const r = parseManualCatalogCsv("sku,title,price\nA,Tele,449.00");
  assert.equal(r.rows[0].priceCurrent, 449);
});

test("formato es-ES completo: '1.234,56' → 1234.56", () => {
  const r = parseManualCatalogCsv('sku,title,price\nA,X,"1.234,56"');
  assert.equal(r.rows[0].priceCurrent, 1234.56);
});

test("varios puntos de miles: '1.299.999' → 1299999", () => {
  const r = parseManualCatalogCsv("sku,title,price\nA,X,1.299.999");
  assert.equal(r.rows[0].priceCurrent, 1299999);
});

test("coma decimal: '1,5' → 1.5", () => {
  const r = parseManualCatalogCsv('sku,title,price\nA,X,"1,5"');
  assert.equal(r.rows[0].priceCurrent, 1.5);
});

test("columns refleja solo las columnas presentes; sin min/max/cost → null", () => {
  const r = parseManualCatalogCsv("sku,title,price\nA,X,10");
  assert.ok(r.columns.includes("sku"));
  assert.ok(r.columns.includes("priceCurrent"));
  assert.ok(!r.columns.includes("priceMin"));
  assert.ok(!r.columns.includes("cost"));
  assert.equal(r.rows[0].priceMin, null);
  assert.equal(r.rows[0].priceMax, null);
  assert.equal(r.rows[0].cost, null);
});

test("columns incluye min/max/cost cuando vienen en el CSV", () => {
  const r = parseManualCatalogCsv("sku,title,price,min,max,cost\nA,X,10,8,12,6");
  assert.ok(r.columns.includes("priceMin"));
  assert.ok(r.columns.includes("priceMax"));
  assert.ok(r.columns.includes("cost"));
  assert.equal(r.rows[0].priceMin, 8);
  assert.equal(r.rows[0].priceMax, 12);
  assert.equal(r.rows[0].cost, 6);
});
