import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getBillingState, TRIAL_DAYS, type SellerPlan } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { RunNowButton } from "@/app/(sellers)/sellers/dashboard/RunNowButton";
import { DisconnectButton } from "@/app/(sellers)/sellers/dashboard/DisconnectButton";

export const metadata = { title: "Repricer · Orvexia" };
export const dynamic = "force-dynamic";

const STATUS_MSG: Record<string, { kind: "ok" | "err" | "info"; text: string }> = {
  connected: { kind: "ok", text: "Cuenta de Amazon conectada correctamente." },
  demo_connected: { kind: "ok", text: "Modo demo activado. Datos de prueba, sin tocar Amazon real." },
  disconnected: { kind: "info", text: "Cuenta de Amazon desconectada." },
  error_state_mismatch: { kind: "err", text: "Verificación CSRF fallida. Reintenta la conexión." },
  error_token_exchange: { kind: "err", text: "No pudimos canjear el código con Amazon." },
  error_persist: { kind: "err", text: "No pudimos guardar la conexión. Reintenta." },
};

const REASON: Record<string, { label: string; cls: string }> = {
  competitor_undercut: { label: "Bajo competidor", cls: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20" },
  no_competition: { label: "Sin competencia", cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
  min_floor: { label: "Suelo (mín)", cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  max_ceiling: { label: "Techo (máx)", cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  no_change: { label: "Sin cambio", cls: "text-white/40 bg-white/[0.04] border-white/10" },
};

function eur(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function rel(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export default async function RepricerPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/repricer");
  const { status } = await searchParams;
  const statusCfg = status
    ? STATUS_MSG[status] ??
      (status.startsWith("error_")
        ? { kind: "err" as const, text: `Error: ${status.replace("error_", "")}` }
        : null)
    : null;

  const account = await getSellerAccountByUserId(session.userId);
  const connected = !!account?.active;

  // ── Estado NO conectado ────────────────────────────────────────────────
  if (!connected) {
    return (
      <main className="min-h-screen px-4 sm:px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <Header demo={false} live={false} />
          <StatusBanner cfg={statusCfg} />
          <div
            className="mt-6 neon-border rounded-3xl overflow-hidden"
          >
            <div
              className="relative bg-grid-cyber rounded-[calc(1.5rem-1px)] p-10 sm:p-16 text-center"
              style={{ background: "linear-gradient(150deg,#0b0d1c,#08091a 50%,#050913)" }}
            >
              <div className="absolute inset-0 bg-grid-cyber-fine opacity-40 pointer-events-none" />
              <div
                className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full halo-breathe pointer-events-none"
                style={{ background: "radial-gradient(ellipse,rgba(129,140,248,0.25),transparent 65%)" }}
              />
              <div className="relative">
                <div className="text-5xl mb-5">⚡</div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Activa tu repricer
                </h2>
                <p className="mt-3 text-white/55 text-sm max-w-md mx-auto leading-relaxed">
                  Pruébalo con datos de prueba (sin conectar nada) o conecta tu cuenta de
                  Amazon Seller real.
                </p>
                <div className="mt-7 flex flex-wrap gap-3 justify-center">
                  <form action="/api/sellers/demo/connect" method="post">
                    <button
                      type="submit"
                      className="rounded-xl bg-white text-[#0b0d1c] px-6 py-3 text-sm font-bold hover:bg-white/90 transition-colors"
                    >
                      Probar en modo demo
                    </button>
                  </form>
                  <a
                    href="/api/sellers/amazon/oauth/start"
                    className="rounded-xl border border-white/20 text-white px-6 py-3 text-sm font-semibold hover:bg-white/[0.06] transition-colors"
                  >
                    Conectar Amazon
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Estado conectado ───────────────────────────────────────────────────
  const billing = getBillingState(account!.plan as SellerPlan, account!.trialEndsAt);
  const isDemo = account!.spApiEnv !== "production";

  const [total, configured, activeCount, lastRun, events] = await Promise.all([
    prisma.sellerListing.count({ where: { sellerAccountId: account!.id } }),
    prisma.sellerListing.count({
      where: { sellerAccountId: account!.id, priceMin: { not: null }, priceMax: { not: null } },
    }),
    prisma.sellerListing.count({
      where: { sellerAccountId: account!.id, repricingEnabled: true },
    }),
    prisma.repricingRun.findFirst({
      where: { sellerAccountId: account!.id },
      orderBy: { startedAt: "desc" },
    }),
    prisma.repricingEvent.findMany({
      where: { listing: { sellerAccountId: account!.id } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { listing: { select: { title: true } } },
    }),
  ]);

  const trialPct = billing.plan === "TRIAL"
    ? Math.max(0, Math.min(100, Math.round((billing.trialDaysLeft / TRIAL_DAYS) * 100)))
    : 100;

  return (
    <main className="min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <Header demo={isDemo} live={billing.repricingAllowed} />
        <StatusBanner cfg={statusCfg} />

        {/* Plan / trial */}
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-bg-elevated/60 p-5 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="font-mono-ui text-[10px] uppercase tracking-wider text-white/40">
                Plan
              </div>
              <div className="mt-1 text-xl font-bold flex items-center gap-2">
                {billing.label}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    billing.plan === "PRO"
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-[var(--brand-500)]/15 text-[var(--brand-300)]"
                  }`}
                >
                  {billing.plan}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono-ui text-[10px] uppercase tracking-wider text-white/40">
                Intervalo de reprecio
              </div>
              <div className="mt-1 text-xl font-bold">{billing.intervalMinutes} min</div>
            </div>
          </div>

          {billing.plan === "TRIAL" && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={billing.trialExpired ? "text-red-400 font-semibold" : "text-white/55"}>
                  {billing.trialExpired
                    ? "Prueba terminada — reprecio pausado"
                    : `${billing.trialDaysLeft} de ${TRIAL_DAYS} días restantes`}
                </span>
                <Link
                  href="/sellers/facturacion"
                  className="text-[var(--brand-300)] font-semibold hover:underline"
                >
                  Pasar a Pro →
                </Link>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    billing.trialExpired ? "bg-red-500" : "bg-[var(--brand-500)]"
                  }`}
                  style={{ width: `${trialPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stat tiles */}
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Stat icon="📦" value={total} label="Productos" accent="#818CF8" />
          <Stat icon="🎯" value={`${configured}/${total}`} label="Con rango" accent="#5EEAD4" />
          <Stat icon="⚡" value={`${activeCount}/${total}`} label="Reprecio activo" accent="#A3E635" />
          <Stat
            icon="🔁"
            value={lastRun ? lastRun.listingsRepriced : 0}
            label="Último ciclo"
            accent="#F0ABFC"
          />
        </div>

        {/* Activity feed */}
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-bg-elevated/60 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 node-pulse" />
              Actividad reciente
            </h3>
            {lastRun && (
              <span className="font-mono-ui text-[10px] uppercase text-white/40">
                último ciclo {rel(lastRun.startedAt)}
              </span>
            )}
          </div>

          {events.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-white/45">
              Aún no hay actividad. Pulsa{" "}
              <strong className="text-white/70">&ldquo;Ejecutar reprecio ahora&rdquo;</strong>{" "}
              o espera al ciclo automático ({billing.intervalMinutes} min).
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {events.map((e) => {
                const r = REASON[e.reason] ?? REASON.no_change;
                const delta = e.priceAfter - e.priceBefore;
                const up = delta > 0.0001;
                const down = delta < -0.0001;
                return (
                  <li key={e.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-white/85">
                        {e.listing?.title ?? "Producto"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-white/40 flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${r.cls}`}
                        >
                          {r.label}
                        </span>
                        {e.competitorPrice != null && (
                          <span>comp. {eur(e.competitorPrice)}</span>
                        )}
                        <span>· {rel(e.createdAt)}</span>
                        {!e.success && <span className="text-red-400">· error</span>}
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="text-sm font-mono-ui text-white/55">
                        {eur(e.priceBefore)}
                        <span className="mx-1.5 text-white/30">→</span>
                        <span
                          className={
                            down
                              ? "text-emerald-300 font-bold"
                              : up
                                ? "text-cyan-300 font-bold"
                                : "text-white/55"
                          }
                        >
                          {eur(e.priceAfter)}
                        </span>
                      </div>
                      {(up || down) && (
                        <div
                          className={`text-[10px] font-mono-ui ${down ? "text-emerald-400" : "text-cyan-400"}`}
                        >
                          {down ? "▼" : "▲"} {eur(Math.abs(delta))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/sellers/productos"
              className="rounded-xl bg-[var(--brand-600)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors"
            >
              Mis productos →
            </Link>
            <Link
              href="/sellers/facturacion"
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold hover:bg-white/[0.06] transition-colors"
            >
              Facturación
            </Link>
            <RunNowButton />
          </div>
          <DisconnectButton />
        </div>
      </div>
    </main>
  );
}

function Header({ demo, live }: { demo: boolean; live: boolean }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/dashboard"
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          ← Panel
        </Link>
        <span className="text-white/20">/</span>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
          Orvexia <span className="text-gradient-neon">Repricer</span>
        </h1>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
          Beta
        </span>
        {demo && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 bg-white/[0.06] px-2 py-0.5 rounded-full">
            Modo demo
          </span>
        )}
      </div>
      <span
        className={`inline-flex items-center gap-1.5 font-mono-ui text-[10px] uppercase tracking-wider px-2.5 h-7 rounded-full border ${
          live
            ? "text-emerald-300 border-emerald-400/20 bg-emerald-400/[0.06]"
            : "text-amber-300 border-amber-400/20 bg-amber-400/[0.06]"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-400 node-pulse" : "bg-amber-400"}`}
        />
        {live ? "activo" : "pausado"}
      </span>
    </div>
  );
}

function StatusBanner({
  cfg,
}: {
  cfg: { kind: "ok" | "err" | "info"; text: string } | null;
}) {
  if (!cfg) return null;
  return (
    <div
      className={`mt-5 rounded-lg border px-4 py-2.5 text-sm ${
        cfg.kind === "ok"
          ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
          : cfg.kind === "err"
            ? "border-red-400/25 bg-red-400/[0.08] text-red-300"
            : "border-[var(--brand-400)]/25 bg-[var(--brand-500)]/[0.08] text-[var(--brand-300)]"
      }`}
    >
      {cfg.text}
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  accent,
}: {
  icon: string;
  value: string | number;
  label: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-bg-elevated/60 p-4 sm:p-5 relative overflow-hidden">
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}40, transparent 70%)` }}
      />
      <div className="text-lg">{icon}</div>
      <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-none tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 text-[11px] text-white/45">{label}</div>
    </div>
  );
}
