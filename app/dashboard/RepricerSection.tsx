import Link from "next/link";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getBillingState, type SellerPlan } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { REPRICER_ENABLED, REPRICER_PUBLIC } from "@/lib/featureFlags";

const STATUS_MESSAGES: Record<string, { kind: "ok" | "err" | "info"; text: string }> = {
  connected: { kind: "ok", text: "Cuenta de Amazon conectada correctamente." },
  demo_connected: { kind: "ok", text: "Modo demo activado. Todo funciona con datos de prueba." },
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
  const connected = !!account?.active;

  // Pre-lanzamiento: NO se promociona al público (sin cuenta no se ve
  // nada), pero quien ya tiene la cuenta de Amazon conectada ve el
  // acceso directo al Centro de control desde el dashboard.
  if (!REPRICER_PUBLIC && !connected) return null;

  if (!REPRICER_ENABLED) {
    return (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="neon-border rounded-3xl overflow-hidden">
          <div
            className="relative bg-grid-cyber rounded-[calc(1.5rem-1px)] p-6 sm:p-7"
            style={{ background: "linear-gradient(150deg,#0b0d1c,#08091a 55%,#050913)" }}
          >
            <div className="absolute inset-0 bg-grid-cyber-fine opacity-30 pointer-events-none" />
            <div className="relative flex items-center justify-between gap-5 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80">
                    ▸ módulo b2b
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                    En desarrollo
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
                  Orvexia <span className="text-gradient-neon">Repricer</span>
                </h2>
                <p className="mt-1.5 text-sm text-white/55 max-w-md">
                  Módulo de reprecio para vendedores de Amazon en desarrollo.
                  Disponible próximamente.
                </p>
              </div>
              <span className="flex items-center gap-2 text-white/40 font-semibold text-sm whitespace-nowrap">
                Próximamente
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.06] text-lg">
                  ⏳
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const billing = account
    ? getBillingState(account.plan as SellerPlan, account.trialEndsAt)
    : null;
  const repricedCount = account
    ? await prisma.sellerListing.count({
        where: { sellerAccountId: account.id, repricingEnabled: true },
      })
    : 0;

  const statusCfg = status
    ? STATUS_MESSAGES[status] ??
      (status.startsWith("error_")
        ? { kind: "err" as const, text: `Error: ${status.replace("error_", "")}` }
        : null)
    : null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {statusCfg && (
        <div
          className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
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

      <Link
        href={connected ? "/sellers/productos" : "/dashboard/repricer"}
        className="group block neon-border rounded-3xl overflow-hidden"
      >
        <div
          className="relative bg-grid-cyber rounded-[calc(1.5rem-1px)] p-6 sm:p-7"
          style={{ background: "linear-gradient(150deg,#0b0d1c,#08091a 55%,#050913)" }}
        >
          <div className="absolute inset-0 bg-grid-cyber-fine opacity-30 pointer-events-none" />
          <div
            className="absolute -top-16 -right-12 w-56 h-56 rounded-full halo-breathe pointer-events-none"
            style={{ background: "radial-gradient(circle,rgba(129,140,248,0.20),transparent 65%)" }}
          />

          <div className="relative flex items-center justify-between gap-5 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80">
                  ▸ módulo b2b
                </span>
                {connected && account!.spApiEnv !== "production" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 bg-white/[0.06] px-2 py-0.5 rounded-full">
                    Modo demo
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
                Orvexia <span className="text-gradient-neon">Repricer</span>
              </h2>
              <p className="mt-1.5 text-sm text-white/55 max-w-md">
                {connected ? (
                  <>
                    Plan <strong className="text-white/80">{billing!.label}</strong> ·{" "}
                    {repricedCount} producto{repricedCount === 1 ? "" : "s"} con reprecio
                    activo · ciclo {billing!.intervalMinutes} min
                  </>
                ) : (
                  <>
                    Reprecia tus productos de Amazon automáticamente. Pruébalo en modo
                    demo sin conectar nada.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 text-white font-semibold text-sm whitespace-nowrap">
              {connected ? "Abrir panel" : "Descubrir"}
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors text-lg">
                →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
