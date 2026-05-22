import { test } from "node:test";
import assert from "node:assert/strict";
import { runPatchWithBackoff } from "./backoff";

test("runPatchWithBackoff: éxito al primer intento", async () => {
  const { result, outcome } = await runPatchWithBackoff(
    async () => "ok",
    { baseDelayMs: 1 },
  );
  assert.equal(result, "ok");
  assert.equal(outcome.applied, true);
  assert.equal(outcome.retries, 0);
  assert.equal(outcome.rateLimited, false);
});

test("runPatchWithBackoff: reintenta ante 429 y termina ok", async () => {
  let calls = 0;
  const { result, outcome } = await runPatchWithBackoff(
    async () => {
      calls++;
      if (calls < 3) {
        const e = Object.assign(new Error("Too many"), { status: 429, code: "QuotaExceeded" });
        throw e;
      }
      return "applied";
    },
    { baseDelayMs: 1 },
  );
  assert.equal(result, "applied");
  assert.equal(outcome.applied, true);
  assert.equal(outcome.retries, 2);
  assert.equal(outcome.rateLimited, true);
  assert.equal(calls, 3);
});

test("runPatchWithBackoff: error duro NO reintenta y devuelve outcome con error", async () => {
  let calls = 0;
  const { result, outcome } = await runPatchWithBackoff(
    async () => {
      calls++;
      const e = Object.assign(new Error("Bad request"), { status: 400, code: "InvalidInput" });
      throw e;
    },
    { baseDelayMs: 1 },
  );
  assert.equal(result, null);
  assert.equal(outcome.applied, false);
  assert.equal(outcome.retries, 0);
  assert.equal(outcome.rateLimited, false);
  assert.ok(outcome.error);
  assert.equal(outcome.error?.code, "InvalidInput");
  assert.equal(calls, 1);
});

test("runPatchWithBackoff: agota reintentos si el 429 es persistente", async () => {
  let calls = 0;
  const { result, outcome } = await runPatchWithBackoff(
    async () => {
      calls++;
      const e = Object.assign(new Error("Throttled"), { status: 429, code: "QuotaExceeded" });
      throw e;
    },
    { baseDelayMs: 1, maxRetries: 2 },
  );
  assert.equal(result, null);
  assert.equal(outcome.applied, false);
  assert.equal(outcome.rateLimited, true);
  assert.equal(outcome.retries, 2);
  assert.equal(calls, 3); // intento inicial + 2 retries
});

test("runPatchWithBackoff: error 5xx (transient) reintenta", async () => {
  let calls = 0;
  const { outcome } = await runPatchWithBackoff(
    async () => {
      calls++;
      if (calls < 2) {
        const e = Object.assign(new Error("Server error"), { status: 503, code: "ServiceUnavailable" });
        throw e;
      }
      return "ok";
    },
    { baseDelayMs: 1 },
  );
  assert.equal(outcome.applied, true);
  assert.equal(outcome.retries, 1);
});
