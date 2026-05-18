"use client";

import { useEffect, useMemo, useState } from "react";

export interface OvEvent {
  listingId: string;
  title: string;
  reason: string;
  priceBefore: number;
  priceAfter: number;
  competitorPrice: number | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}
export interface OvProduct {
  id: string;
  title: string;
  currency: string;
  asin: string;
  sku: string;
  strategy: string;
  repricingEnabled: boolean;
  priceCurrent: number;
}

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
const ERROR_HINT: Record<string, string> = {
  QuotaExceeded:
    "Amazon limita la frecuencia (throttling). Se reintenta solo con backoff; si persiste, menos productos activos o intervalo mayor.",
  Unauthorized: "Token de Amazon caducado o sin permisos. Reconecta la cuenta.",
  InvalidInput: "Amazon rechazó el formato del cambio de precio.",
};

function eur(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function rel(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
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
    /* no json */
  }
  return msg.slice(0, 40);
}

export default function AnalyticsOverlay({
  products,
  events,
  plan,
  runCount,
  lastRunAt,
}: {
  products: OvProduct[];
  events: OvEvent[];
  plan: { label: string; intervalMinutes: number };
  runCount: number;
  lastRunAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string>("ALL");

  useEffect(() => {
    function onOpen(e: Event) {
      const id = (e as CustomEvent<{ productId?: string }>).detail?.productId;
      setSel(id && products.some((p) => p.id === id) ? id : "ALL");
      setOpen(true);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("orvexia:open-analytics", onOpen as EventListener);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("orvexia:open-analytics", onOpen as EventListener);
      window.removeEventListener("keydown", onKey);
    };
  }, [products]);

  const focus = sel === "ALL" ? null : products.find((p) => p.id === sel) ?? null;
  const evs = useMemo(
    () => (focus ? events.filter((e) => e.listingId === focus.id) : events),
    [events, focus],
  );

  const stats = useMemo(() => {
    const changed = evs.filter(
      (e) => e.success && Math.abs(e.priceAfter - e.priceBefore) > 0.0001,
    );
    const errs = evs.filter((e) => !e.success);
    const down = changed
      .filter((e) => e.priceAfter < e.priceBefore)
      .reduce((s, e) => s + (e.priceBefore - e.priceAfter), 0);
    const up = changed
      .filter((e) => e.priceAfter > e.priceBefore)
      .reduce((s, e) => s + (e.priceAfter - e.priceBefore), 0);
    const byReason = new Map<string, number>();
    for (const e of evs) byReason.set(e.reason, (byReason.get(e.reason) ?? 0) + 1);
    const byErr = new Map<string, number>();
    for (const e of errs) {
      const c = errorCode(e.errorMessage);
      byErr.set(c, (byErr.get(c) ?? 0) + 1);
    }
    return {
      changed: changed.length,
      errs: errs.length,
      down,
      up,
      reasons: [...byReason.entries()].sort((a, b) => b[1] - a[1]),
      errors: [...byErr.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [evs]);
  const maxReason = Math.max(1, ...stats.reasons.map(([, n]) => n));

  // Series para gráfica de líneas
  const series = useMemo(() => {
    const asc = [...evs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const m = new Map<string, Array<{ t: number; p: number }>>();
    for (const e of asc) {
      const arr = m.get(e.title) ?? [];
      arr.push({ t: new Date(e.createdAt).getTime(), p: e.priceAfter });
      m.set(e.title, arr);
    }
    return [...m.entries()].map(([title, pts]) => ({ title, pts: pts.slice(-80) })).slice(0, 6);
  }, [evs]);

  const listView = focus ? [focus] : products;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[58] bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto max-w-5xl rounded-2xl border border-cyan-400/20 bg-[rgba(7,8,18,0.99)] shadow-[0_30px_80px_-20px_rgba(34,211,238,0.4)] fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/10 bg-[rgba(7,8,18,0.99)] rounded-t-2xl">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold tracking-tight">
              Analíticas y <span className="text-gradient-neon">actividad</span>
            </h2>
            <p className="text-[11px] text-white/40">
              Plan {plan.label} · ciclo {plan.intervalMinutes} min · {runCount} ciclos ·{" "}
              {lastRunAt ? `último ${rel(lastRunAt)}` : "sin ciclos"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={sel}
              onChange={(e) => setSel(e.target.value)}
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white focus:border-cyan-400/60 focus:outline-none max-w-[230px]"
            >
              <option value="ALL">Todos los productos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title.length > 38 ? p.title.slice(0, 37) + "…" : p.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="h-8 w-8 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
          {focus && (
            <div className="w-full font-mono text-[10px] text-white/35">
              {focus.asin || "sin ASIN"} · {focus.sku}
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Eventos" value={String(evs.length)} />
            <Kpi label="Cambios" value={String(stats.changed)} c="cyan" />
            <Kpi label="Errores" value={String(stats.errs)} c={stats.errs ? "red" : undefined} />
            <Kpi label="Ahorro" value={eur(stats.down)} c="emerald" />
            <Kpi label="Margen" value={eur(stats.up)} c="cyan" />
            <Kpi label="Productos" value={String(listView.length)} />
          </div>

          {/* Gráfica de líneas */}
          <Panel title="Evolución de precios">
            {series.length === 0 ? (
              <Empty />
            ) : (
              <LineChart series={series} />
            )}
          </Panel>

          <div className="grid lg:grid-cols-2 gap-5">
            <Panel title="Por motivo">
              {stats.reasons.length === 0 ? (
                <Empty />
              ) : (
                <ul className="space-y-2.5">
                  {stats.reasons.map(([reason, n]) => {
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

            <Panel title={`Errores (${stats.errs})`}>
              {stats.errors.length === 0 ? (
                <p className="text-sm text-emerald-300/80">Sin errores. Todo aplicándose en Amazon.</p>
              ) : (
                <ul className="space-y-3">
                  {stats.errors.map(([code, n]) => (
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

          <Panel title="Actividad">
            {evs.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {evs.slice(0, 40).map((e, i) => {
                  const r = REASON[e.reason] ?? REASON.no_change;
                  const d = e.priceAfter - e.priceBefore;
                  const down = d < -0.0001;
                  const up = d > 0.0001;
                  return (
                    <li key={i} className="py-3 flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate text-white/85">{e.title}</div>
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
                              down ? "text-emerald-300 font-bold" : up ? "text-cyan-300 font-bold" : "text-white/55"
                            }
                          >
                            {eur(e.priceAfter)}
                          </span>
                        </div>
                        {(up || down) && (
                          <div className={`text-[10px] font-mono ${down ? "text-emerald-400" : "text-cyan-400"}`}>
                            {down ? "▼" : "▲"} {eur(Math.abs(d))}
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
      </div>
    </div>
  );
}

function Kpi({ label, value, c }: { label: string; value: string; c?: "cyan" | "emerald" | "red" }) {
  const cls =
    c === "emerald" ? "text-emerald-300" : c === "red" ? "text-red-300" : c === "cyan" ? "text-cyan-300" : "text-white/90";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-white/40 truncate">{label}</div>
      <div className={`mt-1 font-mono text-lg font-extrabold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-sm font-bold text-white/80 mb-3">{title}</h3>
      {children}
    </section>
  );
}
function Empty() {
  return <p className="text-sm text-white/45">Aún no hay datos. Lanza un ciclo de reprecio.</p>;
}

const CHART_COLORS = ["#22d3ee", "#a855f7", "#34d399", "#f59e0b", "#60a5fa", "#f472b6"];
function LineChart({ series }: { series: Array<{ title: string; pts: { t: number; p: number }[] }> }) {
  const W = 1000;
  const H = 300;
  const padL = 60;
  const padR = 18;
  const padT = 16;
  const padB = 32;
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
  const x = (t: number) => padL + ((t - tMin) / (tMax - tMin)) * (W - padL - padR);
  const y = (p: number) => padT + (1 - (p - pMin) / (pMax - pMin)) * (H - padT - padB);
  const yT = Array.from({ length: 4 }, (_, i) => pMin + ((pMax - pMin) * i) / 3);
  const xT = Array.from({ length: 3 }, (_, i) => tMin + ((tMax - tMin) * i) / 2);
  const fmtT = (ms: number) =>
    new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
      new Date(ms),
    );
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" height={280}>
        {yT.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.4)">
              {v.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €
            </text>
          </g>
        ))}
        {xT.map((t, i) => (
          <text
            key={i}
            x={x(t)}
            y={H - 10}
            textAnchor={i === 0 ? "start" : i === xT.length - 1 ? "end" : "middle"}
            fontSize="11"
            fill="rgba(255,255,255,0.4)"
          >
            {fmtT(t)}
          </text>
        ))}
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
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[si % CHART_COLORS.length] }} />
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
