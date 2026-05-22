import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/url";

// Portal de cliente de Stripe: el vendedor gestiona/cancela su suscripción,
// actualiza tarjeta o descarga facturas. Stripe aloja la UI.
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
  if (!account?.stripeCustomerId) {
    return NextResponse.redirect(
      new URL("/sellers/facturacion?status=stripe_error", req.url),
    );
  }

  try {
    const stripe = await getStripe();
    const base = getBaseUrl(req);
    const portal = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${base}/sellers/facturacion`,
    });
    return NextResponse.redirect(portal.url, { status: 303 });
  } catch (e) {
    console.error("[billing/portal] failed:", e);
    return NextResponse.redirect(
      new URL("/sellers/facturacion?status=stripe_error", req.url),
    );
  }
}
