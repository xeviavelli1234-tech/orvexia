import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getBillingState, PRO_PRICE_EUR, type SellerPlan } from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";

export const metadata = { title: "Facturación · Orvexia Repricer" };

const STATUS: Record<string, { kind: "ok" | "err" | "info"; text: string }> = {
  upgraded: { kind: "ok", text: "¡Bienvenido a Pro! Tu plan ya está activo." },
  cancelled: { kind: "info", text: "Has cancelado el proceso de pago. Sigues en plan de prueba." },
  stripe_not_configured: {
    kind: "err",
    text: "La pasarela de pago aún no está configurada (faltan claves de Stripe).",
  },
  stripe_error: { kind: "err", text: "Error con Stripe. Inténtalo de nuevo o contacta soporte." },
  connect_first: { kind: "err", text: "Primero conecta o activa tu cuenta en el panel." },
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
  const msg = status ? STATUS[status] : null;

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
                Tu prueba ha terminado. El reprecio está pausado hasta que actualices a Pro.
              </span>
            ) : (
              <>
                Te quedan <strong>{billing.trialDaysLeft} días</strong> de prueba. Reprecio
                cada {billing.intervalMinutes} min.
              </>
            )}
          </p>
        )}
        {billing.plan === "PRO" && (
          <>
            <p className="mt-4 text-sm text-fg/70">
              Plan Pro activo. Reprecio cada {billing.intervalMinutes} min. Gracias por
              confiar en Orvexia 💜
            </p>
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

      {/* Upgrade a Pro */}
      {billing.plan !== "PRO" && (
        <div className="mt-6 rounded-2xl border border-[var(--brand-200)] bg-bg p-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">{PRO_PRICE_EUR} €</span>
            <span className="text-fg/60">/mes</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-fg/70">
            <li>✓ Reprecio cada 5 minutos (vs 15 en prueba)</li>
            <li>✓ Productos ilimitados</li>
            <li>✓ Historial completo de cambios</li>
            <li>✓ Soporte por email</li>
            <li>✓ Cancela cuando quieras</li>
          </ul>

          {stripeReady ? (
            <form action="/api/sellers/billing/checkout" method="post" className="mt-6">
              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--brand-600)] text-white px-6 py-3 font-semibold hover:bg-[var(--brand-700)] transition-colors"
              >
                Pasar a Pro
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              <strong>Pasarela de pago en configuración.</strong> El checkout se activará
              cuando se conecten las claves de Stripe. La lógica de planes ya está lista:
              en cuanto haya claves, este botón funcionará sin tocar más código.
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/sellers/facturacion/factura"
          className="text-sm font-semibold text-[var(--brand-600)] hover:underline"
        >
          {billing.plan === "PRO"
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
