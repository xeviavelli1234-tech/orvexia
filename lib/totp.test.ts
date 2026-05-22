import { test } from "node:test";
import assert from "node:assert/strict";
import {
  base32Encode,
  base32Decode,
  totp,
  verifyTotp,
  generateSecret,
  generateRecoveryCodes,
} from "./totp";

// Secreto RFC 6238 (ASCII "12345678901234567890").
const SEC = base32Encode(Buffer.from("12345678901234567890"));

test("base32 round-trip", () => {
  const b = Buffer.from("12345678901234567890");
  assert.deepEqual(base32Decode(base32Encode(b)), b);
});

test("TOTP coincide con vectores RFC 6238 (SHA1, 6 dígitos)", () => {
  assert.equal(totp(SEC, { time: 59_000 }), "287082");
  assert.equal(totp(SEC, { time: 1_111_111_109_000 }), "081804");
  assert.equal(totp(SEC, { time: 1_234_567_890_000 }), "005924");
});

test("verifyTotp acepta el código vigente y ventana ±1", () => {
  const code = totp(SEC, { time: 59_000 });
  assert.equal(verifyTotp(SEC, code, 1, 59_000), true);
  assert.equal(verifyTotp(SEC, code, 1, 59_000 + 30_000), true); // +1 paso
  assert.equal(verifyTotp(SEC, code, 1, 59_000 + 90_000), false); // +3 pasos
  assert.equal(verifyTotp(SEC, "000000", 1, 59_000), false);
  assert.equal(verifyTotp(SEC, "abc", 1, 59_000), false);
});

test("generateSecret produce base32 válido y único", () => {
  const a = generateSecret();
  const b = generateSecret();
  assert.match(a, /^[A-Z2-7]+$/);
  assert.notEqual(a, b);
});

test("recovery codes: formato y unicidad", () => {
  const codes = generateRecoveryCodes(8);
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes).size, 8);
  for (const c of codes) assert.match(c, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});
