/**
 * Lógica de planes — FUNCIONES PURAS, testeables.
 *
 * Plan TRIAL: 14 días gratis, reprecio cada 15 min.
 * Plan PRO:   29 €/mes, reprecio cada 5 min.
 */

export type SellerPlan = "TRIAL" | "PRO";

export const PRO_PRICE_EUR = 29;
export const TRIAL_DAYS = 14;

const INTERVAL_BY_PLAN: Record<SellerPlan, number> = {
  TRIAL: 900, // 15 min
  PRO: 300, // 5 min
};

export function intervalForPlan(plan: SellerPlan): number {
  return INTERVAL_BY_PLAN[plan];
}

export function planLabel(plan: SellerPlan): string {
  return plan === "PRO" ? "Pro" : "Prueba gratuita";
}

/** Días restantes de trial (0 si ya expiró o no aplica). Redondea hacia arriba. */
export function trialDaysLeft(trialEndsAt: Date | null, now: Date = new Date()): number {
  if (!trialEndsAt) return 0;
  const ms = trialEndsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function isTrialExpired(
  plan: SellerPlan,
  trialEndsAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (plan === "PRO") return false;
  if (!trialEndsAt) return false;
  return now.getTime() >= trialEndsAt.getTime();
}

/**
 * ¿Debe el motor de reprecio procesar esta cuenta?
 * No si el trial expiró y no ha pasado a PRO.
 */
export function isRepricingAllowed(
  plan: SellerPlan,
  trialEndsAt: Date | null,
  now: Date = new Date(),
): boolean {
  return !isTrialExpired(plan, trialEndsAt, now);
}

export interface BillingState {
  plan: SellerPlan;
  label: string;
  trialDaysLeft: number;
  trialExpired: boolean;
  repricingAllowed: boolean;
  intervalMinutes: number;
}

export function getBillingState(
  plan: SellerPlan,
  trialEndsAt: Date | null,
  now: Date = new Date(),
): BillingState {
  const expired = isTrialExpired(plan, trialEndsAt, now);
  return {
    plan,
    label: planLabel(plan),
    trialDaysLeft: trialDaysLeft(trialEndsAt, now),
    trialExpired: expired,
    repricingAllowed: !expired,
    intervalMinutes: Math.round(intervalForPlan(plan) / 60),
  };
}
