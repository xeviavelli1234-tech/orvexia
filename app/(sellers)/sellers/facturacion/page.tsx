import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import {
  getBillingState,
  isPaidPlan,
  MONITOR_PRICE_EUR,
  PRO_PRICE_EUR,
  type SellerPlan,
} from "@/lib/billing";
import { getSubscriptionStatus } from "@/lib/billing/subscription-status";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";
import BillingProfileForm from "./BillingProfileForm";

export const metadata = { title: "Facturación · Orvexia Repricer" };

const STATUS: Record<string, { kind: "ok" | "err" | "info"; text: string }> = {
  upgraded: { kind: "ok", text: "¡Plan activado! Gracias por confiar en Orvexia." },
  cancelled: { kind: "info", text: "Has cancelado el proceso de pago. Sigues en plan de prueba." },
  already_subscribed: {
    kind: "info",
    text: "Ya tienes una suscripción activa. Para cambiar de plan, cancélala primero desde «Gestionar suscripción» y contrata el nuevo.",
  },
  stripe_not_configured: {
    kind: "err",
    text: "La pasarela de pago aún no está configurada (faltan claves de Stripe).",
  },
  stripe_error: { kind: "err", text: "Error con Stripe. Inténtalo de nuevo o contacta soporte." },
  connect_first: { kind: "err", text: "Primero conecta o activa tu cuenta en el panel." },
  rate_limited: { kind: "err", text: "Demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo." },
};

