import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldDispatchToChannel, type ChannelAlertFlags, type AlertCategory } from "./notify-external-filter";

const allOn: ChannelAlertFlags = {
  alertBuyBoxLost: true,
  alertPriceFloor: true,
  alertError: true,
  alertAutoPause: true,
  alertWeekly: true,
};

const allOff: ChannelAlertFlags = {
  alertBuyBoxLost: false,
  alertPriceFloor: false,
  alertError: false,
  alertAutoPause: false,
  alertWeekly: false,
};

const categories: AlertCategory[] = ["buybox_lost", "price_floor", "error", "auto_pause", "weekly"];

test("shouldDispatchToChannel: canal con todos los flags activos → siempre true", () => {
  for (const c of categories) {
    assert.equal(shouldDispatchToChannel(allOn, c), true, `falla para ${c}`);
  }
});

test("shouldDispatchToChannel: canal con todos los flags off → siempre false", () => {
  for (const c of categories) {
    assert.equal(shouldDispatchToChannel(allOff, c), false, `falla para ${c}`);
  }
});

test("shouldDispatchToChannel: respeta alertBuyBoxLost de forma aislada", () => {
  const ch = { ...allOff, alertBuyBoxLost: true };
  assert.equal(shouldDispatchToChannel(ch, "buybox_lost"), true);
  assert.equal(shouldDispatchToChannel(ch, "price_floor"), false);
  assert.equal(shouldDispatchToChannel(ch, "error"), false);
  assert.equal(shouldDispatchToChannel(ch, "auto_pause"), false);
  assert.equal(shouldDispatchToChannel(ch, "weekly"), false);
});

test("shouldDispatchToChannel: respeta alertPriceFloor de forma aislada", () => {
  const ch = { ...allOff, alertPriceFloor: true };
  assert.equal(shouldDispatchToChannel(ch, "price_floor"), true);
  assert.equal(shouldDispatchToChannel(ch, "buybox_lost"), false);
});

test("shouldDispatchToChannel: respeta alertError de forma aislada", () => {
  const ch = { ...allOff, alertError: true };
  assert.equal(shouldDispatchToChannel(ch, "error"), true);
  assert.equal(shouldDispatchToChannel(ch, "weekly"), false);
});

test("shouldDispatchToChannel: respeta alertAutoPause de forma aislada", () => {
  const ch = { ...allOff, alertAutoPause: true };
  assert.equal(shouldDispatchToChannel(ch, "auto_pause"), true);
  assert.equal(shouldDispatchToChannel(ch, "error"), false);
});

test("shouldDispatchToChannel: respeta alertWeekly de forma aislada", () => {
  // Caso típico: un canal solo quiere el resumen semanal, no alertas en tiempo real.
  const ch = { ...allOff, alertWeekly: true };
  assert.equal(shouldDispatchToChannel(ch, "weekly"), true);
  assert.equal(shouldDispatchToChannel(ch, "buybox_lost"), false);
  assert.equal(shouldDispatchToChannel(ch, "price_floor"), false);
  assert.equal(shouldDispatchToChannel(ch, "error"), false);
  assert.equal(shouldDispatchToChannel(ch, "auto_pause"), false);
});

test("shouldDispatchToChannel: combinación parcial — solo errores + auto_pause", () => {
  // Patrón común para un canal de "incidencias": no quiere ruido de buybox o weekly,
  // sí quiere saber si algo se rompe o se pausa automáticamente.
  const ch = { ...allOff, alertError: true, alertAutoPause: true };
  assert.equal(shouldDispatchToChannel(ch, "error"), true);
  assert.equal(shouldDispatchToChannel(ch, "auto_pause"), true);
  assert.equal(shouldDispatchToChannel(ch, "buybox_lost"), false);
  assert.equal(shouldDispatchToChannel(ch, "price_floor"), false);
  assert.equal(shouldDispatchToChannel(ch, "weekly"), false);
});
