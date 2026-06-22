import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { getBillingState, type SellerPlan } from "@/lib/billing";
import { getProfitSummary } from "@/lib/reprice/profit-data";
import { getCatalogHealth } from "@/lib/reprice/health";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Resumen · Orvexia Repricer" };
export const dynamic = "force-dynamic";

function eur(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function pct(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
}
function rel(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

const REASON: Record<string, string> = {
  competitor_undercut: "Bajo competidor",
  competitor_match: "Igualado",
  fixed_price: "Precio fijo",
  margin_floor: "Suelo margen",
  no_competition: "Sin competencia",
  buybox_probe: "Sondeo Buy Box",
  min_floor: "Suelo (mín)",
  max_ceiling: "Techo (máx)",
  hold: "Mantener",
  no_change: "Sin cambio",
};

const NAV_MAIN = [
  { href: "/sellers/resumen", label: "Resumen", icon: "grid", active: true },
  { href: "/sellers/productos", label: "Productos", icon: "box" },
  { href: "/sellers/beneficios", label: "Beneficios", icon: "coin" },
  { href: "/sellers/analiticas", label: "Analíticas", icon: "chart" },
];
const NAV_TOOLS = [
  { href: "/sellers/asistente-aprendizaje", label: "Asistente IA", icon: "spark" },
  { href: "/sellers/facturacion", label: "Facturación", icon: "card" },
];

export default async function ResumenPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/sellers/resumen");
  const account = await getSellerAccountByUserId(session.userId);
  if (!account || !account.active) redirect("/dashboard/repricer");

  const billing = getBillingState(account.plan as SellerPlan, account.trialEndsAt);

  const [profit, healthData, events, bbGroups, activeCount, totalCount] = await Promise.all([
    getProfitSummary(session.userId, 30),
    getCatalogHealth(session.userId),
    prisma.repricingEvent.findMany({
      where: { listing: { sellerAccountId: account.id } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { listing: { select: { title: true } } },
    }),
    prisma.sellerListing.groupBy({
      by: ["buyBoxStatus"],
      where: { sellerAccountId: account.id },
      _count: { _all: true },
    }),
    prisma.sellerListing.count({ where: { sellerAccountId: account.id, repricingEnabled: true } }),
    prisma.sellerListing.count({ where: { sellerAccountId: account.id } }),
  ]);

  const health = healthData.health;
  const profitPositive = profit.totals.profit >= 0;

  // Distribución Buy Box → donut
  const bb = { WON: 0, LOST: 0, UNKNOWN: 0 } as Record<string, number>;
  for (const g of bbGroups) bb[g.buyBoxStatus] = g._count._all;
  const bbTotal = bb.WON + bb.LOST + bb.UNKNOWN || 1;
  const wonPct = (bb.WON / bbTotal) * 100;
  const lostPct = (bb.LOST / bbTotal) * 100;
  const donut = `conic-gradient(var(--accent-500) 0 ${wonPct}%, #ef4444 ${wonPct}% ${wonPct + lostPct}%, rgba(255,255,255,0.08) ${wonPct + lostPct}% 100%)`;

  // Mini-barras: top SKUs por beneficio
  const topSkus = profit.bySku.slice(0, 5);
  const maxAbs = Math.max(1, ...topSkus.map((s) => Math.abs(s.profit)));

  const today = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="min-h-screen bg-void-deep text-fg">
      <div className="flex">
        {/* ── Sidebar (desktop) ─────────────────────────── */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col gap-6 border-r border-border bg-black/30 px-4 py-6 min-h-screen sticky top-0">
          <Link href="/dashboard" className="flex items-center gap-2 px-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent-500 to-brand-600 text-black font-extrabold">
              O
            </span>
            <span className="font-extrabold tracking-tight">
              Orvexia <span className="text-accent-300">Repricer</span>
            </span>
          </Link>

          <NavGroup title="Principal" items={NAV_MAIN} />
          <NavGroup title="Herramientas" items={NAV_TOOLS} />

          <div className="mt-auto card card-pad bg-gradient-to-br from-brand-600/15 to-accent-500/10 border-brand-500/25">
            <p className="eyebrow !text-brand-300">Plan {billing.label}</p>
            <p className="mt-1 text-sm text-fg-muted">
              Ciclo de reprecio cada <strong className="text-fg">{billing.intervalMinutes} min</strong>.
              {billing.plan === "TRIAL" && billing.trialDaysLeft > 0 && (
                <> Te quedan {billing.trialDaysLeft} días de prueba.</>
              )}
            </p>
            <Link href="/sellers/facturacion" className="btn btn-primary btn-sm btn-block mt-3">
              Mejorar plan
            </Link>
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────── */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-5 sm:py-7">
          {/* Topbar */}
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <h1 className="section-title text-2xl sm:text-3xl">Resumen</h1>
              <p className="text-xs text-fg-subtle capitalize">{today}</p>
            </div>
            <Link href="/sellers/productos" className="ml-auto btn btn-ghost btn-sm">
              Centro de control →
            </Link>
            <span className="hidden sm:grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-black font-bold">
              {(account.billingName || "S").slice(0, 1).toUpperCase()}
            </span>
          </div>

          {/* Mobile nav chips */}
          <div className="lg:hidden -mx-4 px-4 mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
            {[...NAV_MAIN, ...NAV_TOOLS].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`btn btn-sm shrink-0 ${n.active ? "btn-accent" : "btn-ghost"}`}
              >
                {n.label}
              </Link>
            ))}
          </div>

          {/* Bento grid */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Beneficio neto — KPI grande */}
            <section className="card card-pad lg:col-span-2 relative overflow-hidden">
              <div
                className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none halo-breathe"
                style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 65%)" }}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">▸ beneficio neto · 30 días</p>
                  <p className={`mt-2 text-4xl sm:text-5xl font-extrabold tabular ${profitPositive ? "text-accent-300 text-glow-cyan" : "text-danger-500"}`}>
                    {eur(profit.totals.profit)}
                  </p>
                  <p className="mt-1 text-sm text-fg-muted">
                    Margen {pct(profit.totals.marginPct)} · Ingreso {eur(profit.totals.revenue)} ·{" "}
                    {profit.totals.units} uds.
                  </p>
                </div>
                <Link href="/sellers/beneficios" className="btn btn-ghost btn-sm shrink-0">
                  Detalle →
                </Link>
              </div>

              {/* Mini-barras top SKUs */}
              <div className="relative mt-5">
                <p className="text-[11px] uppercase tracking-wider text-fg-subtle mb-2">
                  Top productos por beneficio
                </p>
                {topSkus.length === 0 ? (
                  <p className="text-sm text-fg-subtle">Sin ventas en el periodo todavía.</p>
                ) : (
                  <ul className="space-y-2">
                    {topSkus.map((s) => {
                      const w = (Math.abs(s.profit) / maxAbs) * 100;
                      const loss = s.profit < 0;
                      return (
                        <li key={s.sku} className="flex items-center gap-3">
                          <span className="w-32 sm:w-44 truncate text-sm text-fg-muted">{s.title || s.sku}</span>
                          <span className="flex-1 h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
                            <span
                              className="block h-full rounded-full"
                              style={{
                                width: `${w}%`,
                                background: loss
                                  ? "linear-gradient(90deg,#ef4444,#f97316)"
                                  : "linear-gradient(90deg,#10b981,#5eead4)",
                              }}
                            />
                          </span>
                          <span className={`w-20 text-right font-mono-ui text-xs ${loss ? "text-danger-500" : "text-accent-300"}`}>
                            {eur(s.profit)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* Salud del catálogo — barras */}
            <section className="card card-pad">
              <div className="flex items-center justify-between">
                <p className="eyebrow">▸ salud del catálogo</p>
                <span className={`text-2xl font-extrabold ${health.score >= 75 ? "text-accent-300" : health.score >= 55 ? "text-warn-500" : "text-danger-500"}`}>
                  {health.letter}
                </span>
              </div>
              <p className="mt-1 text-3xl font-extrabold tabular">{health.score}<span className="text-fg-subtle text-base">/100</span></p>
              <div className="mt-4 space-y-3">
                <Bar label="Activos" value={health.breakdown.active} color="#10b981" />
                <Bar label="Con rango mín/máx" value={health.breakdown.configured} color="#5eead4" />
                <Bar label="Con coste" value={health.breakdown.costed} color="#818cf8" />
                <Bar label="Buy Box ganada" value={health.breakdown.winning} color="#a3e635" />
              </div>
            </section>

            {/* KPIs rápidos */}
            <section className="grid grid-cols-2 gap-4 lg:col-span-1 lg:order-none">
              <Tile label="Repreciando" value={`${activeCount}/${totalCount}`} accent="accent" />
              <Tile label="Ciclo" value={`${billing.intervalMinutes} min`} accent="cyan" />
              <Tile label="SKUs con ventas" value={String(profit.bySku.length)} />
              <Tile label="Sin coste" value={String(profit.skusMissingCost)} accent={profit.skusMissingCost ? "warn" : undefined} />
            </section>

            {/* Buy Box donut */}
            <section className="card card-pad flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="h-28 w-28 rounded-full" style={{ background: donut }} />
                <div className="absolute inset-[10px] rounded-full bg-bg-elevated grid place-items-center">
                  <div className="text-center">
                    <div className="text-xl font-extrabold tabular text-accent-300">{Math.round(wonPct)}%</div>
                    <div className="text-[9px] uppercase text-fg-subtle">Buy Box</div>
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <p className="eyebrow">▸ buy box</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <LegendRow color="#10b981" label="Ganada" n={bb.WON} />
                  <LegendRow color="#ef4444" label="Perdida" n={bb.LOST} />
                  <LegendRow color="rgba(255,255,255,0.25)" label="Sin dato" n={bb.UNKNOWN} />
                </ul>
              </div>
            </section>

            {/* Actividad reciente — tabla */}
            <section className="card card-pad lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow">▸ actividad reciente</p>
                <Link href="/sellers/analiticas" className="text-xs text-accent-300 hover:text-fg">
                  Ver todo →
                </Link>
              </div>
              {events.length === 0 ? (
                <p className="text-sm text-fg-subtle">Aún no hay ciclos de reprecio. Lanza uno desde el Centro de control.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {events.map((e) => {
                    const delta = e.priceAfter - e.priceBefore;
                    const changed = Math.abs(delta) > 0.0001;
                    const status = !e.success ? "error" : changed ? (delta < 0 ? "down" : "up") : "hold";
                    return (
                      <li key={e.id} className="py-2.5 flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate text-sm text-fg">{e.listing?.title ?? "Producto"}</span>
                        <span className="hidden sm:inline text-xs text-fg-subtle">{REASON[e.reason] ?? e.reason}</span>
                        <span className="font-mono-ui text-xs text-fg-muted whitespace-nowrap">
                          {eur(e.priceBefore)} <span className="text-fg-faint">→</span> {eur(e.priceAfter)}
                        </span>
                        <span
                          className={
                            "badge " +
                            (status === "error"
                              ? "badge-danger"
                              : status === "down"
                                ? "badge-accent"
                                : status === "up"
                                  ? "badge-brand"
                                  : "badge-muted")
                          }
                        >
                          {status === "error" ? "Error" : status === "down" ? "▼" : status === "up" ? "▲" : "="}
                        </span>
                        <span className="hidden md:inline text-[10px] text-fg-faint whitespace-nowrap">{rel(e.createdAt)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Asistente IA */}
            <section className="card card-pad relative overflow-hidden flex flex-col">
              <div
                className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(129,140,248,0.22), transparent 65%)" }}
              />
              <p className="eyebrow !text-brand-300">✦ asistente ia</p>
              <p className="mt-2 font-semibold text-fg">¿Qué precios optimizo hoy?</p>
              <p className="mt-1 text-sm text-fg-muted flex-1">
                Analiza tu histórico, competencia y márgenes para recomendarte ajustes.
              </p>
              <Link href="/sellers/asistente-aprendizaje" className="btn btn-neon btn-sm mt-4 self-start">
                Abrir asistente →
              </Link>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavGroup({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string; active?: boolean }[];
}) {
  return (
    <nav>
      <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-faint mb-1.5">{title}</p>
      <ul className="space-y-0.5">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                it.active
                  ? "bg-accent-500/15 text-accent-300 font-semibold"
                  : "text-fg-muted hover:bg-white/[0.05] hover:text-fg"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${it.active ? "bg-accent-300" : "bg-fg-faint"}`} />
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-fg-muted">{label}</span>
        <span className="font-mono-ui text-fg-subtle">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "accent" | "cyan" | "warn";
}) {
  const c =
    accent === "accent"
      ? "text-accent-300"
      : accent === "cyan"
        ? "text-cyan-300"
        : accent === "warn"
          ? "text-warn-500"
          : "text-fg-strong";
  return (
    <div className="card card-hover px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-fg-subtle truncate">{label}</div>
      <div className={`mt-1 font-mono-ui text-xl font-extrabold tabular ${c}`}>{value}</div>
    </div>
  );
}

function LegendRow({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <li className="flex items-center gap-2 text-fg-muted">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="flex-1">{label}</span>
      <span className="font-mono-ui text-fg">{n}</span>
    </li>
  );
}
