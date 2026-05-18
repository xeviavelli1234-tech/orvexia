import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { listListingsByAccount } from "@/lib/db/sellerListing";
import { prisma } from "@/lib/prisma";
import { getBillingState, type SellerPlan } from "@/lib/billing";

export const metadata = { title: "Analíticas · Orvexia Repricer" };
export const dynamic = "force-dynamic";

const REASON: Record<string, { label: string; cls: string }> = {
  competitor_undercut: { label: "Bajo competidor", cls: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20" },
  competitor_match: { label: "Igualado", cls: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20" },
  fixed_price: { label: "Precio fijo", cls: "text-indigo-300 bg-indigo-400/10 border-indigo-400/20" },
  margin_floor: { label: "Suelo margen", cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  no_competition: { label: "Sin competencia", cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
  min_floor: { label: "Suelo (mín)", cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  max_ceiling: { label: "Techo (máx)", cls: "text-amber-300 bg-amber-400/10 border-amber-400/20" },
  hold: { label: "Mantener", cls: "text-white/50 bg-white/[0.05] border-white/10" },
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
function errorCode(msg: string | null): string {
  if (!msg) return "error";
  try {
    const j = JSON.parse(msg) as { errors?: Array<{ code?: string }> };
    if (j.errors?.[0]?.code) return j.errors[0].code;
  } catch {
    /* not json */
  }
  return msg.slice(0, 40);
}
const ERROR_HINT: Record<string, string> = {
  QuotaExceeded:
    "Amazon limita la frecuencia (throttling). Se reintenta automáticamente con backoff; si persiste, reduce productos activos o sube el intervalo.",
  Unauthorized: "Token de Amazon caducado o sin permisos. Reconecta la cuenta.",
  InvalidInput: "Amazon rechazó el formato del cambio de precio para ese producto.",
};

export default async function AnaliticasPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/sellers/analiticas");
  const account = await getSellerAccountByUserId(session.userId);
  if (!account || !account.active) redirect("/dashboard/repricer");

  const { p } = await searchParams;

  const billing = getBillingState(account.plan as SellerPlan, account.trialEndsAt);
  const allListings = await listListingsByAccount(account.id);
  const focus = p ? allListings.find((l) => l.id === p) ?? null : null;
  const listings = focus ? [focus] : allListings;

  const [runCount, lastRun, events] = await Promise.all([
    prisma.repricingRun.count({ where: { sellerAccountId: account.id } }),
    prisma.repricingRun.findFirst({
      where: { sellerAccountId: account.id },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
    prisma.repricingEvent.findMany({
      where: {
        listing: { sellerAccountId: account.id },
        ...(focus ? { listingId: focus.id } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { listing: { select: { title: true } } },
    }),
  ]);

  const changed = events.filter(
    (e) => e.success && Math.abs(e.priceAfter - e.priceBefore) > 0.0001,
  );
  const errs = events.filter((e) => !e.success);
  const downSum = changed
    .filter((e) => e.priceAfter < e.priceBefore)
    .reduce((s, e) => s + (e.priceBefore - e.priceAfter), 0);
  const upSum = changed
    .filter((e) => e.priceAfter > e.priceBefore)
    .reduce((s, e) => s + (e.priceAfter - e.priceBefore), 0);

  const byReason = new Map<string, number>();
  for (const e of events) byReason.set(e.reason, (byReason.get(e.reason) ?? 0) + 1);
  const reasonRows = [...byReason.entries()].sort((a, b) => b[1] - a[1]);
  const maxReason = Math.max(1, ...reasonRows.map(([, n]) => n));

  const byError = new Map<string, number>();
  for (const e of errs) {
    const c = errorCode(e.errorMessage);
    byError.set(c, (byError.get(c) ?? 0) + 1);
  }
  const errorRows = [...byError.entries()].sort((a, b) => b[1] - a[1]);

  const activeCount = listings.filter((l) => l.repricingEnabled).length;
  const evByListing = new Map<string, number>();
  for (const e of events) {
    const t = e.listing?.title ?? "—";
    evByListing.set(t, (evByListing.get(t) ?? 0) + 1);
  }

  // Series para la gráfica de líneas (precio en el tiempo, por producto)
  const asc = [...events].reverse(); // antiguo → reciente
  const seriesMap = new Map<string, Array<{ t: number; p: number }>>();
  for (const e of asc) {
    const title = e.listing?.title ?? "Producto";
    const arr = seriesMap.get(title) ?? [];
    arr.push({ t: new Date(e.createdAt).getTime(), p: e.priceAfter });
    seriesMap.set(title, arr);
  }
  const series: ChartSeries[] = [...seriesMap.entries()]
    .map(([title, pts]) => ({ title, pts: pts.slice(-80) }))
    .filter((s) => s.pts.length > 0)
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-[#05060f] text-white px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/sellers/productos"
            className="text-xs text-white/45 hover:text-white/80 transition-colors"
          >
            ← Centro de control
          </Link>
          <span className="text-white/20">/</span>
          <h1 className="text-xl font-extrabold tracking-tight">
            {focus ? (
              <>
                Analítica · <span className="text-gradient-neon">{focus.title}</span>
              </>
            ) : (
              <>
                Analíticas del <span className="text-gradient-neon">repricer</span>
              </>
            )}
          </h1>
          {focus && (
            <Link
              href="/sellers/analiticas"
              className="ml-auto text-xs text-cyan-300/80 hover:text-white transition-colors"
            >
              Ver todas →
            </Link>
          )}
        </div>
        {focus && (
          <div className="mt-1 font-mono text-[11px] text-white/40">
            {focus.asin || "sin ASIN"} · {focus.sku}
          </div>
        )}

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi label="Ciclos" value={String(runCount)} />
          <Kpi label="Eventos" value={String(events.length)} />
          <Kpi label="Cambios aplicados" value={String(changed.length)} accent="cyan" />
          <Kpi label="Errores" value={String(errs.length)} accent={errs.length ? "red" : undefined} />
          <Kpi label="Bajadas (ahorro)" value={eur(downSum)} accent="emerald" />
          <Kpi label="Subidas (margen)" value={eur(upSum)} accent="cyan" />
        </div>
        <div className="mt-2 text-xs text-white/40">
          Plan {billing.label} · ciclo {billing.intervalMinutes} min ·{" "}
          {activeCount}/{listings.length} repreciando ·{" "}
          {lastRun ? `último ciclo ${rel(lastRun.startedAt)}` : "sin ciclos"}
        </div>

        <div className="mt-6 grid lg:grid-cols-2 gap-5">
          {/* Desglose por motivo */}
          <Panel title="Por motivo">
            {reasonRows.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-2.5">
                {reasonRows.map(([reason, n]) => {
                  const r = REASON[reason] ?? REASON.no_change;
                  return (
                    <li key={reason}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${r.cls}`}>
                          {r.label}
                        </span>
                        <span className="text-white/50 font-mono">{n}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-400/60"
                          style={{ width: `${(n / maxReason) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Errores */}
          <Panel title={`Errores (${errs.length})`}>
            {errorRows.length === 0 ? (
              <p className="text-sm text-emerald-300/80">Sin errores. Todo aplicándose en Amazon.</p>
            ) : (
              <ul className="space-y-3">
                {errorRows.map(([code, n]) => (
                  <li key={code} className="rounded-lg border border-red-400/20 bg-red-500/[0.06] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-red-300">{code}</span>
                      <span className="text-xs text-white/50 font-mono">×{n}</span>
                    </div>
                    {ERROR_HINT[code] && (
                      <p className="mt-1 text-[11px] text-white/55">{ERROR_HINT[code]}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Por producto */}
        <Panel title="Por producto" className="mt-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-2 pr-3">Producto</th>
                  <th className="py-2 px-3 whitespace-nowrap">Precio</th>
                  <th className="py-2 px-3">Estrategia</th>
                  <th className="py-2 px-3">Estado</th>
                  <th className="py-2 px-3 text-right">Eventos</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => {
                  const st =
                    l.priceCurrent <= 0 || !l.asin
                      ? "Sin oferta"
                      : l.repricingEnabled
                        ? "Repreciando"
                        : "Pausado";
                  return (
                    <tr key={l.id} className="border-t border-white/[0.06]">
                      <td className="py-2 pr-3 max-w-[280px] truncate text-white/85">{l.title}</td>
                      <td className="py-2 px-3 font-mono text-white/70 whitespace-nowrap">
                        {l.priceCurrent > 0 ? eur(l.priceCurrent) : "—"}
                      </td>
                      <td className="py-2 px-3 text-white/60">{l.strategy}</td>
                      <td className="py-2 px-3">
                        <span
                          className={
                            st === "Repreciando"
                              ? "text-emerald-300"
                              : st === "Sin oferta"
                                ? "text-white/40"
                                : "text-blue-300"
                          }
                        >
                          {st}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-white/50">
                        {evByListing.get(l.title) ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Evolución de precios (gráfica de líneas) */}
        <Panel title="Evolución de precios" className="mt-5">
          {series.length === 0 ? (
            <Empty />
          ) : (
            <LineChart series={series} />
          )}
        </Panel>

        {/* Detalle de actividad */}
        <Panel title="Detalle de actividad" className="mt-5">
          {events.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {events.slice(0, 30).map((e) => {
                const r = REASON[e.reason] ?? REASON.no_change;
                const delta = e.priceAfter - e.priceBefore;
                const up = delta > 0.0001;
                const down = delta < -0.0001;
                return (
                  <li key={e.id} className="py-3 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-white/85">
                        {e.listing?.title ?? "Producto"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-white/40 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${r.cls}`}>
                          {r.label}
                        </span>
                        {e.competitorPrice != null && <span>comp. {eur(e.competitorPrice)}</span>}
                        <span>· {rel(e.createdAt)}</span>
                        {!e.success && <span className="text-red-400">· error</span>}
                      </div>
                      {!e.success && e.errorMessage && (
                        <div className="mt-1 text-[10px] text-red-400/80 break-words">
                          {e.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="text-sm font-mono text-white/55">
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
                          className={`text-[10px] font-mono ${down ? "text-emerald-400" : "text-cyan-400"}`}
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
        </Panel>
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "cyan" | "emerald" | "red";
}) {
  const c =
    accent === "emerald"
      ? "text-emerald-300"
      : accent === "red"
        ? "text-red-300"
        : accent === "cyan"
          ? "text-cyan-300"
          : "text-white/90";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 truncate">{label}</div>
      <div className={`mt-1 font-mono text-xl font-extrabold tabular-nums ${c}`}>{value}</div>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.02] p-5 ${className}`}>
      <h2 className="text-sm font-bold text-white/80 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-white/45">Aún no hay datos. Lanza un ciclo de reprecio.</p>;
}

interface ChartSeries {
  title: string;
  pts: { t: number; p: number }[];
}

const CHART_COLORS = ["#22d3ee", "#a855f7", "#34d399", "#f59e0b", "#60a5fa", "#f472b6"];

function LineChart({ series }: { series: ChartSeries[] }) {
  const W = 1000;
  const H = 320;
  const padL = 60;
  const padR = 18;
  const padT = 18;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const all = series.flatMap((s) => s.pts);
  const tMin = Math.min(...all.map((d) => d.t));
  let tMax = Math.max(...all.map((d) => d.t));
  let pMin = Math.min(...all.map((d) => d.p));
  let pMax = Math.max(...all.map((d) => d.p));
  if (!(tMax > tMin)) tMax = tMin + 1;
  if (!(pMax > pMin)) {
    pMin -= 1;
    pMax += 1;
  } else {
    const pad = (pMax - pMin) * 0.12;
    pMin -= pad;
    pMax += pad;
  }
  const x = (t: number) => padL + ((t - tMin) / (tMax - tMin)) * plotW;
  const y = (p: number) => padT + (1 - (p - pMin) / (pMax - pMin)) * plotH;

  const yTicks = Array.from({ length: 4 }, (_, i) => pMin + ((pMax - pMin) * i) / 3);
  const xTicks = Array.from({ length: 3 }, (_, i) => tMin + ((tMax - tMin) * i) / 2);
  const fmtT = (ms: number) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" height={300}>
        {/* grid + eje Y */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(v)}
              y2={y(v)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.4)">
              {v.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €
            </text>
          </g>
        ))}
        {/* eje X */}
        {xTicks.map((t, i) => (
          <text
            key={i}
            x={x(t)}
            y={H - 10}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            fontSize="11"
            fill="rgba(255,255,255,0.4)"
          >
            {fmtT(t)}
          </text>
        ))}
        {/* series */}
        {series.map((s, si) => {
          const c = CHART_COLORS[si % CHART_COLORS.length];
          const d = s.pts
            .map((pt, i) => `${i === 0 ? "M" : "L"}${x(pt.t).toFixed(1)},${y(pt.p).toFixed(1)}`)
            .join(" ");
          return (
            <g key={s.title}>
              {s.pts.length > 1 && (
                <path d={d} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              )}
              {s.pts.map((pt, i) => (
                <circle key={i} cx={x(pt.t)} cy={y(pt.p)} r="2.6" fill={c} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {series.map((s, si) => (
          <div key={s.title} className="flex items-center gap-2 text-xs text-white/60">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: CHART_COLORS[si % CHART_COLORS.length] }}
            />
            <span className="max-w-[220px] truncate">{s.title}</span>
            <span className="font-mono text-white/45">
              {s.pts[s.pts.length - 1].p.toLocaleString("es-ES", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
