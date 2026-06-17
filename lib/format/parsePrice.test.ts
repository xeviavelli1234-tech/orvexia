import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrice, parseFeedPrice } from "./parsePrice";

// ── parseFeedPrice: punto puede ser separador de MILES (feed Awin europeo) ──

test("parseFeedPrice: miles con punto y sin decimales → entero", () => {
  assert.equal(parseFeedPrice("1.299"), 1299);
  assert.equal(parseFeedPrice("2.500"), 2500);
  assert.equal(parseFeedPrice("EUR2.500"), 2500);
  assert.equal(parseFeedPrice("EUR1.299"), 1299);
});

test("parseFeedPrice: decimal real (1-2 cifras tras el punto) se conserva", () => {
  assert.equal(parseFeedPrice("155.26"), 155.26);
  assert.equal(parseFeedPrice("618.97"), 618.97);
  assert.equal(parseFeedPrice("EUR155.26"), 155.26);
  assert.equal(parseFeedPrice("9.9"), 9.9);
});

test("parseFeedPrice: coma decimal europea delega correctamente", () => {
  assert.equal(parseFeedPrice("1.299,99"), 1299.99);
  assert.equal(parseFeedPrice("1199,99"), 1199.99);
  assert.equal(parseFeedPrice("19,90"), 19.9);
});

test("parseFeedPrice: nulos / vacíos / no-positivos → null", () => {
  assert.equal(parseFeedPrice(null), null);
  assert.equal(parseFeedPrice(undefined), null);
  assert.equal(parseFeedPrice(""), null);
  assert.equal(parseFeedPrice("0"), null);
  assert.equal(parseFeedPrice("abc"), null);
  assert.equal(parseFeedPrice("-5"), null);
  assert.equal(parseFeedPrice("-2.500"), null);
});

// ── Contraste: parsePrice (CSV admin) mantiene su comportamiento fijado ──
// "1.299" se trata como 1,30 € por diseño en el importador de admin; el feed
// usa parseFeedPrice precisamente para NO heredar esa interpretación.

test("parsePrice (CSV admin) conserva su semántica: '1.299' → 1.3", () => {
  assert.equal(parsePrice("1.299"), 1.3);
  assert.equal(parsePrice("155.26"), 155.26);
  assert.equal(parsePrice("1.299,99"), 1299.99);
});
