import { test } from "node:test";
import assert from "node:assert/strict";
import { madridLocalToUtc, utcToMadridLocalInput } from "./tz";

test("verano (CEST, +2): medianoche Madrid = 22:00 UTC del día anterior", () => {
  const d = madridLocalToUtc("2026-08-01T00:00");
  assert.ok(d);
  assert.equal(d!.toISOString(), "2026-07-31T22:00:00.000Z");
});

test("invierno (CET, +1): medianoche Madrid = 23:00 UTC del día anterior", () => {
  const d = madridLocalToUtc("2026-01-15T00:00");
  assert.ok(d);
  assert.equal(d!.toISOString(), "2026-01-14T23:00:00.000Z");
});

test("round-trip Madrid → UTC → Madrid conserva la hora de pared", () => {
  const local = "2026-08-01T09:30";
  const utc = madridLocalToUtc(local);
  assert.ok(utc);
  assert.equal(utcToMadridLocalInput(utc!), local);
});

test("round-trip en invierno", () => {
  const local = "2026-02-10T18:45";
  const utc = madridLocalToUtc(local);
  assert.ok(utc);
  assert.equal(utcToMadridLocalInput(utc!), local);
});

test("string inválido → null", () => {
  assert.equal(madridLocalToUtc("no es una fecha"), null);
  assert.equal(madridLocalToUtc(""), null);
});
