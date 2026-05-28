import { test } from "node:test";
import assert from "node:assert/strict";
import { statusMap, checkSecret } from "./postback";
import { affiliateClickSchema, affiliatePostbackSchema } from "@/lib/validations";

// ── statusMap ───────────────────────────────────────────────────────────────

test("statusMap: approved en cualquier case → APPROVED", () => {
  assert.equal(statusMap("approved"), "APPROVED");
  assert.equal(statusMap("APPROVED"), "APPROVED");
  assert.equal(statusMap("Approved"), "APPROVED");
});

test("statusMap: rejected y declined → REJECTED", () => {
  assert.equal(statusMap("rejected"), "REJECTED");
  assert.equal(statusMap("declined"), "REJECTED");
  assert.equal(statusMap("REJECTED"), "REJECTED");
  assert.equal(statusMap("DECLINED"), "REJECTED");
});

test("statusMap: cualquier otro valor → PENDING (no crashea)", () => {
  assert.equal(statusMap("pending"), "PENDING");
  assert.equal(statusMap(""), "PENDING");
  assert.equal(statusMap("unknown"), "PENDING");
  assert.equal(statusMap("foobar"), "PENDING");
});

// ── checkSecret ─────────────────────────────────────────────────────────────

test("checkSecret: rechaza si falta secret esperado", () => {
  assert.equal(checkSecret("abc", undefined), false);
  assert.equal(checkSecret("abc", ""), false);
});

test("checkSecret: rechaza si no se provee", () => {
  assert.equal(checkSecret(null, "abc"), false);
  assert.equal(checkSecret("", "abc"), false);
});

test("checkSecret: rechaza longitudes distintas (sin crashear)", () => {
  assert.equal(checkSecret("short", "longer-secret-value"), false);
});

test("checkSecret: acepta valor exacto", () => {
  assert.equal(checkSecret("abc123", "abc123"), true);
  assert.equal(checkSecret("Z".repeat(40), "Z".repeat(40)), true);
});

test("checkSecret: rechaza valor distinto de misma longitud", () => {
  assert.equal(checkSecret("aaaaaa", "bbbbbb"), false);
});

// ── affiliateClickSchema ────────────────────────────────────────────────────

const validClickPayload = {
  productId: "ckabcdefghijklmnopqrstuvw",
  selectedRetailer: "Amazon",
  retailerPosition: 0,
  isPrimary: true,
};

test("affiliateClickSchema: acepta payload mínimo válido", () => {
  const r = affiliateClickSchema.safeParse(validClickPayload);
  assert.equal(r.success, true);
});

test("affiliateClickSchema: rechaza productId que no parece CUID", () => {
  const r = affiliateClickSchema.safeParse({ ...validClickPayload, productId: "not-a-cuid" });
  assert.equal(r.success, false);
});

test("affiliateClickSchema: rechaza productId vacío", () => {
  const r = affiliateClickSchema.safeParse({ ...validClickPayload, productId: "" });
  assert.equal(r.success, false);
});

test("affiliateClickSchema: rechaza retailerPosition fuera de rango", () => {
  assert.equal(affiliateClickSchema.safeParse({ ...validClickPayload, retailerPosition: -1 }).success, false);
  assert.equal(affiliateClickSchema.safeParse({ ...validClickPayload, retailerPosition: 51 }).success, false);
  assert.equal(affiliateClickSchema.safeParse({ ...validClickPayload, retailerPosition: 1.5 }).success, false);
});

test("affiliateClickSchema: rechaza retailer demasiado largo", () => {
  const r = affiliateClickSchema.safeParse({ ...validClickPayload, selectedRetailer: "X".repeat(81) });
  assert.equal(r.success, false);
});

test("affiliateClickSchema: rechaza selectedRetailer vacío", () => {
  const r = affiliateClickSchema.safeParse({ ...validClickPayload, selectedRetailer: "" });
  assert.equal(r.success, false);
});

test("affiliateClickSchema: rechaza isPrimary no-boolean", () => {
  const r = affiliateClickSchema.safeParse({ ...validClickPayload, isPrimary: "true" });
  assert.equal(r.success, false);
});

test("affiliateClickSchema: pageContext y placement son opcionales", () => {
  const r = affiliateClickSchema.safeParse({
    ...validClickPayload,
    pageContext: "/categorias/televisores",
    placement: "card-primary",
  });
  assert.equal(r.success, true);
});

// ── affiliatePostbackSchema ─────────────────────────────────────────────────

const validPostback = {
  network: "awin",
  transactionId: "TX-123",
  store: "Fnac",
  amount: "199.99",
  commission: "5.50",
  currency: "EUR",
  status: "approved" as const,
};

test("affiliatePostbackSchema: acepta payload válido", () => {
  const r = affiliatePostbackSchema.safeParse(validPostback);
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.amount, 199.99);
    assert.equal(r.data.commission, 5.5);
  }
});

test("affiliatePostbackSchema: amount con coma decimal (Awin europeo) se acepta", () => {
  const r = affiliatePostbackSchema.safeParse({ ...validPostback, amount: "199,99", commission: "5,50" });
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.amount, 199.99);
    assert.equal(r.data.commission, 5.5);
  }
});

test("affiliatePostbackSchema: network y status tienen defaults", () => {
  const minimal = {
    transactionId: "TX-1",
    store: "Fnac",
    amount: "10",
    commission: "0.5",
  };
  const r = affiliatePostbackSchema.safeParse(minimal);
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.network, "awin");
    assert.equal(r.data.status, "pending");
    assert.equal(r.data.currency, "EUR");
  }
});

test("affiliatePostbackSchema: rechaza amount negativo", () => {
  const r = affiliatePostbackSchema.safeParse({ ...validPostback, amount: "-10" });
  assert.equal(r.success, false);
});

test("affiliatePostbackSchema: rechaza currency con longitud != 3", () => {
  assert.equal(affiliatePostbackSchema.safeParse({ ...validPostback, currency: "EU" }).success, false);
  assert.equal(affiliatePostbackSchema.safeParse({ ...validPostback, currency: "EURO" }).success, false);
});

test("affiliatePostbackSchema: rechaza transactionId vacío", () => {
  const r = affiliatePostbackSchema.safeParse({ ...validPostback, transactionId: "" });
  assert.equal(r.success, false);
});

test("affiliatePostbackSchema: rechaza status fuera de enum", () => {
  const r = affiliatePostbackSchema.safeParse({ ...validPostback, status: "weird" });
  assert.equal(r.success, false);
});

test("affiliatePostbackSchema: acepta status declined (Awin envía declined, no rejected)", () => {
  const r = affiliatePostbackSchema.safeParse({ ...validPostback, status: "declined" });
  assert.equal(r.success, true);
});

test("affiliatePostbackSchema: clickref opcional pero limitado a 64 chars", () => {
  assert.equal(affiliatePostbackSchema.safeParse({ ...validPostback, clickref: "abc" }).success, true);
  assert.equal(affiliatePostbackSchema.safeParse({ ...validPostback, clickref: "X".repeat(65) }).success, false);
});
