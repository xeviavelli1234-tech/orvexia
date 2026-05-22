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

// ── Planes por volumen de SKUs ───────────────────────────────────────────────
export interface PriceTier {
  id: string;
  label: string;
  maxSkus: number; // inclusivo; Infinity = ilimitado
  priceEur: number;
}

export const PRICE_TIERS: PriceTier[] = [
  { id: "starter", label: "Hasta 50 SKUs", maxSkus: 50, priceEur: 29 },
  { id: "growth", label: "Hasta 200 SKUs", maxSkus: 200, priceEur: 49 },
  { id: "scale", label: "Hasta 1.000 SKUs", maxSkus: 1000, priceEur: 99 },
  { id: "unlimited", label: "SKUs ilimitados", maxSkus: Infinity, priceEur: 149 },
];

/** Tramo de precio según el número de SKUs del catálogo. */
export function tierForSkuCount(skuCount: number): PriceTier {
  const n = Math.max(0, Math.floor(skuCount || 0));
  return (
    PRICE_TIERS.find((t) => n <= t.maxSkus) ??
    PRICE_TIERS[PRICE_TIERS.length - 1]
  );
}

export function priceForSkuCount(skuCount: number): number {
  return tierForSkuCount(skuCount).priceEur;
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
