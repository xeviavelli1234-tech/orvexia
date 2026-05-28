import { test } from "node:test";
import assert from "node:assert/strict";
import { decideCronStatus } from "./check-discounts-status";

test("decideCronStatus: sin trabajo elegible → 200 (nothing to do, no es fallo)", () => {
  assert.equal(decideCronStatus(0, 0, 0), 200);
});

test("decideCronStatus: todo enviado sin errores → 200", () => {
  assert.equal(decideCronStatus(10, 10, 0), 200);
  assert.equal(decideCronStatus(1, 1, 0), 200);
});

test("decideCronStatus: había trabajo pero nada se envió → 500 (cron fallido)", () => {
  // Caso CRÍTICO: bug original. 1000 candidatos, 0 notificados, errores acumulados → 500.
  assert.equal(decideCronStatus(1000, 0, 1000), 500);
  // Aunque no haya errores (todos los email retornaron emailSent:false sin throw):
  assert.equal(decideCronStatus(5, 0, 0), 500);
});

test("decideCronStatus: envío parcial con errores → 207 Multi-Status", () => {
  assert.equal(decideCronStatus(10, 7, 3), 207);
  assert.equal(decideCronStatus(2, 1, 1), 207);
});

test("decideCronStatus: todo enviado pero con errores ya logueados → 207", () => {
  // No debería pasar (si todo se envió no debería haber errores) pero por defensa
  // si llegara → 207, mejor que 200 silencioso.
  assert.equal(decideCronStatus(5, 5, 1), 207);
});

test("decideCronStatus: status 500 tiene prioridad sobre 207", () => {
  // Si eligible>0 y sent=0, devolvemos 500 aunque errorCount también sea >0.
  // No queremos 207 porque el escenario "0 enviado" es siempre crítico.
  assert.equal(decideCronStatus(100, 0, 50), 500);
});
