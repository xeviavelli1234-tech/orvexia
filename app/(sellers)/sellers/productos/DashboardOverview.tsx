"use client";

/**
 * Panel "Resumen" del repricer — dashboard bento estilo Hynex.
 *
 * Vista por defecto del workspace (el grafo vive en su pestaña). Todo es
 * SVG/CSS puro: sin librerías de charts. Reutiliza los helpers del grafo
 * (`nodeState`, `STATE_COLOR`…) para que el reparto por estado coincida con
 * los colores de los nodos.
 *
 * Diseñado para sentirse "lleno" incluso sin eventos de reprecio todavía: las
 * tarjetas que dependen de eventos degradan a estados informativos, y la tabla
 * principal muestra TUS PRODUCTOS (datos que siempre existen) en vez de quedar
 * vacía.
 */

import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  nodeState,
  STATE_COLOR,
  STATE_LABEL,
  sym,
  fmt,
} from "./network/helpers";
import type { NetNode, State } from "./network/types";
import type { EventDTO } from "./ActivityPanel";
import { prettyStrategy } from "@/lib/format/strategy-label";
import { formatRelativeShort } from "@/lib/format/relative";

export interface DashboardSummary {
  productos: number;
  withPrice: number;
  active: number;
  activeLimit: number | null; // null = ilimitado
  catalogValue: number;
  currency: string;
  planLabel: string;
  isTrial: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  runCount: number;
}

export interface SeriesPoint {
  key: string;
  changes: number;
  errors: number;
  events: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  series: SeriesPoint[];
  tableEvents: EventDTO[];
}

function openOverlay(name: string) {
  window.dispatchEvent(new CustomEvent(`orvexia:open-${name}`));
}
function askAssistant(ask?: string) {
  window.dispatchEvent(new CustomEvent("orvexia:open-assistant", { detail: { ask } }));
}

/** Anima un número de 0 → value al montar (ease-out cúbico). */
function CountUp({
  value,
  format,
  duration = 1100,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (value === 0) {
      setN(0);
      return;
    }
    let raf = 0;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(value * eased);
      if (t < 1) raf = requestAnimationFrame(step);
      else setN(value);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format ? format(n) : Math.round(n).toLocaleString("es-ES")}</>;
}

/** Etiqueta corta del estado para las pills de la tabla. */
const STATE_SHORT: Record<State, string> = {
  won: "Buy Box",
  active: "Activo",
  floor: "En mínimo",
  lost: "Perdida",
  error: "Error",
  paused: "Pausado",
  noprice: "Sin oferta",
};

