import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lineProfit,
  aggregateProfit,
  recordsFromOrderItems,
  type SaleRecord,
  type ListingCost,
} from "./profit";
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

// ── aggregateProfit ──────────────────────────────────────────────

test("aggregateProfit agrupa por SKU y suma líneas del mismo SKU", () => {
  const recs: SaleRecord[] = [
    { sku: "A", title: "Lavadora", quantity: 2, unitPrice: 50, cost: COST },
    { sku: "A", quantity: 1, unitPrice: 60, cost: COST },
    { sku: "B", title: "Secadora", quantity: 1, unitPrice: 80, cost: COST },
  ];
  const { bySku, totals } = aggregateProfit(recs);

  assert.equal(bySku.length, 2);
  const a = bySku.find((r) => r.sku === "A")!;
  assert.equal(a.lines, 2);
  assert.equal(a.units, 3);
  assert.equal(a.revenue, 160); // 2·50 + 1·60
  assert.equal(a.title, "Lavadora"); // hereda el título de la línea que lo trae

  assert.equal(totals.units, 4);
  assert.equal(totals.revenue, 240);
});

test("los totales cuadran con la suma de los SKUs", () => {
  const recs: SaleRecord[] = [
    { sku: "A", quantity: 2, unitPrice: 50, cost: COST },
    { sku: "B", quantity: 3, unitPrice: 70, cost: COST },
  ];
  const { bySku, totals } = aggregateProfit(recs);
  const sum = bySku.reduce((s, r) => s + r.profit, 0);
  assert.ok(Math.abs(sum - totals.profit) < 0.01);
});

test("el margen total es ponderado, no la media de márgenes por línea", () => {
  // Un SKU rentable con mucho volumen + uno a pérdida con poco.
  const recs: SaleRecord[] = [
    { sku: "GANA", quantity: 10, unitPrice: 100, cost: COST },
    { sku: "PIERDE", quantity: 1, unitPrice: 12, cost: COST },
  ];
  const { totals } = aggregateProfit(recs);
  const expected = (totals.profit / totals.netRevenue) * 100;
  assert.ok(Math.abs(totals.marginPct - expected) < 0.05);
});

test("bySku sale ordenado por beneficio descendente", () => {
  const recs: SaleRecord[] = [
    { sku: "BAJO", quantity: 1, unitPrice: 30, cost: COST },
    { sku: "ALTO", quantity: 5, unitPrice: 120, cost: COST },
    { sku: "MEDIO", quantity: 2, unitPrice: 60, cost: COST },
  ];
  const profits = aggregateProfit(recs).bySku.map((r) => r.profit);
  const sorted = [...profits].sort((a, b) => b - a);
  assert.deepEqual(profits, sorted);
});

test("marca unidades estimadas cuando falta unitPrice", () => {
  const recs: SaleRecord[] = [
    { sku: "A", quantity: 2, unitPrice: 50, cost: COST },
    { sku: "A", quantity: 3, unitPrice: null, fallbackPrice: 55, cost: COST },
  ];
  const a = aggregateProfit(recs).bySku.find((r) => r.sku === "A")!;
  assert.equal(a.hasEstimated, true);
  assert.equal(a.estimatedUnits, 3);
  assert.equal(a.units, 5);
});

test("sin ventas → resumen vacío con totales a 0", () => {
  const { bySku, totals } = aggregateProfit([]);
  assert.equal(bySku.length, 0);
  assert.equal(totals.units, 0);
  assert.equal(totals.profit, 0);
  assert.equal(totals.marginPct, 0);
});

// ── recordsFromOrderItems ────────────────────────────────────────

const LISTINGS = new Map<string, ListingCost>([
  [
    "A",
    { cost: 10, shippingCost: 2, fbaFee: 3, feePercent: 15, vatRate: 21, priceCurrent: 55, title: "Lavadora" },
  ],
]);

test("deriva el precio unitario del bruto de línea (itemPrice / quantity)", () => {
  const recs = recordsFromOrderItems(
    [{ sku: "A", quantity: 2, itemPrice: 110 }],
    LISTINGS,
  );
  assert.equal(recs[0].unitPrice, 55); // 110 / 2
  assert.equal(recs[0].cost.cost, 10);
  assert.equal(recs[0].title, "Lavadora"); // hereda del listing
});

test("usa unitPrice si no hay itemPrice", () => {
  const recs = recordsFromOrderItems(
    [{ sku: "A", quantity: 1, itemPrice: null, unitPrice: 48 }],
    LISTINGS,
  );
  assert.equal(recs[0].unitPrice, 48);
});

test("sin precio en la línea, deja fallbackPrice del listing (venta estimada)", () => {
  const recs = recordsFromOrderItems([{ sku: "A", quantity: 1 }], LISTINGS);
  assert.equal(recs[0].unitPrice, null);
  assert.equal(recs[0].fallbackPrice, 55);
  // y al agregarla, lineProfit la marca estimada usando el fallback
  const a = aggregateProfit(recs).bySku[0];
  assert.equal(a.hasEstimated, true);
});

test("SKU sin listing → comisión/IVA por defecto (15% / 21%), sin coste de producto", () => {
  const recs = recordsFromOrderItems(
    [{ sku: "DESCONOCIDO", quantity: 1, itemPrice: 100 }],
    LISTINGS,
  );
  assert.equal(recs[0].cost.cost, 0);
  assert.equal(recs[0].cost.referralPct, 15);
  assert.equal(recs[0].cost.vatPct, 21);
});

test("el resultado encadena con aggregateProfit", () => {
  const recs = recordsFromOrderItems(
    [
      { sku: "A", quantity: 2, itemPrice: 110, title: "Lavadora" },
      { sku: "A", quantity: 1, itemPrice: 60 },
    ],
    LISTINGS,
  );
  const a = aggregateProfit(recs).bySku[0];
  assert.equal(a.units, 3);
  assert.equal(a.revenue, 170);
});
