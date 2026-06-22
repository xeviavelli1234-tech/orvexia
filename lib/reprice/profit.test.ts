import { test } from "node:test";
import assert from "node:assert/strict";
import { lineProfit } from "./profit";
import { profitAt } from "./margin";

const COST = { cost: 10, shipping: 2, fbaFee: 3, referralPct: 15, vatPct: 21 };

test("lineProfit escala el desglose por unidad por las unidades vendidas", () => {
  const per = profitAt(50, COST);
  const r = lineProfit({ quantity: 3, unitPrice: 50, cost: COST });

  assert.equal(r.units, 3);
  assert.equal(r.unitPrice, 50);
  assert.equal(r.estimated, false);
  assert.equal(r.revenue, 150);
  assert.ok(Math.abs(r.profit - per.profit * 3) < 0.01);
  assert.ok(Math.abs(r.netRevenue - per.netRevenue * 3) < 0.01);
  // el margen % no depende de las unidades
  assert.equal(r.marginPct, per.marginPct);
});

test("sin unitPrice usa fallbackPrice y marca estimated", () => {
  const r = lineProfit({ quantity: 2, unitPrice: null, fallbackPrice: 80, cost: COST });
  assert.equal(r.estimated, true);
  assert.equal(r.unitPrice, 80);
  assert.equal(r.revenue, 160);
  assert.ok(r.profit > 0);
});

test("unitPrice válido tiene prioridad sobre fallbackPrice", () => {
  const r = lineProfit({ quantity: 1, unitPrice: 100, fallbackPrice: 80, cost: COST });
  assert.equal(r.estimated, false);
  assert.equal(r.unitPrice, 100);
});

test("sin precio alguno → todo a 0, no NaN", () => {
  const r = lineProfit({ quantity: 5, unitPrice: 0, fallbackPrice: 0, cost: COST });
  assert.equal(r.unitPrice, 0);
  assert.equal(r.revenue, 0);
  assert.equal(r.profit, 0);
  assert.equal(r.marginPct, 0);
});

test("cantidad inválida (negativa/no entera) se sanea a entero ≥ 0", () => {
  assert.equal(lineProfit({ quantity: -3, unitPrice: 50, cost: COST }).units, 0);
  assert.equal(lineProfit({ quantity: 2.9, unitPrice: 50, cost: COST }).units, 2);
});

test("una venta por debajo del coste da beneficio negativo", () => {
  // break-even ronda los ~19 €; vender a 12 € es pérdida
  const r = lineProfit({ quantity: 4, unitPrice: 12, cost: COST });
  assert.ok(r.profit < 0, `esperaba pérdida, fue ${r.profit}`);
});
