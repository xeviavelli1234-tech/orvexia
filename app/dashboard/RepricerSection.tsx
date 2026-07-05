import Link from "next/link";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getBillingState, type SellerPlan } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { REPRICER_ENABLED, REPRICER_PUBLIC } from "@/lib/featureFlags";

const STATUS_MESSAGES: Record<string, { kind: "ok" | "err" | "info"; text: string }> = {
  connected: { kind: "ok", text: "Cuenta de Amazon conectada correctamente." },
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
        <div
          className="reveal relative overflow-hidden rounded-3xl border border-brand-400/15 p-6 sm:p-7"
          style={{ background: "linear-gradient(160deg,#100d26 0%,#0a0819 55%,#070614 100%)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full halo-breathe"
            style={{ background: "radial-gradient(circle,rgba(129,140,248,0.20),transparent 65%)" }}
          />
          <div className="relative flex items-center justify-between gap-5 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">
                  Para vendedores de Amazon
                </span>
                <span className="inline-flex h-5 items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-2 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
                  En desarrollo
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.03em" }}>
                Orvexia <span className="text-shimmer-violet">Repricer</span>
              </h2>
              <p className="mt-1.5 text-sm text-white/55 max-w-md" style={{ textWrap: "pretty" }}>
                Módulo de reprecio para vendedores de Amazon en desarrollo.
                Disponible próximamente.
              </p>
            </div>
            <span className="flex items-center gap-2 text-white/40 font-semibold text-sm whitespace-nowrap">
              Próximamente
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] text-lg">
                ⏳
              </span>
            </span>
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
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : statusCfg.kind === "err"
                ? "border-red-400/25 bg-red-400/10 text-red-300"
                : "border-brand-400/25 bg-brand-400/10 text-brand-200"
          }`}
        >
          {statusCfg.text}
        </div>
      )}

      <Link
        href={connected ? "/sellers/productos" : "/dashboard/repricer"}
        className="reveal shine-on-hover group relative block overflow-hidden rounded-3xl border border-brand-400/15 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/35 hover:shadow-[0_24px_60px_-24px_rgba(99,102,241,0.55)]"
        style={{ background: "linear-gradient(160deg,#100d26 0%,#0a0819 55%,#070614 100%)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full halo-breathe"
          style={{ background: "radial-gradient(circle,rgba(129,140,248,0.20),transparent 65%)" }}
        />

        <div className="relative flex items-center justify-between gap-5 flex-wrap p-6 sm:p-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">
                Para vendedores de Amazon
              </span>
              {connected && (
                <span className="inline-flex h-5 items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" /> Conectado
                </span>
              )}
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.03em" }}>
              Orvexia <span className="text-shimmer-violet">Repricer</span>
            </h2>
            <p className="mt-1.5 text-sm text-white/55 max-w-md" style={{ textWrap: "pretty" }}>
              {connected ? (
                <>
                  Plan <strong className="text-white/80">{billing!.label}</strong> ·{" "}
                  {repricedCount} producto{repricedCount === 1 ? "" : "s"} con reprecio
                  activo · ciclo {billing!.intervalMinutes} min
                </>
              ) : (
                <>
                  Reprecia tus productos de Amazon automáticamente, o sube tu
                  catálogo en CSV.
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 text-white font-semibold text-sm whitespace-nowrap">
            {connected ? "Abrir panel" : "Descubrir"}
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-500 text-lg text-white transition-all group-hover:bg-brand-400"
              style={{ boxShadow: "0 8px 24px -6px rgba(99,102,241,0.85)" }}
            >
              →
            </span>
          </div>
        </div>
      </Link>

      {/* Acceso directo a (re)vincular el origen de datos. Solo si ya hay
          cuenta: sin conectar, el propio card ya lleva al hub de vinculación.
          Va FUERA del <Link> de arriba para no anidar anclas. */}
      {connected && (
        <div className="mt-3 flex justify-end">
          <Link
            href="/dashboard/repricer?relink=1"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-5 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
          >
            🔗 Vincular Amazon o CSV
          </Link>
        </div>
      )}
    </section>
  );
}
