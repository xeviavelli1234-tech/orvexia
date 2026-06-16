import { test } from "node:test";
import assert from "node:assert/strict";
import { messagesToDelete, type DrainMsg } from "./event-drain";

const m = (receiptHandle: string, sellerId: string | null): DrainMsg => ({
  receiptHandle,
  sellerId,
});

test("borra ruido: sin sellerId o sellerId sin cuenta", () => {
  const msgs = [m("r1", null), m("r2", "DESCONOCIDO")];
  const del = messagesToDelete(msgs, new Set(), new Set());
  assert.deepEqual(
    del.map((x) => x.receiptHandle),
    ["r1", "r2"],
  );
});

test("borra los de cuentas intentadas (procesadas o fallidas)", () => {
  const msgs = [m("r1", "A_OK")];
  const del = messagesToDelete(msgs, new Set(["A_OK"]), new Set(["A_OK"]));
  assert.equal(del.length, 1);
});

test("CONSERVA los de cuentas mapeadas pero NO intentadas (cap/deadline)", () => {
  const msgs = [m("r1", "A_CAP")];
  // mapea a cuenta pero no se intentó → no se borra (reintento)
  const del = messagesToDelete(msgs, new Set(["A_CAP"]), new Set());
  assert.equal(del.length, 0);
});

test("mezcla realista: borra hechos+ruido, conserva pendientes", () => {
  const msgs = [
    m("done1", "A"),
    m("done2", "A"),
    m("pending", "B"),
    m("noise", "X"),
    m("nullseller", null),
  ];
  const mapped = new Set(["A", "B"]); // A y B son cuentas nuestras
  const attempted = new Set(["A"]); // solo A se procesó este ciclo
  const del = messagesToDelete(msgs, mapped, attempted).map((x) => x.receiptHandle);
  assert.deepEqual(del.sort(), ["done1", "done2", "noise", "nullseller"].sort());
  // 'pending' (cuenta B mapeada, no intentada) se conserva
  assert.ok(!del.includes("pending"));
});
