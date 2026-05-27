/**
 * Lógica de planes — FUNCIONES PURAS, testeables.
 *
 * Plan TRIAL: 14 días gratis, reprecio cada 15 min, 50 SKUs máximo.
 * Plan PRO:   19 €/mes flat, reprecio cada 5 min, SKUs ilimitados.
 *
 * NOTA sobre los precios: hay UN solo plan Pro a 19 €/mes que coincide con
 * el producto único configurado en Stripe Live. Antes había tramos por
 * volumen (starter/growth/scale/unlimited) pero generaban inconsistencia
 * entre la factura interna y lo que cobra Stripe. Si en el futuro se vuelve
 * a precios escalonados, crear N productos en Stripe Live y elegir el price
 * dinámicamente en /api/sellers/billing/checkout.
 */

export type SellerPlan = "TRIAL" | "PRO";

export const PRO_PRICE_EUR = 19;
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

// ── Plan único Pro ──────────────────────────────────────────────────────────
// Mantenemos la forma de array para que el resto del código (landing,
// facturación, factura) siga iterando sobre PRICE_TIERS sin cambios mayores,
// pero ahora siempre hay un único elemento.
export interface PriceTier {
  id: string;
  label: string;
  maxSkus: number; // inclusivo; Infinity = ilimitado
  priceEur: number;
}

export const PRICE_TIERS: PriceTier[] = [
  { id: "pro", label: "Plan Pro", maxSkus: Infinity, priceEur: PRO_PRICE_EUR },
];

/** Tramo único: siempre el plan Pro. Mantengo la firma para no romper consumidores. */
export function tierForSkuCount(_skuCount: number): PriceTier {
  return PRICE_TIERS[0];
}

export function priceForSkuCount(_skuCount: number): number {
  return PRO_PRICE_EUR;
}

// ── Límite de productos con repricing ACTIVO ─────────────────────────────
// TRIAL: tope de 50 SKUs activos para probar el motor sin escalar.
// PRO:   sin límite (un solo precio cubre todo).
export const TRIAL_ACTIVE_LIMIT = 50;

export function repricingActiveLimit(
  plan: SellerPlan,
  _catalogCount: number,
): number {
  if (plan === "TRIAL") return TRIAL_ACTIVE_LIMIT;
  return Infinity;
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
