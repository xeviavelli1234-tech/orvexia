import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import {
  getStripe,
  isStripeConfigured,
  STRIPE_PRICE_ID,
  STRIPE_PRICE_ID_MONITOR,
} from "@/lib/stripe";
import { isPaidPlan, type SellerPlan } from "@/lib/billing";
import { getBaseUrl } from "@/lib/url";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isSellerIpDenied } from "@/lib/security/seller-access";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?next=/sellers/facturacion", req.url));
  }
  // La allowlist de IP también protege esta superficie (el layout no cubre /api).
  if (await isSellerIpDenied(session.userId)) {
    return NextResponse.redirect(new URL("/sellers/facturacion", req.url));
  }

  // Evita abuso: crear sesiones de checkout es barato pero llama a Stripe.
  // 10 intentos/min por usuario es de sobra para un humano.
  if (rateLimit("billing-checkout", session.userId, 10, 60_000)) {
    return NextResponse.redirect(
      new URL("/sellers/facturacion?status=rate_limited", req.url),
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.redirect(
      new URL("/sellers/facturacion?status=stripe_not_configured", req.url),
    );
  }

  const account = await getSellerAccountByUserId(session.userId);
  if (!account) {
    return NextResponse.redirect(new URL("/dashboard?status=connect_first", req.url));
  }

  // Plan solicitado: "monitor" (9 €/mes, solo vigilancia) o "pro" (por
  // defecto, compatible con el formulario histórico sin campo `plan`).
  const form = await req.formData().catch(() => null);
  const requestedPlan: SellerPlan =
    form?.get("plan") === "monitor" ? "MONITOR" : "PRO";
  const priceId =
    requestedPlan === "MONITOR" ? STRIPE_PRICE_ID_MONITOR() : STRIPE_PRICE_ID();
  if (!priceId) {
    return NextResponse.redirect(
      new URL("/sellers/facturacion?status=stripe_not_configured", req.url),
    );
  }

  // Idempotencia de suscripción: si la cuenta ya tiene un plan de pago
  // (suscripción activa, en prueba o en gracia past_due) no creamos una segunda.
  // Sin esta guarda, un POST repetido a este endpoint (doble submit,
  // back+resubmit, POST manual con la cookie) abría una 2ª suscripción sobre el
  // mismo customer: el webhook sobrescribía stripeSubscriptionId con la nueva y
  // la antigua quedaba HUÉRFANA cobrando cada mes sin poder cancelarse desde la
  // app. El cambio Monitor↔Pro se hace cancelando desde el portal y volviendo
  // a contratar (o desde el portal de Stripe si se configuran ambos productos).
  //
  // La discriminación es por `plan` (la señal autoritativa: el webhook lo pone
  // PRO/MONITOR mientras la suscripción está viva y lo degrada a TRIAL al
  // churn), NO por stripeSubscriptionId: un impago vía
  // customer.subscription.updated deja la cuenta en TRIAL pero podría conservar
  // un stripeSubscriptionId obsoleto, y bloquear por ese id dejaría al cliente
  // sin poder volver a pagar nunca.
  if (isPaidPlan(account.plan as SellerPlan)) {
    return NextResponse.redirect(
      new URL("/sellers/facturacion?status=already_subscribed", req.url),
    );
  }

  try {
    const stripe = await getStripe();
    const base = getBaseUrl(req);

    // Trial: 14 días gratis SOLO si es la primera suscripción del usuario
    // (sin stripeCustomerId previo). Evita que alguien se dé de baja y se
    // reaproveche del trial otra vez. Coincide con TRIAL_DAYS=14 de
    // lib/billing.ts → la UI ya promete "14 días de prueba".
    let stripeCustomerId: string | null = account.stripeCustomerId;
    let isFirstSubscription = !stripeCustomerId;

    // Construye la sesión de checkout. Si el stripeCustomerId guardado en DB
    // ya no existe en Stripe (caso típico: customer creado en Test mode y
    // ahora estamos en Live), Stripe lanza `resource_missing`. Detectamos ese
    // error, vaciamos el ID obsoleto en DB y reintentamos sin `customer:`
    // para que Stripe cree uno nuevo.
    const buildPayload = (customerId: string | null) => ({
      mode: "subscription" as const,
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId ?? undefined,
      customer_email: customerId ? undefined : session.email,
      client_reference_id: account.id,
      metadata: {
        sellerAccountId: account.id,
        userId: session.userId,
        plan: requestedPlan,
      },
      subscription_data: {
        metadata: { sellerAccountId: account.id, plan: requestedPlan },
        // Trial de 14 días SOLO en Pro y solo en la primera suscripción: el
        // plan TRIAL de la app ya equivale al Pro completo. Monitor (9 €) se
        // cobra desde el primer día — es el tier de entrada, no una prueba.
        ...(requestedPlan === "PRO" && (isFirstSubscription || !customerId)
          ? { trial_period_days: 14 }
          : {}),
      },
      // Stripe Live exige consentimiento explícito. El checkbox sólo aparece si la
      // URL de Términos del Servicio está configurada en Stripe Dashboard →
      // Settings → Public details → "Terms of service URL" = https://www.orvexia.es/terminos.
      // Si la URL no está configurada, Stripe ignora `consent_collection` y el
      // checkout sigue funcionando (no rompe nada en Test mode).
      consent_collection: { terms_of_service: "required" as const },
      // Mensaje legal sobre el botón de pago (siempre visible).
      custom_text: {
        terms_of_service_acceptance: {
          message:
            "Al suscribirte aceptas los [Términos del Servicio](https://www.orvexia.es/terminos) y la [Política de Privacidad](https://www.orvexia.es/politica-privacidad) de Orvexia. Suscripción mensual, sin permanencia.",
        },
      },
      success_url: `${base}/sellers/facturacion?status=upgraded`,
      cancel_url: `${base}/sellers/facturacion?status=cancelled`,
    });

    let checkout;
    try {
      checkout = await stripe.checkout.sessions.create(buildPayload(stripeCustomerId));
    } catch (innerErr) {
      // Detectar 'No such customer' (resource_missing param=customer).
      const e = innerErr as { code?: string; param?: string };
      if (e?.code === "resource_missing" && e?.param === "customer") {
        console.warn(
          `[billing/checkout] customer obsoleto (${stripeCustomerId}); limpiando DB y reintentando sin customer`,
        );
        await prisma.sellerAccount.update({
          where: { id: account.id },
          data: { stripeCustomerId: null, stripeSubscriptionId: null },
        });
        stripeCustomerId = null;
        isFirstSubscription = true;
        checkout = await stripe.checkout.sessions.create(buildPayload(null));
      } else {
        throw innerErr;
      }
    }

    if (!checkout.url) {
      return NextResponse.redirect(
        new URL("/sellers/facturacion?status=stripe_error", req.url),
      );
    }
    return NextResponse.redirect(checkout.url, { status: 303 });
  } catch (e) {
    console.error("[billing/checkout] failed:", e);
    return NextResponse.redirect(
      new URL("/sellers/facturacion?status=stripe_error", req.url),
    );
  }
}
