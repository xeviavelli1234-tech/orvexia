import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getStripe, isStripeConfigured, STRIPE_PRICE_ID } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/url";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?next=/sellers/facturacion", req.url));
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
      line_items: [{ price: STRIPE_PRICE_ID(), quantity: 1 }],
      customer: customerId ?? undefined,
      customer_email: customerId ? undefined : session.email,
      client_reference_id: account.id,
      metadata: { sellerAccountId: account.id, userId: session.userId },
      subscription_data: {
        metadata: { sellerAccountId: account.id },
        ...(isFirstSubscription || !customerId ? { trial_period_days: 14 } : {}),
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
