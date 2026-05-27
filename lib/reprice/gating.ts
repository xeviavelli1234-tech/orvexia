/**
 * Decisiones puras sobre si una cuenta debe procesarse en este ciclo.
 *
 * El runner enlaza muchas señales (plan, intervalo, vacaciones, schedule,
 * lock). Aquí las extraemos a una función pura para poder testearlas sin
 * tocar Postgres ni SP-API.
 */

import { isRepricingAllowed, type SellerPlan } from "@/lib/billing";
import { isScheduleAllowed } from "./schedule";

export type GatingDecision =
  | { run: true }
  | { run: false; reason: GatingReason };

export type GatingReason =
  | "plan_expired"
  | "interval_not_due"
  | "vacation"
  | "out_of_schedule";

export interface AccountGatingState {
  plan: string;
  trialEndsAt: Date | null;
  lastRunAt: Date | null;
  intervalSeconds: number;
  vacationFrom: Date | null;
  vacationTo: Date | null;
  scheduleEnabled: boolean;
  scheduleStartHour: number;
  scheduleEndHour: number;
}

/**
 * Devuelve si una cuenta toca procesarse ahora.
 *  - force=true (disparo manual): salta intervalo y schedule, PERO sigue
 *    respetando vacaciones (es una pausa total intencional) y el gating de
 *    plan (TRIAL caducado no debe escribir en Amazon).
 *  - force=false (cron): aplica todas las puertas.
 *
 * Orden importa: primero plan (el peor caso del negocio), luego intervalo,
 * luego vacaciones, luego schedule. La razón devuelta refleja el primer
 * filtro que falla, igual que el comportamiento real del runner.
 */
export function shouldRunAccount(
  account: AccountGatingState,
  now: Date,
  opts: { force?: boolean } = {},
): GatingDecision {
  const force = opts.force === true;

  if (!isRepricingAllowed(account.plan as SellerPlan, account.trialEndsAt, now)) {
    return { run: false, reason: "plan_expired" };
  }

  if (!force && account.lastRunAt) {
    const nextDue =
      account.lastRunAt.getTime() + account.intervalSeconds * 1000;
    if (now.getTime() < nextDue) {
      return { run: false, reason: "interval_not_due" };
    }
  }

  if (account.vacationFrom && account.vacationTo) {
    const t = now.getTime();
    if (
      t >= account.vacationFrom.getTime() &&
      t <= account.vacationTo.getTime()
    ) {
      return { run: false, reason: "vacation" };
    }
  }

  if (
    !force &&
    !isScheduleAllowed(
      account.scheduleEnabled,
      account.scheduleStartHour,
      account.scheduleEndHour,
      now,
    )
  ) {
    return { run: false, reason: "out_of_schedule" };
  }

  return { run: true };
}

/**
 * Decide si el lock de una cuenta es reclamable. El claim REAL es una
 * `updateMany` atómica en el runner — esto solo replica la condición para
 * tests deterministas.
 */
export function isLockClaimable(
  lockedAt: Date | null,
  now: Date,
  lockTtlMs: number,
): boolean {
  if (lockedAt == null) return true;
  return now.getTime() - lockedAt.getTime() >= lockTtlMs;
}