export default async function FacturacionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/sellers/facturacion");

  const { status } = await searchParams;
  const account = await getSellerAccountByUserId(session.userId);

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
        <p className="mt-4 text-fg/70">
          Primero activa tu cuenta en el{" "}
          <Link href="/dashboard" className="text-[var(--brand-600)] underline">
            panel
          </Link>
          .
        </p>
      </div>
    );
  }

  const billing = getBillingState(account.plan as SellerPlan, account.trialEndsAt);
  const stripeReady = isStripeConfigured();
  const [skuCount, subStatus] = await Promise.all([
    prisma.sellerListing.count({ where: { sellerAccountId: account.id } }),
    stripeReady ? getSubscriptionStatus(account.stripeSubscriptionId) : Promise.resolve(null),
  ]);
  const cancellation =
    subStatus?.cancelAtPeriodEnd && subStatus.endsAt
      ? { endsAt: subStatus.endsAt }
      : null;
  const msg = status ? STATUS[status] : null;
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
      <p className="mt-2 text-fg/60">Gestiona tu plan de Orvexia Repricer.</p>

      {msg && (
        <div
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            msg.kind === "ok"
              ? "bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-300)]"
              : msg.kind === "err"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-200)]"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Plan actual */}
      <div className="mt-8 rounded-2xl border border-fg/10 bg-bg p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-fg/50">Plan actual</div>
            <div className="mt-1 text-2xl font-bold">{billing.label}</div>
          </div>
          <span
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
              billing.plan === "PRO"
                ? "bg-[var(--accent-100)] text-[var(--accent-700)]"
                : "bg-[var(--brand-50)] text-[var(--brand-700)]"
            }`}
          >
            {billing.plan}
          </span>
        </div>

        {billing.plan === "TRIAL" && (
          <p className="mt-4 text-sm text-fg/70">
            {billing.trialExpired ? (
              <span className="text-red-600 font-semibold">
                Tu prueba ha terminado. El reprecio está pausado hasta que contrates un plan.
              </span>
            ) : (
              <>
                Te quedan <strong>{billing.trialDaysLeft} días</strong> de prueba. Reprecio
                cada {billing.intervalMinutes} min.
              </>
            )}
          </p>
        )}
        {isPaidPlan(billing.plan) && (
          <>
            <p className="mt-4 text-sm text-fg/70">
              {billing.plan === "PRO" ? (
                <>
                  Plan Pro activo. Reprecio cada {billing.intervalMinutes} min. Gracias por
                  confiar en Orvexia 💜
                </>
              ) : (
                <>
                  Plan Monitor activo. Vigilamos tu competencia y la Buy Box cada{" "}
                  {billing.intervalMinutes} min y te avisamos; tus precios en Amazon{" "}
                  <strong>no se modifican nunca</strong>.
                </>
              )}
            </p>
            {cancellation && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                <strong>Suscripción cancelada.</strong> Mantienes el acceso
                hasta el <strong>{fmtDate(cancellation.endsAt)}</strong>. A partir
                de esa fecha tu cuenta pasará a TRIAL y el servicio se detendrá.
                Si cambias de idea, puedes reactivarla desde &quot;Gestionar
                suscripción&quot;.
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {stripeReady && account.stripeCustomerId && (
                <form action="/api/sellers/billing/portal" method="post">
                  <button
                    type="submit"
                    className="rounded-lg border border-fg/15 px-5 py-2.5 text-sm font-semibold hover:bg-fg/[0.04] transition-colors"
                  >
                    Gestionar suscripción
                  </button>
                </form>
              )}
              <Link
                href="/sellers/facturacion/factura"
                className="rounded-lg border border-fg/15 px-5 py-2.5 text-sm font-semibold hover:bg-fg/[0.04] transition-colors"
              >
                Descargar factura (IVA)
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Planes disponibles */}
      {!isPaidPlan(billing.plan) && (
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {/* Monitor */}
          <div className="rounded-2xl border border-fg/10 bg-bg p-6 flex flex-col">
            <div className="text-sm font-bold">Plan Monitor</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                {MONITOR_PRICE_EUR} €
              </span>
              <span className="text-fg/60">/mes</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-fg/70 flex-1">
              <li>✓ Vigilancia de competencia y Buy Box cada 15 min</li>
              <li>✓ Alertas: Buy Box perdida/recuperada, dumpers, mínimos</li>
              <li>✓ Precio sugerido por el motor (sin aplicarlo)</li>
              <li>✓ Email, Slack, Telegram y Discord</li>
              <li className="font-semibold">✗ No modifica tus precios en Amazon</li>
            </ul>
            {stripeReady ? (
              <form action="/api/sellers/billing/checkout" method="post" className="mt-6">
                <input type="hidden" name="plan" value="monitor" />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-[var(--brand-400)] text-[var(--brand-700)] dark:text-[var(--brand-200)] px-6 py-3 font-semibold hover:bg-[var(--brand-50)] dark:hover:bg-[var(--brand-500)]/10 transition-colors"
                >
                  Contratar Monitor
                </button>
              </form>
            ) : null}
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-[var(--brand-200)] bg-bg p-6 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-bold">Plan Pro</div>
              <span className="text-xs text-fg/55">
                Catálogo: <strong className="text-fg/80">{skuCount}</strong> SKU
                {skuCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                {PRO_PRICE_EUR} €
              </span>
              <span className="text-fg/60">/mes</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-fg/70 flex-1">
              <li>✓ Todo lo del plan Monitor</li>
              <li>✓ Reprecio automático cada 5 minutos</li>
              <li>✓ Productos ilimitados</li>
              <li>✓ Historial completo de cambios</li>
              <li>✓ Soporte por email</li>
            </ul>
            {stripeReady ? (
              <form action="/api/sellers/billing/checkout" method="post" className="mt-6">
                <input type="hidden" name="plan" value="pro" />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[var(--brand-600)] text-white px-6 py-3 font-semibold hover:bg-[var(--brand-700)] transition-colors"
                >
                  Pasar a Pro
                </button>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {!isPaidPlan(billing.plan) &&
        (stripeReady ? (
          <p className="mt-3 text-[11px] text-fg/50 leading-relaxed">
            Al contratar aceptas los{" "}
            <Link href="/terminos" className="underline hover:text-[var(--brand-600)]">
              Términos del Servicio
            </Link>{" "}
            y la{" "}
            <Link href="/politica-privacidad" className="underline hover:text-[var(--brand-600)]">
              Política de Privacidad
            </Link>
            . Suscripción mensual recurrente sin permanencia, cancela cuando
            quieras. Ambos planes incluyen IVA.
          </p>
        ) : (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
            <strong>Pasarela de pago en configuración.</strong> El checkout se activará
            cuando se conecten las claves de Stripe. La lógica de planes ya está lista:
            en cuanto haya claves, los botones funcionarán sin tocar más código.
          </div>
        ))}

      {/* Upsell Monitor → Pro */}
      {billing.plan === "MONITOR" && (
        <div className="mt-6 rounded-2xl border border-fg/10 bg-bg p-6">
          <div className="text-sm font-bold">¿Quieres que el motor aplique los precios por ti?</div>
          <p className="mt-2 text-sm text-fg/70">
            Con el plan Pro ({PRO_PRICE_EUR} €/mes) el mismo motor que hoy te
            avisa pasa a repreciar automáticamente cada 5 minutos, dentro de
            tus mínimos y máximos. Para cambiar de plan, cancela tu suscripción
            Monitor desde &quot;Gestionar suscripción&quot; y contrata Pro: el
            cambio es inmediato y no pierdes ninguna configuración.
          </p>
        </div>
      )}

      <BillingProfileForm
        initial={{
          billingName: account.billingName,
          billingTaxId: account.billingTaxId,
          billingAddress: account.billingAddress,
          billingCountry: account.billingCountry,
        }}
      />

      <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/sellers/facturacion/factura"
          className="text-sm font-semibold text-[var(--brand-600)] hover:underline"
        >
          {isPaidPlan(billing.plan)
            ? "Descargar factura (IVA) →"
            : "Ver ejemplo de factura con IVA →"}
        </Link>
        <p className="text-xs text-fg/50">
          Pagos procesados de forma segura por Stripe. Orvexia nunca almacena
          los datos de tu tarjeta.
        </p>
      </div>
    </div>
  );
}
