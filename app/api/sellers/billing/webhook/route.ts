import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  getStripe,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID_MONITOR,
} from "@/lib/stripe";
import { intervalForPlan, type SellerPlan } from "@/lib/billing";

/**
 * Plan que corresponde a una suscripción viva. Discrimina por el price ID del
 * primer item (fuente autoritativa: es lo que Stripe cobra); si no está
 * disponible cae a los metadata que grabamos en el checkout, y en última
 * instancia a PRO (comportamiento histórico de suscripción única).
 */
function planFromSubscription(sub: Stripe.Subscription): SellerPlan {
  const priceId = sub.items?.data?.[0]?.price?.id ?? "";
  const monitorPrice = STRIPE_PRICE_ID_MONITOR();
  if (monitorPrice && priceId === monitorPrice) return "MONITOR";
  if (priceId) return "PRO";
  return sub.metadata?.plan === "MONITOR" ? "MONITOR" : "PRO";
}

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
        // Solo conceder plan de pago si es realmente una suscripción y está
        // pagada. En trials de 14 días el primer importe es 0 € →
        // payment_status es "no_payment_required"; lo aceptamos. Rechazamos
        // sesiones impagas (async) o de otro mode para que nadie obtenga un
        // plan de pago sin cobro válido.
        const validPayment =
          s.payment_status === "paid" ||
          s.payment_status === "no_payment_required";
        // Plan contratado: viene de los metadata que grabó el checkout.
        // Sesiones antiguas sin `plan` = PRO (única oferta que existía).
        const paidPlan: SellerPlan =
          s.metadata?.plan === "MONITOR" ? "MONITOR" : "PRO";
        if (sellerAccountId && s.mode === "subscription" && validPayment) {
          await prisma.sellerAccount.update({
            where: { id: sellerAccountId },
            data: {
              plan: paidPlan,
              intervalSeconds: intervalForPlan(paidPlan),
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
          // active/trialing → plan de la suscripción (PRO o MONITOR según el
          // price). past_due se mantiene (periodo de gracia: Stripe reintenta
          // el cobro). El resto (unpaid, canceled, paused,
          // incomplete_expired…) degrada a TRIAL EXPIRADO.
          const live =
            sub.status === "active" ||
            sub.status === "trialing" ||
            sub.status === "past_due";
          if (live) {
            const paidPlan = planFromSubscription(sub);
            if (acc.plan !== paidPlan) {
              await prisma.sellerAccount.update({
                where: { id: acc.id },
                data: {
                  plan: paidPlan,
                  intervalSeconds: intervalForPlan(paidPlan),
                },
              });
            }
          } else {
            // CRÍTICO de facturación: al degradar a TRIAL forzamos trialEndsAt al
            // pasado (igual que .deleted). Sin esto, una cuenta que dejó de pagar
            // (unpaid/canceled vía .updated, sin .deleted) quedaba en TRIAL con
            // trialEndsAt todavía en el futuro → seguía repreciando GRATIS.
            const future =
              !acc.trialEndsAt || acc.trialEndsAt.getTime() > Date.now();
            if (acc.plan !== "TRIAL" || future || acc.stripeSubscriptionId) {
              await prisma.sellerAccount.update({
                where: { id: acc.id },
                data: {
                  plan: "TRIAL",
                  intervalSeconds: intervalForPlan("TRIAL"),
                  trialEndsAt: new Date(0),
                  // Desvincula la suscripción muerta (espejo de .deleted): sin
                  // esto la cuenta quedaba en TRIAL con un stripeSubscriptionId
                  // obsoleto que (a) bloqueaba re-suscribirse y (b) podía casar
                  // con un .updated tardío y "resucitarla" a PRO.
                  stripeSubscriptionId: null,
                },
              });
            }
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
          // Al cancelar cualquier plan de pago (PRO o MONITOR) volvemos a
          // TRIAL, pero forzamos trialEndsAt al pasado (época) para que el
          // gating lo trate como prueba EXPIRADA y NO reactive el reprecio
          // gratis. Sin esto, un cliente que cancela pronto recuperaría días
          // de trial sin pagar.
          await prisma.sellerAccount.update({
            where: { id: acc.id },
            data: {
              plan: "TRIAL",
              intervalSeconds: intervalForPlan("TRIAL"),
              trialEndsAt: new Date(0),
              // Desvincula la suscripción cancelada: evita que un
              // customer.subscription.updated reentregado/tardío vuelva a casar
              // con esta cuenta vía stripeSubscriptionId y la "resucite" a PRO.
              stripeSubscriptionId: null,
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
