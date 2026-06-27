import { test } from "node:test";
import assert from "node:assert/strict";
import { detectClaims, summarizeCandidates } from "./detect";
import type { DetectConfig, FinancialEvents, SkuValuation } from "./types";

const NOW = new Date("2026-06-27T00:00:00.000Z");

function cfg(
  valuations: SkuValuation[],
  over: Partial<DetectConfig> = {},
): DetectConfig {
  return {
    valuations: new Map(valuations.map((v) => [v.sku, v])),
    now: NOW,
    ...over,
  };
}

function empty(): FinancialEvents {
  return { inventory: [], refunds: [], returns: [], fees: [] };
}

const VAL = (sku: string, unitValue: number, estimated = false): SkuValuation => ({
  sku,
  asin: "B0" + sku,
  title: "Producto " + sku,
  unitValue,
  estimated,
});

test("inventario perdido sin reembolso → reclamación completa, alta confianza", () => {
  const events = empty();
  events.inventory.push({
    transactionId: "TX1",
    postedDate: "2026-06-01T00:00:00.000Z",
    reason: "WAREHOUSE_LOST",
    sku: "AAA",
    fnsku: "X00AAA",
    quantity: -3,
    amount: 0,
  });
  const [c, ...rest] = detectClaims(events, cfg([VAL("AAA", 20)]));
  assert.equal(rest.length, 0);
  assert.equal(c.type, "WAREHOUSE_LOST");
  assert.equal(c.quantity, 3);
  assert.equal(c.estimatedAmount, 60);
  assert.equal(c.confidence, 85);
  assert.equal(c.fnsku, "X00AAA");
  assert.equal(c.expired, false);
  assert.equal(c.dedupeKey, "WAREHOUSE_LOST:TX1");
});

test("inventario dañado → tipo WAREHOUSE_DAMAGED", () => {
  const events = empty();
  events.inventory.push({
    transactionId: "TX2",
    postedDate: "2026-06-01T00:00:00.000Z",
    reason: "WAREHOUSE_DAMAGE",
    sku: "BBB",
    quantity: -1,
    amount: 0,
  });
  const [c] = detectClaims(events, cfg([VAL("BBB", 50)]));
  assert.equal(c.type, "WAREHOUSE_DAMAGED");
  assert.equal(c.estimatedAmount, 50);
});

test("valoración estimada baja la confianza 15 puntos", () => {
  const events = empty();
  events.inventory.push({
    transactionId: "TX3",
    postedDate: "2026-06-01T00:00:00.000Z",
    reason: "WAREHOUSE_LOST",
    sku: "CCC",
    quantity: -2,
    amount: 0,
  });
  const [c] = detectClaims(events, cfg([VAL("CCC", 10, true)]));
  assert.equal(c.confidence, 70);
});

test("reembolso parcial por debajo del 90% → REIMBURSEMENT_SHORTFALL por la diferencia", () => {
  const events = empty();
  events.inventory.push({
    transactionId: "TX4",
    postedDate: "2026-06-01T00:00:00.000Z",
    reason: "WAREHOUSE_LOST",
    sku: "DDD",
    quantity: -2,
    amount: 10, // valor esperado 2*30=60; reembolsado 10 (<90%)
  });
  const [c] = detectClaims(events, cfg([VAL("DDD", 30)]));
  assert.equal(c.type, "REIMBURSEMENT_SHORTFALL");
  assert.equal(c.estimatedAmount, 50);
  assert.equal(c.confidence, 60);
});

test("reembolso suficiente (≥90%) → sin reclamación", () => {
  const events = empty();
  events.inventory.push({
    transactionId: "TX5",
    postedDate: "2026-06-01T00:00:00.000Z",
    reason: "WAREHOUSE_LOST",
    sku: "EEE",
    quantity: -1,
    amount: 19, // valor 20; reembolsado 19 (>=90%)
  });
  assert.equal(detectClaims(events, cfg([VAL("EEE", 20)])).length, 0);
});

test("razón no imputable a Amazon → ignorada", () => {
  const events = empty();
  events.inventory.push({
    transactionId: "TX6",
    postedDate: "2026-06-01T00:00:00.000Z",
    reason: "CustomerReturn",
    sku: "FFF",
    quantity: -1,
    amount: 0,
  });
  assert.equal(detectClaims(events, cfg([VAL("FFF", 20)])).length, 0);
});

test("sin valoración del SKU → no se cuantifica (sin reclamación)", () => {
  const events = empty();
  events.inventory.push({
    transactionId: "TX7",
    postedDate: "2026-06-01T00:00:00.000Z",
    reason: "WAREHOUSE_LOST",
    sku: "ZZZ",
    quantity: -5,
    amount: 0,
  });
  assert.equal(detectClaims(events, cfg([])).length, 0);
});

test("ventana de 18 meses vencida → expired=true", () => {
  const events = empty();
  events.inventory.push({
    transactionId: "TX8",
    postedDate: "2024-01-01T00:00:00.000Z", // >18 meses antes de NOW
    reason: "WAREHOUSE_LOST",
    sku: "GGG",
    quantity: -1,
    amount: 0,
  });
  const [c] = detectClaims(events, cfg([VAL("GGG", 20)]));
  assert.equal(c.expired, true);
});

