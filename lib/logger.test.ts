import { test } from "node:test";
import assert from "node:assert/strict";
import { logger } from "./logger";

/**
 * Tests funcionales mínimos del logger. No comprobamos formato exacto
 * (depende de NODE_ENV) — solo que la API no peta y que los métodos
 * existen, que child() devuelve un logger funcional y que un Error se
 * acepta sin lanzar.
 */

test("logger expone los 4 niveles + child", () => {
  assert.equal(typeof logger.debug, "function");
  assert.equal(typeof logger.info, "function");
  assert.equal(typeof logger.warn, "function");
  assert.equal(typeof logger.error, "function");
  assert.equal(typeof logger.child, "function");
});

test("logger.child() devuelve un logger usable y aislable", () => {
  const sub = logger.child("test-sub");
  assert.equal(typeof sub.info, "function");
  sub.info({ ok: true }, "ping");
  // El sub puede tener sub-children sin problemas
  const subsub = sub.child("deep");
  subsub.warn({ deep: true }, "nested");
});

test("logger acepta Error sin lanzar (serializa message/name)", () => {
  // Capturamos console.error para no llenar stdout en tests.
  const orig = console.error;
  let called = false;
  console.error = () => {
    called = true;
  };
  try {
    logger.error({ err: new Error("boom") }, "fallo controlado");
    assert.equal(called, true, "log.error debe invocar console.error");
  } finally {
    console.error = orig;
  }
});

test("logger omite undefined del payload", () => {
  // No podemos inspeccionar el JSON directamente sin reformatear; nos
  // basta con verificar que no lanza al pasar undefined.
  logger.info({ accountId: "a", optional: undefined }, "ok");
});
