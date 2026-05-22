import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fixedUnitCost,
  breakEvenPrice,
  minPriceForMargin,
  profitAt,
} from "./margin";

test("fixedUnitCost suma coste + envío + FBA, ignora negativos/nulos", () => {
  assert.equal(fixedUnitCost({ cost: 10, referralPct: 15, vatPct: 21 }), 10);
  assert.equal(
    fixedUnitCost({ cost: 10, shipping: 2, fbaFee: 3, referralPct: 15, vatPct: 21 }),
    15,
  );
  assert.equal(
    fixedUnitCost({ cost: 10, shipping: -5, fbaFee: null, referralPct: 15, vatPct: 21 }),
    10,
  );
});

test("breakEvenPrice: a ese precio el beneficio es ~0", () => {
  const c = { cost: 10, shipping: 2, fbaFee: 3, referralPct: 15, vatPct: 21 };
  const be = breakEvenPrice(c);
  assert.ok(be != null && be > 0);
  const { profit } = profitAt(be!, c);
  assert.ok(Math.abs(profit) < 0.02, `profit en equilibrio ≈ 0, fue ${profit}`);
});

test("minPriceForMargin alcanza el margen objetivo", () => {
  const c = { cost: 20, referralPct: 15, vatPct: 21 };
  const p = minPriceForMargin(c, 25);
  assert.ok(p != null && p > 0);
  const { marginPct } = profitAt(p!, c);
  assert.ok(Math.abs(marginPct - 25) < 0.5, `margen ≈ 25%, fue ${marginPct}`);
});

test("minPriceForMargin siempre ≥ breakEvenPrice", () => {
  const c = { cost: 30, shipping: 4, referralPct: 15, vatPct: 21 };
  assert.ok(minPriceForMargin(c, 20)! >= breakEvenPrice(c)!);
});

test("denominador imposible (comisión enorme) → null", () => {
  // comisión 90% > ingreso neto → nunca rentable
  assert.equal(breakEvenPrice({ cost: 10, referralPct: 90, vatPct: 21 }), null);
  assert.equal(minPriceForMargin({ cost: 10, referralPct: 90, vatPct: 21 }, 10), null);
});

test("coste 0 → null (nada que cubrir, no aplica suelo)", () => {
  assert.equal(breakEvenPrice({ cost: 0, referralPct: 15, vatPct: 21 }), null);
  assert.equal(minPriceForMargin({ cost: 0, referralPct: 15, vatPct: 21 }, 10), null);
});

test("profitAt desglosa IVA y comisión correctamente", () => {
  const c = { cost: 10, referralPct: 15, vatPct: 21 };
  const b = profitAt(24.2, c);
  assert.equal(b.netRevenue, 20); // 24,20 / 1,21
  assert.equal(b.referralFee, 3.63); // 15% de 24,20
  assert.equal(b.unitCost, 10);
  assert.equal(b.profit, 6.37); // 20 − 3,63 − 10
});

test("sin IVA (vat 0) y sin comisión: precio = coste fijo", () => {
  const c = { cost: 12, referralPct: 0, vatPct: 0 };
  assert.equal(breakEvenPrice(c), 12);
});
