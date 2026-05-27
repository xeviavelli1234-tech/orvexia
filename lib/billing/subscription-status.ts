/**
 * Helpers de estado de suscripción Stripe.
 *
 * Centralizado aquí para evitar duplicar la lectura de la suscripción entre
 * la página de facturación y el ActivityPanel del centro de control.
 *
 * Best-effort: si Stripe falla, devolvemos null sin romper la página.
 */
import { getStripe } from "@/lib/stripe";

export interface SubscriptionStatus {
  /** La suscripción está marcada para cancelarse al final del período. */
  cancelAtPeriodEnd: boolean;
  /** Fecha de finalización del periodo / cancelación efectiva. */
  endsAt: Date | null;
  /** Estado bruto de Stripe (trialing | active | canceled | ...). */
  rawStatus: string;
  /** Si la suscripción está en periodo de prueba (trial gratis). */
  isTrialing: boolean;
}

export async function getSubscriptionStatus(
  stripeSubscriptionId: string | null,
): Promise<SubscriptionStatus | null> {
  if (!stripeSubscriptionId) return null;
  try {
    const stripe = await getStripe();
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    // En la API moderna current_period_end vive por item. Stripe también
    // expone `cancel_at` cuando hay cancelación programada — más simple.
    const endTs =
      sub.cancel_at ?? sub.items?.data?.[0]?.current_period_end ?? null;
    return {
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      endsAt: endTs ? new Date(endTs * 1000) : null,
      rawStatus: sub.status,
      isTrialing: sub.status === "trialing",
    };
  } catch (e) {
    console.warn("[subscription-status] no se pudo leer la suscripcion:", e);
    return null;
  }
}

/** Días restantes hasta una fecha futura (0 si ya pasó). Redondea hacia arriba. */
export function daysUntil(endsAt: Date | null, now: Date = new Date()): number {
  if (!endsAt) return 0;
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
