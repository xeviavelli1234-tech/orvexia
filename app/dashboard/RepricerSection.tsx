import Link from "next/link";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getBillingState, type SellerPlan } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { RunNowButton } from "@/app/(sellers)/sellers/dashboard/RunNowButton";
import { DisconnectButton } from "@/app/(sellers)/sellers/dashboard/DisconnectButton";

const STATUS_MESSAGES: Record<string, { kind: "ok" | "err" | "info"; text: string }> = {
  connected: { kind: "ok", text: "Cuenta de Amazon conectada correctamente." },
  demo_connected: {
    kind: "ok",
    text: "Modo demo activado. Todo funciona con datos de prueba (sin tocar Amazon real).",
  },
  disconnected: { kind: "info", text: "Cuenta de Amazon desconectada." },
  error_state_mismatch: { kind: "err", text: "La verificación CSRF falló. Reintenta la conexión." },
  error_token_exchange: { kind: "err", text: "No pudimos canjear el código con Amazon." },
  error_persist: { kind: "err", text: "No pudimos guardar la conexión. Reintenta." },
};

export async function RepricerSection({
  userId,
  status,
}: {
  userId: string;
  status?: string;
}) {
  const account = await getSellerAccountByUserId(userId);
  const isConnected = !!account?.active;
  const isDemo = account?.spApiEnv !== "production";
  const billing = account
    ? getBillingState(account.plan as SellerPlan, account.trialEndsAt)
    : null;
  const lastRun = account
    ? await prisma.repricingRun.findFirst({
        where: { sellerAccountId: account.id },
        orderBy: { startedAt: "desc" },
      })
    : null;

  const statusCfg = status
    ? STATUS_MESSAGES[status] ??
      (status.startsWith("error_")
        ? { kind: "err" as const, text: `Error: ${status.replace("error_", "")}` }
        : null)
    : null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="rounded-2xl border border-white/[0.08] bg-bg-elevated/60 overflow-hidden">
        {/* header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center gap-3 flex-wrap">
          <span className="w-1 h-7 rounded-full bg-[var(--brand-600)]" />
          <h2 className="text-lg font-bold">Orvexia Repricer</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400 px-2 py-0.5 rounded-full">
            Beta
          </span>
          {isConnected && isDemo && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg/50 bg-fg/5 px-2 py-0.5 rounded-full">
              Modo demo
            </span>
          )}
        </div>

        <div className="p-6">
          {statusCfg && (
            <div
              className={`mb-5 rounded-lg border px-4 py-2.5 text-sm ${
                statusCfg.kind === "ok"
                  ? "bg-[var(--accent-50)] text-[var(--accent-700)] border-[var(--accent-300)]"
                  : statusCfg.kind === "err"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-200)]"
              }`}
            >
              {statusCfg.text}
            </div>
          )}

          {!isConnected ? (
            <>
              <p className="text-fg/70 text-sm leading-relaxed max-w-xl">
                ¿Vendes en Amazon? Reprecia tus productos automáticamente dentro de un
                rango min/máx que tú defines. Pruébalo en modo demo (datos de prueba,
                sin conectar nada) o conecta tu cuenta real.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <form action="/api/sellers/demo/connect" method="post">
                  <button
                    type="submit"
                    className="rounded-lg bg-[var(--brand-600)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors"
                  >
                    Probar en modo demo
                  </button>
                </form>
                <a
                  href="/api/sellers/amazon/oauth/start"
                  className="inline-flex items-center gap-2 rounded-lg border border-fg/20 px-5 py-2.5 text-sm font-semibold hover:bg-fg/5 transition-colors"
                >
                  Conectar Amazon
                  <span className="text-[10px] font-bold uppercase bg-fg/10 px-1.5 py-0.5 rounded">
                    Beta
                  </span>
                </a>
                <Link
                  href="/sellers"
                  className="inline-flex items-center text-sm font-semibold text-[var(--brand-600)] hover:underline px-2 py-2.5"
                >
                  ¿Qué es esto? →
                </Link>
              </div>
            </>
          ) : (
            <>
              {billing?.plan === "TRIAL" && (
                <div
                  className={`mb-5 rounded-lg border px-4 py-2.5 text-sm flex items-center justify-between gap-3 flex-wrap ${
                    billing.trialExpired
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-200)]"
                  }`}
                >
                  <span>
                    {billing.trialExpired ? (
                      <>
                        <strong>Prueba terminada.</strong> Reprecio pausado hasta pasar a
                        Pro.
                      </>
                    ) : (
                      <>
                        Prueba gratuita: <strong>{billing.trialDaysLeft} días</strong>{" "}
                        restantes.
                      </>
                    )}
                  </span>
                  <Link
                    href="/sellers/facturacion"
                    className="rounded-md bg-[var(--brand-600)] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[var(--brand-700)] whitespace-nowrap"
                  >
                    Pasar a Pro →
                  </Link>
                </div>
              )}

              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <Row label="Seller ID" value={account!.amazonSellerId} mono />
                <Row label="Plan" value={billing!.label} />
                <Row label="Entorno" value={account!.spApiEnv} />
                <Row label="Intervalo" value={`${billing!.intervalMinutes} min`} />
                {lastRun && (
                  <>
                    <Row
                      label="Última ejecución"
                      value={new Intl.DateTimeFormat("es-ES", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(lastRun.startedAt)}
                    />
                    <Row
                      label="Último ciclo"
                      value={`${lastRun.listingsRepriced} reprecciados / ${lastRun.listingsProcessed}`}
                    />
                  </>
                )}
              </dl>

              <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-3 flex-wrap">
                  <Link
                    href="/sellers/productos"
                    className="rounded-lg bg-[var(--brand-600)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors"
                  >
                    Mis productos →
                  </Link>
                  <Link
                    href="/sellers/facturacion"
                    className="rounded-lg border border-fg/20 px-5 py-2.5 text-sm font-semibold hover:bg-fg/5 transition-colors"
                  >
                    Facturación
                  </Link>
                  <RunNowButton />
                </div>
                <DisconnectButton />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 py-0.5">
      <dt className="w-32 text-fg/50 shrink-0">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : ""}>{value}</dd>
    </div>
  );
}
