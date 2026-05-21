"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface OvEvent {
  listingId: string;
  title: string;
  reason: string;
  priceBefore: number;
  priceAfter: number;
  competitorPrice: number | null;
  success: boolean;
  buyBox: "WON" | "LOST" | "UNKNOWN";
  simulated: boolean;
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
  step_up: { label: "Subida gradual", cls: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
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
function fmtRange(ms: number): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
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
  const [actFilter, setActFilter] = useState<
    "all" | "changes" | "errors" | "simulated"
  >("all");
  const [actLimit, setActLimit] = useState(40);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    function onOpen(e: Event) {
      const id = (e as CustomEvent<{ productId?: string }>).detail?.productId;
      setSel(id && products.some((p) => p.id === id) ? id : "ALL");
      setNowMs(Date.now());
      setActLimit(40);
      setActFilter("all");
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
    const bbWon = evs.filter((e) => e.buyBox === "WON").length;
    const bbLost = evs.filter((e) => e.buyBox === "LOST").length;
    const bbUnknown = evs.filter((e) => e.buyBox === "UNKNOWN").length;
    const bbTotal = bbWon + bbLost;
    const simulated = evs.filter((e) => e.simulated).length;
    const applied = changed.filter((e) => !e.simulated).length;
    const ok = evs.filter((e) => e.success).length;
    const avgChange =
      changed.length > 0
        ? changed.reduce((s, e) => s + Math.abs(e.priceAfter - e.priceBefore), 0) /
          changed.length
        : 0;
    return {
      changed: changed.length,
      applied,
      simulated,
      errs: errs.length,
      successRate: evs.length > 0 ? Math.round((ok / evs.length) * 100) : null,
      avgChange,
      down,
      up,
      bbWon,
      bbLost,
      bbUnknown,
      bbPct: bbTotal > 0 ? Math.round((bbWon / bbTotal) * 100) : null,
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

  // Tendencias: ahorro y margen ACUMULADOS en el tiempo
  const trends = useMemo(() => {
    const asc = [...evs]
      .filter((e) => e.success)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const save: Array<{ t: number; p: number }> = [];
    const marg: Array<{ t: number; p: number }> = [];
    let cs = 0;
    let cm = 0;
    for (const e of asc) {
      const d = e.priceAfter - e.priceBefore;
      const t = new Date(e.createdAt).getTime();
      if (d < -0.0001) cs += e.priceBefore - e.priceAfter;
      if (d > 0.0001) cm += e.priceAfter - e.priceBefore;
      save.push({ t, p: Math.round(cs * 100) / 100 });
      marg.push({ t, p: Math.round(cm * 100) / 100 });
    }
    const out: Array<{ title: string; pts: { t: number; p: number }[] }> = [];
    if (save.length) out.push({ title: "Ahorro acumulado", pts: save.slice(-120) });
    if (marg.length) out.push({ title: "Margen acumulado", pts: marg.slice(-120) });
    return out;
  }, [evs]);

  // Comparativa entre productos (vista global)
  const compareRows = useMemo(() => {
    const m = new Map<
      string,
      { title: string; events: number; saved: number; margin: number; bb: number; bbTot: number }
    >();
    for (const e of evs) {
      const row =
        m.get(e.listingId) ??
        { title: e.title, events: 0, saved: 0, margin: 0, bb: 0, bbTot: 0 };
      row.events += 1;
      const d = e.priceAfter - e.priceBefore;
      if (e.success && d < -0.0001) row.saved += e.priceBefore - e.priceAfter;
      if (e.success && d > 0.0001) row.margin += e.priceAfter - e.priceBefore;
      if (e.buyBox === "WON") {
        row.bb += 1;
        row.bbTot += 1;
      } else if (e.buyBox === "LOST") row.bbTot += 1;
      m.set(e.listingId, row);
    }
    return [...m.values()].sort((a, b) => b.events - a.events);
  }, [evs]);
  const maxCmp = Math.max(1, ...compareRows.map((r) => r.events));

  // Resumen por periodo (24 h / 7 d) y rango de fechas
  const period = useMemo(() => {
    const now = nowMs;
    const D = 24 * 60 * 60 * 1000;
    const win = (ms: number) => {
      const w = evs.filter((e) => now - new Date(e.createdAt).getTime() <= ms);
      const ch = w.filter(
        (e) => e.success && Math.abs(e.priceAfter - e.priceBefore) > 0.0001,
      );
      const saved = ch
        .filter((e) => e.priceAfter < e.priceBefore)
        .reduce((s, e) => s + (e.priceBefore - e.priceAfter), 0);
      return { events: w.length, changes: ch.length, saved, errs: w.filter((e) => !e.success).length };
    };
    const times = evs.map((e) => new Date(e.createdAt).getTime());
    return {
      d1: win(D),
      d7: win(7 * D),
      from: times.length ? Math.min(...times) : null,
      to: times.length ? Math.max(...times) : null,
    };
  }, [evs, nowMs]);

  // Distribución de actividad por hora del día (0-23)
  const hourly = useMemo(() => {
    const h = new Array(24).fill(0) as number[];
    for (const e of evs) h[new Date(e.createdAt).getHours()] += 1;
    return h;
  }, [evs]);
  const maxHour = Math.max(1, ...hourly);

  const actEvents = useMemo(() => {
    return evs.filter((e) => {
      if (actFilter === "errors") return !e.success;
      if (actFilter === "simulated") return e.simulated;
      if (actFilter === "changes")
        return e.success && Math.abs(e.priceAfter - e.priceBefore) > 0.0001;
      return true;
    });
  }, [evs, actFilter]);

  function exportCsv() {
    const rows = [
      ["fecha", "producto", "motivo", "precio_antes", "precio_despues", "competidor", "buybox", "simulado", "ok", "error"],
      ...evs.map((e) => [
        new Date(e.createdAt).toISOString(),
        e.title.replace(/"/g, "'"),
        e.reason,
        String(e.priceBefore),
        String(e.priceAfter),
        e.competitorPrice != null ? String(e.competitorPrice) : "",
        e.buyBox,
        e.simulated ? "1" : "0",
        e.success ? "1" : "0",
        (e.errorMessage ?? "").replace(/[\r\n",]/g, " "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orvexia-analitica-${focus ? focus.sku : "todos"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
            {period.from && period.to && (
              <p className="text-[10px] text-white/30">
                {evs.length} eventos · {fmtRange(period.from)} – {fmtRange(period.to)}
              </p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={sel}
              onChange={(e) => {
                setSel(e.target.value);
                setActLimit(40);
              }}
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
              onClick={exportCsv}
              className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/10 transition-colors"
              title="Exportar CSV"
            >
              CSV
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-white/70 hover:bg-white/10 transition-colors"
              title="Imprimir / Guardar como PDF"
            >
              PDF
            </button>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <Kpi label="Eventos" value={String(evs.length)} />
            <Kpi label="Cambios aplicados" value={String(stats.applied)} c="cyan" />
            <Kpi label="Simulados" value={String(stats.simulated)} />
            <Kpi
              label="Errores"
              value={String(stats.errs)}
              c={stats.errs ? "red" : undefined}
            />
            <Kpi
              label="Tasa de éxito"
              value={stats.successRate != null ? `${stats.successRate}%` : "—"}
              c={
                stats.successRate != null && stats.successRate >= 90
                  ? "emerald"
                  : stats.successRate != null && stats.successRate < 70
                    ? "red"
                    : undefined
              }
            />
            <Kpi label="Cambio medio" value={eur(stats.avgChange)} />
            <Kpi label="Ahorro total" value={eur(stats.down)} c="emerald" />
            <Kpi label="Margen recup." value={eur(stats.up)} c="cyan" />
            <Kpi
              label="% Buy Box"
              value={stats.bbPct != null ? `${stats.bbPct}%` : "—"}
              c={stats.bbPct != null && stats.bbPct >= 50 ? "emerald" : "red"}
            />
            <Kpi label="Productos" value={String(listView.length)} />
          </div>

          {/* Resumen por periodo */}
          <div className="grid sm:grid-cols-2 gap-3">
            <PeriodCard title="Últimas 24 h" d={period.d1} />
            <PeriodCard title="Últimos 7 días" d={period.d7} />
          </div>

          {/* Gráfica de líneas */}
          <Panel title="Evolución de precios">
            {series.length === 0 ? (
              <Empty />
            ) : (
              <LineChart series={series} />
            )}
          </Panel>

          {/* Tendencias acumuladas */}
          <Panel title="Tendencias (ahorro y margen acumulados)">
            {trends.length === 0 ? (
              <Empty />
            ) : (
              <LineChart series={trends} />
            )}
          </Panel>

          {/* Comparativa entre productos (vista global) */}
          {!focus && (
            <Panel title="Comparativa entre productos">
              {compareRows.length === 0 ? (
                <Empty />
              ) : (
                <ul className="space-y-3">
                  {compareRows.slice(0, 12).map((r) => (
                    <li key={r.title}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="truncate max-w-[60%] text-white/80">{r.title}</span>
                        <span className="text-white/45 font-mono">
                          {r.events} ev · ahorro {eur(r.saved)}
                          {r.bbTot > 0 && (
                            <span className="text-emerald-300">
                              {" "}
                              · BB {Math.round((r.bb / r.bbTot) * 100)}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-400/60"
                          style={{ width: `${(r.events / maxCmp) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {/* Buy Box + actividad por hora */}
          <div className="grid lg:grid-cols-2 gap-5">
            <Panel title="Estado de Buy Box">
              {stats.bbWon + stats.bbLost + stats.bbUnknown === 0 ? (
                <Empty />
              ) : (
                <>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    {stats.bbWon > 0 && (
                      <div
                        className="h-full bg-emerald-400/70"
                        style={{
                          width: `${
                            (stats.bbWon /
                              (stats.bbWon + stats.bbLost + stats.bbUnknown)) *
                            100
                          }%`,
                        }}
                      />
                    )}
                    {stats.bbLost > 0 && (
                      <div
                        className="h-full bg-red-400/70"
                        style={{
                          width: `${
                            (stats.bbLost /
                              (stats.bbWon + stats.bbLost + stats.bbUnknown)) *
                            100
                          }%`,
                        }}
                      />
                    )}
                    {stats.bbUnknown > 0 && (
                      <div
                        className="h-full bg-white/15"
                        style={{
                          width: `${
                            (stats.bbUnknown /
                              (stats.bbWon + stats.bbLost + stats.bbUnknown)) *
                            100
                          }%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <BbCell label="Ganada" value={stats.bbWon} c="text-emerald-300" />
                    <BbCell label="Perdida" value={stats.bbLost} c="text-red-300" />
                    <BbCell label="Sin dato" value={stats.bbUnknown} c="text-white/45" />
                  </div>
                  {stats.bbPct != null && (
                    <p className="mt-3 text-[11px] text-white/45">
                      Tienes la Buy Box el{" "}
                      <span className="font-semibold text-white/75">
                        {stats.bbPct}%
                      </span>{" "}
                      del tiempo medido.
                    </p>
                  )}
                </>
              )}
            </Panel>

            <Panel title="Actividad por hora (local)">
              {evs.length === 0 ? (
                <Empty />
              ) : (
                <div className="flex items-end gap-[3px] h-28">
                  {hourly.map((n, h) => (
                    <div
                      key={h}
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${h}:00 · ${n} eventos`}
                    >
                      <div
                        className="w-full rounded-t bg-cyan-400/50 min-h-[2px]"
                        style={{ height: `${(n / maxHour) * 100}%` }}
                      />
                      {h % 6 === 0 && (
                        <span className="text-[8px] text-white/35">{h}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

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

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-white/80">
                Actividad{" "}
                <span className="text-white/40 font-normal">
                  ({actEvents.length})
                </span>
              </h3>
              <select
                value={actFilter}
                onChange={(e) => {
                  setActFilter(
                    e.target.value as "all" | "changes" | "errors" | "simulated",
                  );
                  setActLimit(40);
                }}
                className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-[11px] text-white focus:border-cyan-400/60 focus:outline-none"
              >
                <option value="all">Todo</option>
                <option value="changes">Solo cambios</option>
                <option value="errors">Solo errores</option>
                <option value="simulated">Solo simulados</option>
              </select>
            </div>
            {actEvents.length === 0 ? (
              <Empty />
            ) : (
              <>
                <ul className="divide-y divide-white/[0.05]">
                  {actEvents.slice(0, actLimit).map((e, i) => {
                    const r = REASON[e.reason] ?? REASON.no_change;
                    const d = e.priceAfter - e.priceBefore;
                    const down = d < -0.0001;
                    const up = d > 0.0001;
                    const pctD =
                      e.priceBefore > 0 && (up || down)
                        ? (Math.abs(d) / e.priceBefore) * 100
                        : null;
                    return (
                      <li key={i} className="py-3 flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate text-white/85">
                            {e.title}
                          </div>
                          <div className="mt-0.5 text-[11px] text-white/40 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${r.cls}`}
                            >
                              {r.label}
                            </span>
                            {e.buyBox === "WON" && (
                              <span className="text-emerald-300">BB ✓</span>
                            )}
                            {e.buyBox === "LOST" && (
                              <span className="text-red-300">BB ✗</span>
                            )}
                            {e.simulated && (
                              <span className="px-1 py-0.5 rounded border border-white/15 text-white/45 text-[9px]">
                                simulado
                              </span>
                            )}
                            {e.competitorPrice != null && (
                              <span>comp. {eur(e.competitorPrice)}</span>
                            )}
                            <span>· {rel(e.createdAt)}</span>
                            {!e.success && (
                              <span className="text-red-400">· error</span>
                            )}
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
                              className={`text-[10px] font-mono ${
                                down ? "text-emerald-400" : "text-cyan-400"
                              }`}
                            >
                              {down ? "▼" : "▲"} {eur(Math.abs(d))}
                              {pctD != null && ` (${pctD.toFixed(1)}%)`}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {actEvents.length > actLimit && (
                  <button
                    onClick={() => setActLimit((n) => n + 60)}
                    className="mt-3 w-full rounded-lg border border-white/15 py-2 text-xs text-white/60 hover:bg-white/[0.05] transition-colors"
                  >
                    Ver más ({actEvents.length - actLimit} restantes)
                  </button>
                )}
              </>
            )}
          </section>
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
function PeriodCard({
  title,
  d,
}: {
  title: string;
  d: { events: number; changes: number; saved: number; errs: number };
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-sm font-bold text-white/80 mb-2.5">{title}</h3>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="font-mono text-base font-extrabold text-white/90">
            {d.events}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-white/40">
            eventos
          </div>
        </div>
        <div>
          <div className="font-mono text-base font-extrabold text-cyan-300">
            {d.changes}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-white/40">
            cambios
          </div>
        </div>
        <div>
          <div className="font-mono text-base font-extrabold text-emerald-300">
            {eur(d.saved)}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-white/40">
            ahorro
          </div>
        </div>
        <div>
          <div
            className={`font-mono text-base font-extrabold ${
              d.errs ? "text-red-300" : "text-white/50"
            }`}
          >
            {d.errs}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-white/40">
            errores
          </div>
        </div>
      </div>
    </div>
  );
}
function BbCell({
  label,
  value,
  c,
}: {
  label: string;
  value: number;
  c: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
      <div className={`font-mono text-lg font-extrabold ${c}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-white/40">
        {label}
      </div>
    </div>
  );
}

const CHART_COLORS = ["#22d3ee", "#a855f7", "#34d399", "#f59e0b", "#60a5fa", "#f472b6"];
function LineChart({ series }: { series: Array<{ title: string; pts: { t: number; p: number }[] }> }) {
  // Container-aware viewBox so the chart doesn't distort on narrow phones.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1000);
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cw = Math.max(280, Math.floor(e.contentRect.width));
        setW(cw);
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const isCompact = W < 520;
  const H = isCompact ? 220 : 300;
  const padL = isCompact ? 44 : 60;
  const padR = isCompact ? 12 : 18;
  const padT = isCompact ? 14 : 16;
  const padB = isCompact ? 26 : 32;
  const labelFs = isCompact ? 10 : 11;
  const dotR = isCompact ? 2.2 : 2.6;
  const xTickCount = isCompact ? 2 : 3;
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
  const xT = Array.from({ length: xTickCount }, (_, i) => tMin + ((tMax - tMin) * i) / (xTickCount - 1));
  const fmtT = (ms: number) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      ...(isCompact ? {} : { hour: "2-digit", minute: "2-digit" }),
    }).format(new Date(ms));
  const fmtY = (v: number) =>
    isCompact && Math.abs(v) >= 1000
      ? `${Math.round(v / 1000)}k €`
      : `${v.toLocaleString("es-ES", { maximumFractionDigits: isCompact ? 0 : 2 })} €`;

  // Tiempos únicos ordenados (para "imantar" el cursor a un punto real).
  const allTimes = Array.from(new Set(all.map((d) => d.t))).sort((a, b) => a - b);
  const [hover, setHover] = useState<{
    t: number;
    leftPx: number;
    w: number;
  } | null>(null);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const rawT =
      tMin + ((sx - padL) / (W - padL - padR)) * (tMax - tMin);
    // Imantar al timestamp real más cercano.
    let best = allTimes[0];
    let bd = Infinity;
    for (const t of allTimes) {
      const dd = Math.abs(t - rawT);
      if (dd < bd) {
        bd = dd;
        best = t;
      }
    }
    const leftPx = Math.max(
      0,
      Math.min(rect.width, (x(best) / W) * rect.width),
    );
    setHover({ t: best, leftPx, w: rect.width });
  }

  const hoverRows = hover
    ? series.map((s, si) => {
        let np = s.pts[0];
        let nd = Infinity;
        for (const pt of s.pts) {
          const dd = Math.abs(pt.t - hover.t);
          if (dd < nd) {
            nd = dd;
            np = pt;
          }
        }
        return { title: s.title, color: CHART_COLORS[si % CHART_COLORS.length], pt: np };
      })
    : [];

  return (
    <div ref={wrapRef} className="relative w-full">
      {hover && hoverRows.length > 0 && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-white/15 bg-[rgba(6,7,16,0.96)] px-3 py-2 text-[11px] shadow-xl"
          style={{
            left: `${Math.max(70, Math.min(hover.w - 70, hover.leftPx))}px`,
          }}
        >
          <div className="text-white/45 mb-1">{fmtT(hover.t)}</div>
          {hoverRows.map((r) => (
            <div key={r.title} className="flex items-center gap-2 whitespace-nowrap">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: r.color }}
              />
              <span className="max-w-[160px] truncate text-white/65">
                {r.title}
              </span>
              <span className="ml-auto font-mono font-semibold text-white/90">
                {r.pt.p.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </span>
            </div>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: H }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {yT.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize={labelFs} fill="rgba(255,255,255,0.45)">
              {fmtY(v)}
            </text>
          </g>
        ))}
        {xT.map((t, i) => (
          <text
            key={i}
            x={x(t)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === xT.length - 1 ? "end" : "middle"}
            fontSize={labelFs}
            fill="rgba(255,255,255,0.45)"
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
                <circle key={i} cx={x(pt.t)} cy={y(pt.p)} r={dotR} fill={c} />
              ))}
            </g>
          );
        })}
        {hover && (
          <g>
            <line
              x1={x(hover.t)}
              x2={x(hover.t)}
              y1={padT}
              y2={H - padB}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            {hoverRows.map((r) => (
              <circle
                key={r.title}
                cx={x(r.pt.t)}
                cy={y(r.pt.p)}
                r="5"
                fill={r.color}
                stroke="#06070f"
                strokeWidth="2"
              />
            ))}
          </g>
        )}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s, si) => (
          <div key={s.title} className="flex items-center gap-2 text-xs text-white/65 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[si % CHART_COLORS.length] }} />
            <span className="max-w-[180px] sm:max-w-[220px] truncate">{s.title}</span>
            <span className="font-mono text-white/45 tabular text-[11px]">
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
