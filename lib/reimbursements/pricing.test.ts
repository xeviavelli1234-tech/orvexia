import { test } from "node:test";
import assert from "node:assert/strict";
import { successFee, sellerKeeps, SUCCESS_FEE_PCT } from "./pricing";

test("successFee: 20% por defecto", () => {
  assert.equal(SUCCESS_FEE_PCT, 20);
  assert.equal(successFee(100), 20);
  assert.equal(successFee(250), 50);
});

test("successFee: importes no positivos → 0", () => {
  assert.equal(successFee(0), 0);
  assert.equal(successFee(-10), 0);
  assert.equal(successFee(Number.NaN), 0);
});

test("sellerKeeps: recuperado menos comisión", () => {
  assert.equal(sellerKeeps(100), 80);
  assert.equal(sellerKeeps(0), 0);
});

test("fee + keeps reconstruyen el total recuperado", () => {
  const recovered = 137.5;
  assert.equal(successFee(recovered) + sellerKeeps(recovered), recovered);
});

test("porcentaje personalizado", () => {
  assert.equal(successFee(200, 15), 30);
  assert.equal(sellerKeeps(200, 15), 170);
});
