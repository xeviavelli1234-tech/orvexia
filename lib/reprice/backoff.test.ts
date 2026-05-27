import { test } from "node:test";
import assert from "node:assert/strict";
import { runPatchWithBackoff, classifyError } from "./backoff";

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

// ── Categorías de error ─────────────────────────────────────────

test("classifyError: 429 → RATE_LIMIT", () => {
  const r = classifyError({ status: 429, message: "Too many" });
  assert.equal(r.category, "RATE_LIMIT");
});

test("classifyError: código 'Throttled' sin status → RATE_LIMIT", () => {
  const r = classifyError({ code: "Throttled", message: "x" });
  assert.equal(r.category, "RATE_LIMIT");
});

test("classifyError: mensaje contiene 'throttled' aunque venga como 400 → RATE_LIMIT (prioridad)", () => {
  const r = classifyError({ status: 400, message: "Your request is throttled" });
  assert.equal(r.category, "RATE_LIMIT");
});

test("classifyError: 401 → AUTH", () => {
  const r = classifyError({ status: 401, message: "Unauthorized" });
  assert.equal(r.category, "AUTH");
});

test("classifyError: código 'InvalidToken' → AUTH", () => {
  const r = classifyError({ code: "InvalidToken", message: "x" });
  assert.equal(r.category, "AUTH");
});

test("classifyError: 503 → TRANSIENT", () => {
  const r = classifyError({ status: 503, message: "Service Unavailable" });
  assert.equal(r.category, "TRANSIENT");
});

test("classifyError: ETIMEDOUT → TRANSIENT", () => {
  const r = classifyError({ code: "ETIMEDOUT", message: "timeout" });
  assert.equal(r.category, "TRANSIENT");
});

test("classifyError: 400 'InvalidInput' → INVALID", () => {
  const r = classifyError({ status: 400, code: "InvalidInput", message: "bad productType" });
  assert.equal(r.category, "INVALID");
});

test("classifyError: 404 → INVALID", () => {
  const r = classifyError({ status: 404, message: "SKU not found" });
  assert.equal(r.category, "INVALID");
});

test("classifyError: sin status/código reconocido → UNKNOWN", () => {
  const r = classifyError(new Error("boom"));
  assert.equal(r.category, "UNKNOWN");
});

// ── Política de retry por categoría ──────────────────────────────

test("runPatchWithBackoff: AUTH no se reintenta", async () => {
  let calls = 0;
  const { outcome } = await runPatchWithBackoff(
    async () => {
      calls++;
      const e = Object.assign(new Error("token bad"), {
        status: 401,
        code: "InvalidToken",
      });
      throw e;
    },
    { baseDelayMs: 1, maxRetries: 3 },
  );
  assert.equal(calls, 1);
  assert.equal(outcome.retries, 0);
  assert.equal(outcome.errorCategory, "AUTH");
});

test("runPatchWithBackoff: INVALID no se reintenta", async () => {
  let calls = 0;
  const { outcome } = await runPatchWithBackoff(
    async () => {
      calls++;
      const e = Object.assign(new Error("bad productType"), {
        status: 400,
        code: "InvalidInput",
      });
      throw e;
    },
    { baseDelayMs: 1, maxRetries: 3 },
  );
  assert.equal(calls, 1);
  assert.equal(outcome.retries, 0);
  assert.equal(outcome.errorCategory, "INVALID");
});

test("runPatchWithBackoff: TRANSIENT 5xx persistente agota reintentos", async () => {
  let calls = 0;
  const { outcome } = await runPatchWithBackoff(
    async () => {
      calls++;
      const e = Object.assign(new Error("503"), { status: 503 });
      throw e;
    },
    { baseDelayMs: 1, maxRetries: 2 },
  );
  assert.equal(calls, 3); // 1 + 2 retries
  assert.equal(outcome.retries, 2);
  assert.equal(outcome.errorCategory, "TRANSIENT");
});

test("runPatchWithBackoff: UNKNOWN se trata como retryable (1 retry)", async () => {
  let calls = 0;
  const { outcome } = await runPatchWithBackoff(
    async () => {
      calls++;
      throw new Error("mystery");
    },
    { baseDelayMs: 1, maxRetries: 1 },
  );
  assert.equal(calls, 2); // 1 + 1 retry
  assert.equal(outcome.errorCategory, "UNKNOWN");
});
