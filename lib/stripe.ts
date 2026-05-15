import "server-only";
import type Stripe from "stripe";

/**
 * Stripe se carga de forma perezosa (dynamic import) para que la app NO se
 * rompa si el paquete aún no está instalado o las claves no están puestas.
 * Mientras no haya STRIPE_SECRET_KEY, la UI muestra "facturación no configurada".
 */

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_ID;
}

let cached: Stripe | null = null;

export async function getStripe(): Promise<Stripe> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no configurada");
  if (cached) return cached;
  const { default: StripeCtor } = await import("stripe");
  cached = new StripeCtor(key);
  return cached;
}

export const STRIPE_PRICE_ID = () => process.env.STRIPE_PRICE_ID ?? "";
export const STRIPE_WEBHOOK_SECRET = () => process.env.STRIPE_WEBHOOK_SECRET ?? "";