export default function DashboardOverview({
  nodes,
  data,
}: {
  nodes: NetNode[];
  data: DashboardData;
}) {
  const { summary, series } = data;
  const cur = sym(summary.currency);

  // ── Conteo por estado (alimenta donut, leyenda y métricas) ───────────────
  const { counts, dist } = useMemo(() => {
    const counts = {} as Record<State, number>;
    for (const n of nodes) {
      const s = nodeState(n);
      counts[s] = (counts[s] ?? 0) + 1;
    }
    const dist = STATE_LABEL.map(({ st, label }) => ({
      st,
      label,
      n: counts[st] ?? 0,
      color: STATE_COLOR[st].dot ?? STATE_COLOR[st].stroke,
    })).filter((d) => d.n > 0);
    return { counts, dist };
  }, [nodes]);

  const metrics = useMemo(() => {
    let conRango = 0;
    let conCoste = 0;
    for (const n of nodes) {
      if (n.priceMin != null && n.priceMax != null) conRango++;
      if (n.cost != null && n.cost > 0) conCoste++;
    }
    return {
      conRango,
      conCoste,
      pausados: counts.paused ?? 0,
      sinOferta: counts.noprice ?? 0,
      enMinimo: counts.floor ?? 0,
    };
  }, [nodes, counts]);

  const wonPct = useMemo(() => {
    const won = nodes.filter((n) => n.buyBoxStatus === "WON").length;
    const lost = nodes.filter((n) => n.buyBoxStatus === "LOST").length;
    const tot = won + lost;
    return tot > 0 ? Math.round((won / tot) * 100) : null;
  }, [nodes]);

  // Productos a destacar en la tabla: primero los que requieren atención.
  const rows = useMemo(() => {
    const rank: Record<State, number> = {
      lost: 0,
      error: 1,
      floor: 2,
      noprice: 3,
      paused: 4,
      active: 5,
      won: 6,
    };
    return [...nodes]
      .map((n) => ({ n, st: nodeState(n) }))
      .sort((a, b) => rank[a.st] - rank[b.st])
      .slice(0, 8);
  }, [nodes]);

  const totalChanges = series.reduce((s, p) => s + p.changes, 0);
  const totalEvents = series.reduce((s, p) => s + p.events, 0);
  const totalErrors = series.reduce((s, p) => s + p.errors, 0);

  const quotaPct =
    summary.activeLimit && summary.activeLimit > 0
      ? Math.min(100, Math.round((summary.active / summary.activeLimit) * 100))
      : null;

  return (
    <div className="min-h-full px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-[1280px]">
        {/* ── Cabecera ─────────────────────────────────────────── */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 hx-rise">
          <div>
            <div className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-emerald-300/80">
              ▸ panel de control
            </div>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
              Resumen del <span className="text-gradient-emerald">repricer</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/55">
            <span className="hx-live-dot" />
            {summary.lastRunAt ? (
              <>Último ciclo {formatRelativeShort(summary.lastRunAt)}</>
            ) : (
              <>Sin ciclos todavía</>
            )}
            <span className="text-white/20">·</span>
            <span className="text-white/40">cada {summary.intervalMinutes} min</span>
          </div>
        </div>

        {/* ── Fila KPI ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            i={0}
            icon="box"
            label="Productos"
            value={<CountUp value={summary.productos} />}
            sub={`${summary.withPrice} con precio`}
            tone="emerald"
            featured
          />
          <Kpi
            i={1}
            icon="bolt"
            label="Repreciando"
            value={
              summary.activeLimit != null ? (
                <>
                  <CountUp value={summary.active} />
                  <span className="text-white/35">/{summary.activeLimit}</span>
                </>
              ) : (
                <CountUp value={summary.active} />
              )
            }
            sub={quotaPct != null ? `${quotaPct}% de la cuota` : "activos"}
            tone="teal"
            bar={quotaPct}
          />
          <Kpi
            i={2}
            icon="trophy"
            label="Buy Box ganada"
            value={wonPct != null ? <><CountUp value={wonPct} />%</> : "—"}
            sub={wonPct != null ? "de productos con dato" : "sin datos aún"}
            tone={wonPct != null && wonPct < 50 ? "rose" : "lime"}
          />
          <Kpi
            i={3}
            icon="euro"
            label="Valor catálogo"
            value={
              summary.catalogValue > 0 ? (
                <>
                  <CountUp value={Math.round(summary.catalogValue)} /> {cur}
                </>
              ) : (
                "—"
              )
            }
            sub={`${summary.runCount} ciclos ejecutados`}
            tone="indigo"
          />
        </div>

        {/* ── Tira de métricas secundarias ─────────────────────── */}
        <div
          className="hx-card hx-rise mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl sm:grid-cols-3 lg:grid-cols-5"
          style={{ animationDelay: "40ms" }}
        >
          <Mini label="Con rango" value={metrics.conRango} total={summary.productos} good />
          <Mini label="Con coste" value={metrics.conCoste} total={summary.productos} good />
          <Mini label="Pausados" value={metrics.pausados} warn={metrics.pausados > 0} />
          <Mini label="En mínimo" value={metrics.enMinimo} warn={metrics.enMinimo > 0} />
          <Mini label="Sin oferta" value={metrics.sinOferta} warn={metrics.sinOferta > 0} />
        </div>

        {/* ── Cuerpo: columna principal + rail derecho ─────────── */}
        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-start">
          {/* Columna principal */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <AssistantCard />

            {/* Actividad de reprecio (área) */}
            <section className="hx-card hx-card-hover hx-rise p-5" style={{ animationDelay: "120ms" }}>
              <CardHeader
                eyebrow="actividad · últimos 14 días"
                title="Cambios de precio"
                actionLabel="Detalle"
                onAction={() => openOverlay("analytics")}
              />
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
                <Metric color="#34d399" label="Cambios" value={totalChanges} />
                <Metric color="#2dd4bf" label="Eventos" value={totalEvents} />
                <Metric color="#fb7185" label="Errores" value={totalErrors} dim={totalErrors === 0} />
              </div>
              <AreaChart series={series} />
            </section>

            {/* Tabla de productos */}
            <section className="hx-card hx-card-hover hx-rise p-5" style={{ animationDelay: "180ms" }}>
              <CardHeader
                eyebrow="catálogo"
                title="Tus productos"
                actionLabel="Ver catálogo"
                onAction={() => openOverlay("catalog")}
              />
              {rows.length === 0 ? (
                <Empty text="Aún no hay productos. Sincroniza con Amazon o sube un CSV." />
              ) : (
                <div className="mt-3">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-white/[0.07] pb-2 text-[10px] uppercase tracking-wider text-white/35 sm:grid-cols-[1fr_auto_auto_auto]">
                    <span>Producto</span>
                    <span className="hidden text-right sm:block">Estrategia</span>
                    <span className="text-right">Precio</span>
                    <span className="text-right">Estado</span>
                  </div>
                  <ul>
                    {rows.map(({ n, st }) => (
                      <ProductRow key={n.id} n={n} st={st} cur={sym(n.currency)} />
                    ))}
                  </ul>
                  {summary.productos > rows.length && (
                    <button
                      type="button"
                      onClick={() => openOverlay("catalog")}
                      className="mt-2 w-full rounded-lg border border-white/8 bg-white/[0.02] py-2 text-[11px] text-white/50 transition-colors hover:border-emerald-400/30 hover:text-emerald-300"
                    >
                      Ver los {summary.productos - rows.length} productos restantes →
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Rail derecho */}
          <div className="flex w-full flex-col gap-3 xl:w-[360px] xl:shrink-0">
            <QuickActions />

            {/* Reparto por estado (donut) */}
            <section className="hx-card hx-card-hover hx-rise p-5" style={{ animationDelay: "60ms" }}>
              <CardHeader
                eyebrow="estado del catálogo"
                title="Reparto por estado"
                actionLabel="Analítica"
                onAction={() => openOverlay("analytics")}
              />
              {dist.length === 0 ? (
                <Empty text="Sin productos para repartir todavía." />
              ) : (
                <div className="mt-4 flex items-center gap-4">
                  <Donut data={dist} total={summary.productos} />
                  <ul className="min-w-0 flex-1 space-y-1.5">
                    {dist.map((d) => (
                      <li key={d.st} className="hx-row flex items-center gap-2 px-1.5 py-1 text-[12px]">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: d.color, boxShadow: `0 0 8px ${d.color}` }}
                        />
                        <span className="truncate text-white/65">{d.label}</span>
                        <span className="ml-auto font-mono font-bold tabular-nums text-white/90">
                          {d.n}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Cobertura y cuota */}
            <section className="hx-card hx-card-hover hx-rise p-5" style={{ animationDelay: "240ms" }}>
              <CardHeader
                eyebrow="salud del catálogo"
                title="Cobertura y cuota"
                actionLabel="Salud"
                onAction={() => openOverlay("toolbox")}
              />
              <div className="mt-4 space-y-3.5">
                <Limit label="Con precio" value={summary.withPrice} total={summary.productos} color="#34d399" />
                <Limit
                  label="Con rango configurado"
                  value={metrics.conRango}
                  total={summary.productos}
                  color="#2dd4bf"
                />
                <Limit
                  label="Reprecio activo"
                  value={summary.active}
                  total={summary.activeLimit ?? summary.productos}
                  color="#2dd4bf"
                  caption={
                    summary.activeLimit != null
                      ? `${summary.active} de ${summary.activeLimit} permitidos`
                      : undefined
                  }
                />
                <Limit label="Buy Box ganada" value={wonPct ?? 0} total={100} color="#a3e635" isPct />
              </div>
              <button
                type="button"
                onClick={() => openOverlay("profit")}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-[12px] text-white/70 transition-colors hover:border-emerald-400/30 hover:bg-emerald-500/[0.06]"
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">💰</span> Rentabilidad por SKU
                </span>
                <span className="text-emerald-300">→</span>
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Asistente IA (hero estilo Hynex) + acciones rápidas
   ───────────────────────────────────────────────────────────────────────── */

const ASSISTANT_CHIPS = [
  "Sugiéreme precios para todo el catálogo",
  "¿Qué productos he perdido la Buy Box?",
  "Optimiza mi estrategia de reprecio",
];

const ASSISTANT_PLACEHOLDERS = [
  "Escribe o pide una acción…",
  "“Sube el Sapiens a 21,90 €”",
  "“¿Qué SKU pierde margen?”",
  "“Iguala el mercado en todo el catálogo”",
];

function AssistantCard() {
  const [ph, setPh] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setPh((p) => (p + 1) % ASSISTANT_PLACEHOLDERS.length),
      3200,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <section
      className="hx-card hx-card-emerald hx-hero hx-rise relative overflow-hidden p-5"
      style={{ animationDelay: "60ms" }}
    >
      {/* Objeto de cristal facetado decorativo (flota suavemente) */}
      <div className="pointer-events-none absolute -right-6 -top-10 h-44 w-44 opacity-70 blur-[2px]">
        <div className="hx-facet absolute inset-4 rotate-12 rounded-2xl bg-gradient-to-br from-emerald-400/40 to-teal-500/10" style={{ "--d": "6s", "--r": "12deg" } as React.CSSProperties} />
        <div className="hx-facet absolute inset-9 -rotate-6 rounded-2xl bg-gradient-to-tr from-lime-300/30 to-emerald-500/5" style={{ "--d": "7.5s", "--r": "-6deg" } as React.CSSProperties} />
        <div className="hx-facet absolute inset-14 rotate-3 rounded-xl bg-white/12 backdrop-blur-sm" style={{ "--d": "5s", "--r": "3deg" } as React.CSSProperties} />
      </div>
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
      {/* Barrido de luz */}
      <div className="hx-sheen" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="hx-icon grid h-7 w-7 place-items-center rounded-lg">
            <Icon kind="spark" />
          </span>
          <span className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">
            asistente ia · orvexia
          </span>
        </div>
        <h3 className="mt-3 text-lg font-extrabold tracking-tight text-white sm:text-xl">
          ¿Qué hacemos con tus precios hoy?
        </h3>
        <p className="mt-1 max-w-md text-[12px] leading-relaxed text-white/55">
          Pídeme sugerencias de precio con IA, diagnósticos de Buy Box o lanzar acciones
          del repricer en lenguaje natural.
        </p>

        <button
          type="button"
          onClick={() => askAssistant()}
          className="mt-4 flex w-full max-w-xl items-center gap-2 rounded-xl border border-white/12 bg-black/30 px-4 py-2.5 text-left text-[13px] text-white/45 transition-colors hover:border-emerald-400/40"
        >
          <Icon kind="chat" />
          <span key={ph} className="fade-in min-w-0 flex-1 truncate">
            {ASSISTANT_PLACEHOLDERS[ph]}
          </span>
          <span className="ml-auto shrink-0 rounded-md bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
            Preguntar
          </span>
        </button>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {ASSISTANT_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => askAssistant(c)}
              className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1 text-[11px] text-emerald-200/90 transition-colors hover:bg-emerald-400/15"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const QUICK: Array<{ key: string; label: string; cap: string; icon: IconKind }> = [
  { key: "analytics", label: "Analítica", cap: "eventos y series", icon: "chart" },
  { key: "profit", label: "Rentabilidad", cap: "margen por SKU", icon: "coin" },
  { key: "catalog", label: "Catálogo", cap: "lista · CSV masivo", icon: "list" },
  { key: "realdata", label: "Datos reales", cap: "ventas y cuota", icon: "pulse" },
  { key: "audit", label: "Auditoría", cap: "registro de cambios", icon: "shield" },
  { key: "toolbox", label: "Herramientas", cap: "salud · canales", icon: "tools" },
];

function QuickActions() {
  return (
    <section
      className="hx-card hx-rise p-5"
      style={{ animationDelay: "120ms" }}
    >
      <CardHeader eyebrow="acciones rápidas" title="Funcionalidades" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {QUICK.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => openOverlay(q.key)}
            className="group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-emerald-500/[0.05]"
          >
            <span className="hx-icon grid h-8 w-8 place-items-center rounded-xl">
              <Icon kind={q.icon} />
            </span>
            <span className="flex items-center gap-1 text-[12px] font-semibold text-white/85">
              {q.label}
              <span className="text-emerald-300 opacity-0 -translate-x-1 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                →
              </span>
            </span>
            <span className="text-[10px] leading-tight text-white/40">{q.cap}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Subcomponentes de presentación
   ───────────────────────────────────────────────────────────────────────── */

function CardHeader({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-mono-ui text-[9px] uppercase tracking-[0.18em] text-white/35">
          {eyebrow}
        </div>
        <h3 className="mt-0.5 truncate text-[15px] font-bold text-white">{title}</h3>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/[0.08]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

const TONE: Record<string, string> = {
  emerald: "text-emerald-300",
  teal: "text-teal-300",
  lime: "text-lime-300",
  rose: "text-rose-300",
  indigo: "text-emerald-300",
};

function Kpi({
  i,
  icon,
  label,
  value,
  sub,
  tone,
  featured,
  bar,
}: {
  i: number;
  icon: IconKind;
  label: string;
  value: ReactNode;
  sub: string;
  tone: keyof typeof TONE | string;
  featured?: boolean;
  bar?: number | null;
}) {
  return (
    <div
      className={`hx-rise ${featured ? "hx-card-emerald" : "hx-card hx-card-hover"} rounded-[22px] p-4`}
      style={{ animationDelay: `${i * 50}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.1em] text-white/45">{label}</div>
        <span className="hx-icon grid h-8 w-8 place-items-center rounded-xl">
          <Icon kind={icon} />
        </span>
      </div>
      <div
        className={`hx-num mt-2.5 font-mono text-[28px] font-extrabold leading-none ${
          featured ? "text-gradient-emerald" : TONE[tone] ?? "text-white"
        }`}
      >
        {value}
      </div>
      {bar != null ? (
        <div className="mt-2.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all"
              style={{ width: `${bar}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-white/40">{sub}</div>
        </div>
      ) : (
        <div className="mt-1.5 text-[11px] text-white/40">{sub}</div>
      )}
      {!featured && <span className="hx-accent-line" />}
    </div>
  );
}

function Mini({
  label,
  value,
  total,
  good,
  warn,
}: {
  label: string;
  value: number;
  total?: number;
  good?: boolean;
  warn?: boolean;
}) {
  const tone = warn ? "text-amber-300" : good ? "text-emerald-300" : "text-white/85";
  const dot = warn ? "#fbbf24" : good ? "#34d399" : "rgba(255,255,255,0.3)";
  return (
    <div className="group bg-[rgba(255,255,255,0.012)] px-4 py-3 transition-colors hover:bg-emerald-500/[0.04]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] text-white/40">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1 pl-3">
        <span className={`hx-num font-mono text-lg font-bold ${tone}`}>
          <CountUp value={value} />
        </span>
        {total != null && <span className="text-[10px] text-white/30">/ {total}</span>}
      </div>
    </div>
  );
}

function Metric({
  color,
  label,
  value,
  dim,
}: {
  color: string;
  label: string;
  value: number;
  dim?: boolean;
}) {
  return (
    <span className={`flex items-center gap-1.5 ${dim ? "opacity-45" : ""}`}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-white/45">{label}</span>
      <span className="font-mono font-bold tabular-nums text-white/90">
        <CountUp value={value} />
      </span>
    </span>
  );
}

function Donut({
  data,
  total,
}: {
  data: Array<{ st: string; n: number; color: string }>;
  total: number;
}) {
  const size = 132;
  const r = 52;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const sum = data.reduce((s, d) => s + d.n, 0) || 1;
  // Dibujado progresivo de los arcos al montar.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={13} />
        {data.map((d, i) => {
          const len = (d.n / sum) * C;
          const seg = (
            <circle
              key={d.st}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={13}
              strokeLinecap="round"
              strokeDasharray={`${drawn ? Math.max(len - 3, 0.5) : 0} ${C}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                filter: `drop-shadow(0 0 4px ${d.color})`,
                transition: "stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1)",
                transitionDelay: `${0.12 + i * 0.08}s`,
              }}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="hx-num font-mono text-2xl font-extrabold text-white">
            <CountUp value={total} />
          </div>
          <div className="text-[9px] uppercase tracking-wider text-white/40">productos</div>
        </div>
      </div>
    </div>
  );
}

function AreaChart({ series }: { series: SeriesPoint[] }) {
  const W = 700;
  const H = 200;
  const padB = 22;
  const padT = 12;
  const n = series.length;
  const hasData = series.some((p) => p.events > 0);
  const max = Math.max(1, ...series.map((p) => p.events));

  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

  const pts = (sel: (p: SeriesPoint) => number) =>
    series.map((p, i) => ({ x: x(i), y: y(sel(p)) }));

  const line = (p: Array<{ x: number; y: number }>) => {
    if (!p.length) return "";
    let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1];
      const b = p[i];
      const cxm = (a.x + b.x) / 2;
      d += ` C ${cxm.toFixed(1)} ${a.y.toFixed(1)} ${cxm.toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    return d;
  };
  const area = (p: Array<{ x: number; y: number }>) =>
    p.length ? `${line(p)} L ${W} ${H - padB} L 0 ${H - padB} Z` : "";

  // Onda ilustrativa tenue para el estado vacío (no son datos reales).
  const samplePts = Array.from({ length: n }, (_, i) => ({
    x: x(i),
    y: padT + (0.55 + 0.32 * Math.sin(i / 1.7)) * (H - padT - padB),
  }));

  const eventsPts = pts((p) => p.events);
  const changesPts = pts((p) => p.changes);

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[180px] w-full"
        role="img"
        aria-label="Actividad de reprecio en los últimos 14 días"
      >
        <defs>
          <linearGradient id="hx-area-ev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(45,212,191,0.35)" />
            <stop offset="100%" stopColor="rgba(45,212,191,0)" />
          </linearGradient>
          <linearGradient id="hx-area-ch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(52,211,153,0.45)" />
            <stop offset="100%" stopColor="rgba(163,230,53,0.04)" />
          </linearGradient>
          <linearGradient id="hx-line-ch" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={0}
            x2={W}
            y1={padT + g * (H - padT - padB)}
            y2={padT + g * (H - padT - padB)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        ))}

        {hasData ? (
          <>
            <path d={area(eventsPts)} fill="url(#hx-area-ev)" />
            <path d={area(changesPts)} fill="url(#hx-area-ch)" />
            <path
              d={line(eventsPts)}
              fill="none"
              stroke="rgba(45,212,191,0.7)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={line(changesPts)}
              fill="none"
              stroke="url(#hx-line-ch)"
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
              style={{ filter: "drop-shadow(0 2px 6px rgba(52,211,153,0.4))" }}
            />
            {/* Marcador "hoy" en el último punto */}
            <line
              x1={x(n - 1)}
              x2={x(n - 1)}
              y1={padT}
              y2={H - padB}
              stroke="rgba(163,230,53,0.35)"
              strokeWidth={1}
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
            {/* Punto final destacado */}
            {changesPts.length > 0 && (
              <>
                <circle cx={changesPts[changesPts.length - 1].x} cy={changesPts[changesPts.length - 1].y} r={6} fill="rgba(163,230,53,0.25)" />
                <circle cx={changesPts[changesPts.length - 1].x} cy={changesPts[changesPts.length - 1].y} r={3} fill="#a3e635" />
              </>
            )}
          </>
        ) : (
          <>
            <path d={area(samplePts)} fill="url(#hx-area-ev)" opacity={0.25} />
            <path
              d={line(samplePts)}
              fill="none"
              stroke="rgba(45,212,191,0.4)"
              strokeWidth={2}
              strokeDasharray="5 6"
            />
            <text x={W / 2} y={H / 2} textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize={13}>
              Aún sin actividad — ejecuta un ciclo para ver tus cambios
            </text>
          </>
        )}
      </svg>
      {n > 1 && (
        <div className="flex justify-between px-0.5 text-[9px] text-white/30">
          <span>{series[0].key}</span>
          <span>{series[Math.floor(n / 2)].key}</span>
          <span>{series[n - 1].key}</span>
        </div>
      )}
    </div>
  );
}

function Limit({
  label,
  value,
  total,
  color,
  caption,
  isPct,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  caption?: string;
  isPct?: boolean;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-white/65">{label}</span>
        <span className="font-mono font-bold tabular-nums text-white/90">
          {isPct ? `${value}%` : `${value}/${total}`}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
      {caption && <div className="mt-1 text-[10px] text-white/35">{caption}</div>}
    </div>
  );
}

function ProductRow({ n, st, cur }: { n: NetNode; st: State; cur: string }) {
  const color = STATE_COLOR[st].dot ?? STATE_COLOR[st].stroke;
  return (
    <li className="hx-row grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-white/[0.04] px-1.5 py-2.5 text-[12px] last:border-0 sm:grid-cols-[1fr_auto_auto_auto]">
      <div className="flex min-w-0 items-center gap-2.5">
        {n.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={n.imageUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-md object-cover ring-1 ring-white/10"
          />
        ) : (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/[0.05] text-[10px] text-white/40">
            {n.sku ? n.sku.slice(0, 2).toUpperCase() : "—"}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-white/85">{n.title}</div>
          <div className="truncate font-mono text-[10px] text-white/35">
            {n.asin || n.sku || "—"}
          </div>
        </div>
      </div>
      <div className="hidden text-right text-white/55 sm:block">{prettyStrategy(n.strategy)}</div>
      <div className="text-right font-mono tabular-nums text-white/90">
        {n.priceCurrent > 0 ? `${fmt(n.priceCurrent)} ${cur}` : "—"}
      </div>
      <div className="text-right">
        <span
          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            color,
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 32%, transparent)`,
          }}
        >
          {STATE_SHORT[st]}
        </span>
      </div>
    </li>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-8 text-center text-[12px] text-white/40">
      {text}
    </div>
  );
}

/* ── Iconos ─────────────────────────────────────────────────────────────── */

type IconKind =
  | "box"
  | "bolt"
  | "trophy"
  | "euro"
  | "chart"
  | "coin"
  | "list"
  | "pulse"
  | "shield"
  | "tools"
  | "spark"
  | "chat";

function Icon({ kind }: { kind: IconKind }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const c = "h-4 w-4";
  switch (kind) {
    case "box":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8" />
        </svg>
      );
    case "bolt":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      );
    case "trophy":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M7 4h10v4a5 5 0 01-10 0V4zM5 4H3v2a3 3 0 003 3M19 4h2v2a3 3 0 01-3 3M9 18h6M10 14v4M14 14v4" />
        </svg>
      );
    case "euro":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M16 6a6 6 0 100 12M5 10h7M5 14h7" />
        </svg>
      );
    case "chart":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6" />
        </svg>
      );
    case "coin":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      );
    case "list":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "pulse":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M3 12h4l2-6 4 12 2-6h6" />
        </svg>
      );
    case "shield":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4" />
        </svg>
      );
    case "tools":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M14 7a3 3 0 00-4 4l-6 6 2 2 6-6a3 3 0 004-4l-2 2-2-2 2-2zM14 14l5 5" />
        </svg>
      );
    case "spark":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
        </svg>
      );
    case "chat":
      return (
        <svg className={c} viewBox="0 0 24 24" {...p}>
          <path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" />
        </svg>
      );
  }
}
