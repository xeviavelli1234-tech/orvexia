import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDatabaseUrl } from "./db-url";

const BASE = "postgresql://user:p%40ss@db.host:5432/orvexia";

test("reescribe los alias debilitables a verify-full", () => {
  for (const mode of ["require", "prefer", "verify-ca", "REQUIRE"]) {
    assert.equal(
      normalizeDatabaseUrl(`${BASE}?sslmode=${mode}`),
      `${BASE}?sslmode=verify-full`,
    );
  }
});

test("respeta sslmode ya seguros o no aliasados", () => {
  for (const mode of ["verify-full", "disable", "no-verify"]) {
    const url = `${BASE}?sslmode=${mode}`;
    assert.equal(normalizeDatabaseUrl(url), url);
  }
});

test("toca solo sslmode, no las credenciales ni otros parámetros", () => {
  assert.equal(
    normalizeDatabaseUrl(`${BASE}?connection_limit=5&sslmode=require&pool_timeout=10`),
    `${BASE}?connection_limit=5&sslmode=verify-full&pool_timeout=10`,
  );
});

test("sin sslmode, devuelve la cadena intacta", () => {
  assert.equal(normalizeDatabaseUrl(BASE), BASE);
  assert.equal(normalizeDatabaseUrl(`${BASE}?connection_limit=5`), `${BASE}?connection_limit=5`);
});

test("no rompe con undefined / vacío", () => {
  assert.equal(normalizeDatabaseUrl(undefined), undefined);
  assert.equal(normalizeDatabaseUrl(""), "");
});

test("no confunde 'require' como subcadena de otro valor", () => {
  // sslmode=requiressl no es un alias real; no debe tocarse.
  const url = `${BASE}?sslmode=requiressl`;
  assert.equal(normalizeDatabaseUrl(url), url);
});