test("devolución reembolsada y NO repuesta tras la ventana → CUSTOMER_RETURN_MISSING", () => {
  const events = empty();
  events.refunds.push({
    transactionId: "RF1",
    postedDate: "2026-04-01T00:00:00.000Z", // > 60 días antes de NOW
    orderId: "ORD-1",
    sku: "HHH",
    quantity: 1,
    principal: 40,
  });
  const [c] = detectClaims(events, cfg([VAL("HHH", 40)]));
  assert.equal(c.type, "CUSTOMER_RETURN_MISSING");
  assert.equal(c.estimatedAmount, 40);
  assert.equal(c.confidence, 70);
});

test("devolución repuesta al stock → sin reclamación", () => {
  const events = empty();
  events.refunds.push({
    transactionId: "RF2",
    postedDate: "2026-04-01T00:00:00.000Z",
    orderId: "ORD-2",
    sku: "III",
    quantity: 1,
    principal: 40,
  });
  events.returns.push({
    postedDate: "2026-04-10T00:00:00.000Z",
    orderId: "ORD-2",
    sku: "III",
    quantity: 1,
    restocked: true,
  });
  assert.equal(detectClaims(events, cfg([VAL("III", 40)])).length, 0);
});

test("devolución reembolsada dentro de la ventana → aún no reclamable", () => {
  const events = empty();
  events.refunds.push({
    transactionId: "RF3",
    postedDate: "2026-06-20T00:00:00.000Z", // hace 7 días, ventana 60
    orderId: "ORD-3",
    sku: "JJJ",
    quantity: 1,
    principal: 40,
  });
  assert.equal(detectClaims(events, cfg([VAL("JJJ", 40)])).length, 0);
});

test("tarifa FBA duplicada → OVERCHARGED_FEE por el cargo extra", () => {
  const events = empty();
  const base = {
    orderId: "ORD-9",
    sku: "KKK",
    feeType: "FBAPerUnitFulfillmentFee",
    amount: 3.5,
    quantity: 1,
  };
  events.fees.push({ ...base, transactionId: "FE1", postedDate: "2026-06-01T00:00:00.000Z" });
  events.fees.push({ ...base, transactionId: "FE2", postedDate: "2026-06-02T00:00:00.000Z" });
  const [c] = detectClaims(events, cfg([VAL("KKK", 100)]));
  assert.equal(c.type, "OVERCHARGED_FEE");
  assert.equal(c.quantity, 1);
  assert.equal(c.estimatedAmount, 3.5);
});

test("tarifa única (sin duplicado) → sin reclamación", () => {
  const events = empty();
  events.fees.push({
    transactionId: "FE3",
    postedDate: "2026-06-01T00:00:00.000Z",
    orderId: "ORD-10",
    sku: "LLL",
    feeType: "FBAPerUnitFulfillmentFee",
    amount: 3.5,
    quantity: 1,
  });
  assert.equal(detectClaims(events, cfg([VAL("LLL", 100)])).length, 0);
});

test("tipo de tarifa no FBA (Commission) duplicada → ignorada (evita falsos positivos)", () => {
  const events = empty();
  const base = { orderId: "ORD-11", sku: "MMM", feeType: "Commission", amount: 5, quantity: 1 };
  events.fees.push({ ...base, transactionId: "FE4", postedDate: "2026-06-01T00:00:00.000Z" });
  events.fees.push({ ...base, transactionId: "FE5", postedDate: "2026-06-02T00:00:00.000Z" });
  assert.equal(detectClaims(events, cfg([VAL("MMM", 100)])).length, 0);
});

test("determinismo: mismo input ⇒ mismo output", () => {
  const build = () => {
    const e = empty();
    e.inventory.push({
      transactionId: "TXD",
      postedDate: "2026-06-01T00:00:00.000Z",
      reason: "WAREHOUSE_LOST",
      sku: "AAA",
      quantity: -2,
      amount: 0,
    });
    return e;
  };
  const a = detectClaims(build(), cfg([VAL("AAA", 15)]));
  const b = detectClaims(build(), cfg([VAL("AAA", 15)]));
  assert.deepEqual(a, b);
});

test("summarizeCandidates suma solo las no vencidas y agrupa por tipo", () => {
  const events = empty();
  events.inventory.push(
    {
      transactionId: "S1",
      postedDate: "2026-06-01T00:00:00.000Z",
      reason: "WAREHOUSE_LOST",
      sku: "AAA",
      quantity: -2,
      amount: 0,
    },
    {
      transactionId: "S2",
      postedDate: "2024-01-01T00:00:00.000Z", // vencida
      reason: "WAREHOUSE_LOST",
      sku: "AAA",
      quantity: -1,
      amount: 0,
    },
  );
  const candidates = detectClaims(events, cfg([VAL("AAA", 10)]));
  const sum = summarizeCandidates(candidates);
  assert.equal(sum.count, 1);
  assert.equal(sum.totalAmount, 20);
  assert.equal(sum.byType.WAREHOUSE_LOST.count, 1);
  assert.equal(sum.byType.WAREHOUSE_LOST.amount, 20);
});
