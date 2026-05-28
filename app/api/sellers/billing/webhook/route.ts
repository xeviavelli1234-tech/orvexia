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

  // Idempotencia: Stripe puede reenviar el mismo evento varias veces. No
  // llevamos un registro de event.id porque TODOS los handlers de aquí son
  // idempotentes por diseño (updates absolutos: plan=PRO/TRIAL dan siempre el
  // mismo estado final, sin acumulación ni side-effects). Si en el futuro se
  // añaden efectos NO idempotentes (enviar email de bienvenida, generar una
  // factura, sumar créditos…), AÑADIR aquí deduplicación por event.id (tabla
  // ProcessedStripeEvent con insert único antes de procesar).
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const sellerAccountId =
          s.client_reference_id ?? s.metadata?.sellerAccountId ?? null;
        // Solo conceder PRO si es realmente una suscripción y está pagada.
        // En trials de 14 días el primer importe es 0 € → payment_status es
        // "no_payment_required"; lo aceptamos. Rechazamos sesiones impagas
        // (async) o de otro mode para que nadie obtenga PRO sin cobro válido.
        const validPayment =
          s.payment_status === "paid" ||
          s.payment_status === "no_payment_required";
        if (sellerAccountId && s.mode === "subscription" && validPayment) {
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
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const acc = await prisma.sellerAccount.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (acc) {
          // active/trialing → PRO. past_due se mantiene en PRO (periodo de
          // gracia: Stripe reintenta el cobro). El resto degrada a TRIAL.
          const live =
            sub.status === "active" ||
            sub.status === "trialing" ||
            sub.status === "past_due";
          const plan = live ? "PRO" : "TRIAL";
          if (acc.plan !== plan) {
            await prisma.sellerAccount.update({
              where: { id: acc.id },
              data: { plan, intervalSeconds: intervalForPlan(plan) },
            });
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const acc = await prisma.sellerAccount.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (acc) {
          // El enum de plan solo tiene TRIAL|PRO, así que al cancelar volvemos
          // a TRIAL. Pero forzamos trialEndsAt al pasado (época) para que el
          // gating lo trate como prueba EXPIRADA y NO reactive el reprecio
          // gratis. Sin esto, un cliente que cancela pronto recuperaría días
          // de trial sin pagar.
          await prisma.sellerAccount.update({
            where: { id: acc.id },
            data: {
              plan: "TRIAL",
              intervalSeconds: intervalForPlan("TRIAL"),
              trialEndsAt: new Date(0),
            },
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
