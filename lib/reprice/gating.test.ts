import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldRunAccount,
  isLockClaimable,
  type AccountGatingState,
} from "./gating";

const now = new Date("2026-05-26T10:00:00Z"); // 12:00 Madrid (verano CEST)

function base(over: Partial<AccountGatingState> = {}): AccountGatingState {
  return {
    plan: "PRO",
    trialEndsAt: null,
    lastRunAt: null,
    intervalSeconds: 900,
    vacationFrom: null,
    vacationTo: null,
    scheduleEnabled: false,
    scheduleStartHour: 0,
    scheduleEndHour: 24,
    ...over,
  };
}

// ── Plan ───────────────────────────────────────────────────────

test("PRO siempre pasa el gating de plan", () => {
  const r = shouldRunAccount(base({ plan: "PRO" }), now);
  assert.equal(r.run, true);
});

test("TRIAL sin trialEndsAt → permitido (no ha expirado)", () => {
  const r = shouldRunAccount(base({ plan: "TRIAL", trialEndsAt: null }), now);
  assert.equal(r.run, true);
});

test("TRIAL caducado → plan_expired", () => {
  const expired = new Date(now.getTime() - 86_400_000);
  const r = shouldRunAccount(
    base({ plan: "TRIAL", trialEndsAt: expired }),
    now,
  );
  assert.equal(r.run, false);
  if (!r.run) assert.equal(r.reason, "plan_expired");
});

test("plan_expired tiene prioridad sobre force", () => {
  // Aunque sea disparo manual, no debemos escribir en Amazon con trial expirado.
  const expired = new Date(now.getTime() - 86_400_000);
  const r = shouldRunAccount(
    base({ plan: "TRIAL", trialEndsAt: expired }),
    now,
    { force: true },
  );
  assert.equal(r.run, false);
});

// ── Intervalo ──────────────────────────────────────────────────

test("intervalo no cumplido → interval_not_due", () => {
  const lastRun = new Date(now.getTime() - 60_000); // hace 1 minuto
  const r = shouldRunAccount(
    base({ lastRunAt: lastRun, intervalSeconds: 900 }),
    now,
  );
  assert.equal(r.run, false);
  if (!r.run) assert.equal(r.reason, "interval_not_due");
});

test("intervalo cumplido al milisegundo → corre", () => {
  const lastRun = new Date(now.getTime() - 900_000); // exactamente 15 min
  const r = shouldRunAccount(
    base({ lastRunAt: lastRun, intervalSeconds: 900 }),
    now,
  );
  assert.equal(r.run, true);
});

test("force=true ignora el intervalo no cumplido", () => {
  const lastRun = new Date(now.getTime() - 1_000);
  const r = shouldRunAccount(
    base({ lastRunAt: lastRun, intervalSeconds: 900 }),
    now,
    { force: true },
  );
  assert.equal(r.run, true);
});

// ── Vacaciones ─────────────────────────────────────────────────

test("ventana de vacaciones que incluye 'now' → vacation", () => {
  const r = shouldRunAccount(
    base({
      vacationFrom: new Date(now.getTime() - 86_400_000),
      vacationTo: new Date(now.getTime() + 86_400_000),
    }),
    now,
  );
  assert.equal(r.run, false);
  if (!r.run) assert.equal(r.reason, "vacation");
});

test("vacaciones se respetan incluso con force=true (pausa intencional)", () => {
  const r = shouldRunAccount(
    base({
      vacationFrom: new Date(now.getTime() - 86_400_000),
      vacationTo: new Date(now.getTime() + 86_400_000),
    }),
    now,
    { force: true },
  );
  assert.equal(r.run, false);
});

test("vacaciones ya terminadas → no bloquean", () => {
  const r = shouldRunAccount(
    base({
      vacationFrom: new Date(now.getTime() - 200_000_000),
      vacationTo: new Date(now.getTime() - 100_000_000),
    }),
    now,
  );
  assert.equal(r.run, true);
});

test("solo vacationFrom sin vacationTo → ignorado", () => {
  // El runner solo activa la ventana cuando AMBOS están definidos.
  const r = shouldRunAccount(
    base({ vacationFrom: new Date(now.getTime() - 1_000), vacationTo: null }),
    now,
  );
  assert.equal(r.run, true);
});

// ── Schedule ───────────────────────────────────────────────────

test("schedule deshabilitado → permitido", () => {
  const r = shouldRunAccount(
    base({ scheduleEnabled: false, scheduleStartHour: 22, scheduleEndHour: 23 }),
    now,
  );
  assert.equal(r.run, true);
});

test("schedule fuera de franja → out_of_schedule", () => {
  // Son las 12:00 Madrid → franja 18-22 está fuera.
  const r = shouldRunAccount(
    base({ scheduleEnabled: true, scheduleStartHour: 18, scheduleEndHour: 22 }),
    now,
  );
  assert.equal(r.run, false);
  if (!r.run) assert.equal(r.reason, "out_of_schedule");
});

test("force=true ignora el schedule", () => {
  const r = shouldRunAccount(
    base({ scheduleEnabled: true, scheduleStartHour: 18, scheduleEndHour: 22 }),
    now,
    { force: true },
  );
  assert.equal(r.run, true);
});

// ── Prioridad entre razones ────────────────────────────────────

test("plan caducado se reporta antes que intervalo", () => {
  const expired = new Date(now.getTime() - 86_400_000);
  const lastRun = new Date(now.getTime() - 1_000);
  const r = shouldRunAccount(
    base({
      plan: "TRIAL",
      trialEndsAt: expired,
      lastRunAt: lastRun,
      intervalSeconds: 900,
    }),
    now,
  );
  assert.equal(r.run, false);
  if (!r.run) assert.equal(r.reason, "plan_expired");
});

test("intervalo se reporta antes que vacaciones (orden del runner)", () => {
  const lastRun = new Date(now.getTime() - 1_000);
  const r = shouldRunAccount(
    base({
      lastRunAt: lastRun,
      intervalSeconds: 900,
      vacationFrom: new Date(now.getTime() - 86_400_000),
      vacationTo: new Date(now.getTime() + 86_400_000),
    }),
    now,
  );
  assert.equal(r.run, false);
  if (!r.run) assert.equal(r.reason, "interval_not_due");
});

// ── isLockClaimable ────────────────────────────────────────────

test("lock=null → reclamable", () => {
  assert.equal(isLockClaimable(null, now, 60_000), true);
});

test("lock reciente dentro de TTL → NO reclamable", () => {
  const locked = new Date(now.getTime() - 30_000); // 30s atrás
  assert.equal(isLockClaimable(locked, now, 60_000), false);
});

test("lock viejo (mayor que TTL) → reclamable", () => {
  const locked = new Date(now.getTime() - 120_000); // 2 min atrás
  assert.equal(isLockClaimable(locked, now, 60_000), true);
});

test("lock exactamente en el límite del TTL → reclamable", () => {
  const locked = new Date(now.getTime() - 60_000);
  assert.equal(isLockClaimable(locked, now, 60_000), true);
});
