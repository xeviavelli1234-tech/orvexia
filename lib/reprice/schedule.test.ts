import { test } from "node:test";
import assert from "node:assert/strict";
import { isWithinSchedule, isScheduleAllowed } from "./schedule";

test("0–24 siempre activo", () => {
  assert.equal(isWithinSchedule(3, 0, 24), true);
  assert.equal(isWithinSchedule(23, 0, 24), true);
});

test("franja normal [9,18)", () => {
  assert.equal(isWithinSchedule(9, 9, 18), true);
  assert.equal(isWithinSchedule(17, 9, 18), true);
  assert.equal(isWithinSchedule(18, 9, 18), false);
  assert.equal(isWithinSchedule(8, 9, 18), false);
});

test("franja nocturna [22,6)", () => {
  assert.equal(isWithinSchedule(23, 22, 6), true);
  assert.equal(isWithinSchedule(2, 22, 6), true);
  assert.equal(isWithinSchedule(6, 22, 6), false);
  assert.equal(isWithinSchedule(12, 22, 6), false);
});

test("start == end → activo todo el día", () => {
  assert.equal(isWithinSchedule(4, 10, 10), true);
});

test("isScheduleAllowed: deshabilitado → siempre true", () => {
  assert.equal(isScheduleAllowed(false, 9, 18, new Date()), true);
});
