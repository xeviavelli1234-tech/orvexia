import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCaseText } from "./cases";
import type { ClaimCandidate } from "./types";

function candidate(over: Partial<ClaimCandidate> = {}): ClaimCandidate {
  return {
    type: "WAREHOUSE_LOST",
    sku: "AAA",
    asin: "B0AAA",
    fnsku: "X00AAA",
    title: "Producto AAA",
    quantity: 2,
    estimatedAmount: 40,
    currency: "EUR",
    confidence: 85,
    reason: "perdido",
    evidence: { transactionId: "TX1", reason: "WAREHOUSE_LOST", postedDate: "2026-06-01" },
    dedupeKey: "WAREHOUSE_LOST:TX1",
    detectedAt: "2026-06-27T00:00:00.000Z",
    windowExpiresAt: "2027-12-01T00:00:00.000Z",
    expired: false,
    ...over,
  };
}

test("texto de caso incluye SKU, FNSKU, importe y transacción", () => {
  const txt = buildCaseText(candidate());
  assert.match(txt, /SKU AAA/);
  assert.match(txt, /FNSKU X00AAA/);
  assert.match(txt, /40 EUR/);
  assert.match(txt, /TX1/);
});

test("determinista: mismo candidate ⇒ mismo texto", () => {
  assert.equal(buildCaseText(candidate()), buildCaseText(candidate()));
});

test("caso de tarifa duplicada lista cada cargo", () => {
  const txt = buildCaseText(
    candidate({
      type: "OVERCHARGED_FEE",
      evidence: {
        orderId: "ORD-9",
        feeType: "FBAPerUnitFulfillmentFee",
        charges: [
          { transactionId: "FE1", postedDate: "2026-06-01", amount: 3.5 },
          { transactionId: "FE2", postedDate: "2026-06-02", amount: 3.5 },
        ],
      },
    }),
  );
  assert.match(txt, /FE1/);
  assert.match(txt, /FE2/);
  assert.match(txt, /FBAPerUnitFulfillmentFee/);
});

test("todos los tipos generan un asunto", () => {
  for (const type of [
    "WAREHOUSE_LOST",
    "WAREHOUSE_DAMAGED",
    "INBOUND_SHORTAGE",
    "CUSTOMER_RETURN_MISSING",
    "REIMBURSEMENT_SHORTFALL",
    "OVERCHARGED_FEE",
  ] as const) {
    const txt = buildCaseText(candidate({ type }));
    assert.match(txt, /^Asunto: .+/m);
  }
});
