import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getStripe, isStripeConfigured, STRIPE_PRICE_ID } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/url";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?next=/sellers/facturacion", req.url));
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
    const isFirstSubscription = !account.stripeCustomerId;

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID(), quantity: 1 }],
      customer: account.stripeCustomerId ?? undefined,
      customer_email: account.stripeCustomerId ? undefined : session.email,
      client_reference_id: account.id,
      metadata: { sellerAccountId: account.id, userId: session.userId },
      subscription_data: {
        metadata: { sellerAccountId: account.id },
        ...(isFirstSubscription ? { trial_period_days: 14 } : {}),
      },
      success_url: `${base}/sellers/facturacion?status=upgraded`,
      cancel_url: `${base}/sellers/facturacion?status=cancelled`,
    });

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
