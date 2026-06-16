import { test } from "node:test";
import assert from "node:assert/strict";
import { initBucket, refill, take, type BucketConfig } from "./throttle-core";

const CFG: BucketConfig = { capacity: 2, refillPerSec: 0.5 }; // 1 ficha cada 2 s

// ── initBucket ─────────────────────────────────────────────────────────────
test("initBucket: arranca lleno a capacidad", () => {
  const s = initBucket(CFG, 1000);
  assert.equal(s.tokens, 2);
  assert.equal(s.lastMs, 1000);
});

// ── refill ─────────────────────────────────────────────────────────────────
test("refill: repone según el tiempo pero nunca pasa de capacity", () => {
  const empty = { tokens: 0, lastMs: 0 };
  // 2 s → +1 ficha (0.5/s)
  assert.equal(refill(empty, CFG, 2000).tokens, 1);
  // 100 s → saturado a capacity, no a 50
  assert.equal(refill(empty, CFG, 100_000).tokens, 2);
});

test("refill: reloj que no avanza (o retrocede) no cambia el estado", () => {
  const s = { tokens: 1, lastMs: 5000 };
  assert.deepEqual(refill(s, CFG, 5000), s);
  assert.deepEqual(refill(s, CFG, 4000), s);
});

// ── take ─────────────────────────────────────────────────────────────────
test("take: consume cuando hay fichas (waitMs 0)", () => {
  const s = initBucket(CFG, 0);
  const r1 = take(s, CFG, 0);
  assert.equal(r1.waitMs, 0);
  assert.equal(r1.state.tokens, 1);
  const r2 = take(r1.state, CFG, 0);
  assert.equal(r2.waitMs, 0);
  assert.equal(r2.state.tokens, 0);
});

test("take: cubo vacío devuelve la espera exacta y NO consume", () => {
  const empty = { tokens: 0, lastMs: 0 };
  const r = take(empty, CFG, 0);
  // Falta 1 ficha a 0,5/s → 2000 ms
  assert.equal(r.waitMs, 2000);
  assert.equal(r.state.tokens, 0);
});

test("take: tras esperar, la ficha está disponible", () => {
  const empty = { tokens: 0, lastMs: 0 };
  const r = take(empty, CFG, 2000); // 2 s después
  assert.equal(r.waitMs, 0);
  assert.equal(r.state.tokens, 0); // tenía 1, la consumió
});

test("take: pacing sostenido a la tasa configurada", () => {
  // Arranca lleno (2), consume ráfaga, luego debe espaciar ~2 s/ficha.
  let st = initBucket(CFG, 0);
  assert.equal(take(st, CFG, 0).waitMs, 0); // ráfaga 1
  st = take(st, CFG, 0).state;
  assert.equal(take(st, CFG, 0).waitMs, 0); // ráfaga 2
  st = take(st, CFG, 0).state;
  // Vacío: la 3ª pide esperar 2 s
  assert.equal(take(st, CFG, 0).waitMs, 2000);
});

test("take: refillPerSec ≤ 0 = sin límite, nunca espera", () => {
  const cfg: BucketConfig = { capacity: 1, refillPerSec: 0 };
  const r = take({ tokens: 0, lastMs: 0 }, cfg, 0);
  assert.equal(r.waitMs, 0);
});
