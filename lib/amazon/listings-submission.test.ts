import { test } from "node:test";
import assert from "node:assert/strict";
import { submissionRejection } from "./listings-submission";

test("ACCEPTED sin issues → aceptado (null)", () => {
  assert.equal(
    submissionRejection({ status: "ACCEPTED", sku: "X", issues: [] }),
    null,
  );
});

test("ACCEPTED con solo WARNING/INFO → aceptado (no bloquean)", () => {
  const r = submissionRejection({
    status: "ACCEPTED",
    issues: [
      { code: "W1", message: "ojo", severity: "WARNING" },
      { code: "I1", message: "fyi", severity: "INFO" },
    ],
  });
  assert.equal(r, null);
});

test("status INVALID → rechazo", () => {
  const r = submissionRejection({ status: "INVALID", issues: [] });
  assert.equal(r?.code, "submission_invalid");
  assert.match(r?.detail ?? "", /INVALID/);
});

test("issue ERROR (aunque el status no sea INVALID) → rechazo", () => {
  const r = submissionRejection({
    status: "ACCEPTED",
    issues: [
      {
        code: "90220",
        message: "El precio está fuera del rango permitido",
        severity: "ERROR",
      },
    ],
  });
  assert.equal(r?.code, "90220");
  assert.match(r?.detail ?? "", /fuera del rango/);
});

test("varios ERROR → se concatenan en el detalle", () => {
  const r = submissionRejection({
    status: "INVALID",
    issues: [
      { code: "A", message: "uno", severity: "ERROR" },
      { code: "B", message: "dos", severity: "ERROR" },
      { code: "C", message: "warn", severity: "WARNING" },
    ],
  });
  assert.equal(r?.code, "A");
  assert.match(r?.detail ?? "", /A: uno/);
  assert.match(r?.detail ?? "", /B: dos/);
  assert.doesNotMatch(r?.detail ?? "", /warn/); // el WARNING no entra
});

test("respuesta vacía / nula → no rechazo (no hay info, status quo)", () => {
  assert.equal(submissionRejection(null), null);
  assert.equal(submissionRejection(undefined), null);
  assert.equal(submissionRejection({}), null);
});

test("severidad en minúsculas también cuenta", () => {
  const r = submissionRejection({
    issues: [{ code: "x", message: "m", severity: "error" }],
  });
  assert.equal(r?.code, "x");
});
