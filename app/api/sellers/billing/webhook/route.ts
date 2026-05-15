import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { intervalForPlan } from "@/lib/billing";

// Stripe necesita el body crudo para verificar la firma.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = STRIPE_WEBHOOK_SECRET();
  if (!sig || !secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = await getStripe();
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    console.error("[billing/webhook] signature verify failed:", e);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const sellerAccountId =
          s.client_reference_id ?? s.metadata?.sellerAccountId ?? null;
        if (sellerAccountId) {
          await prisma.sellerAccount.update({
            where: { id: sellerAccountId },
            data: {
              plan: "PRO",
              intervalSeconds: intervalForPlan("PRO"),
              stripeCustomerId:
                typeof s.customer === "string" ? s.customer : undefined,
              stripeSubscriptionId:
                typeof s.subscription === "string" ? s.subscription : undefined,
            },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const acc = await prisma.sellerAccount.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (acc) {
          await prisma.sellerAccount.update({
            where: { id: acc.id },
            data: { plan: "TRIAL", intervalSeconds: intervalForPlan("TRIAL") },
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[billing/webhook] handler error:", e);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
