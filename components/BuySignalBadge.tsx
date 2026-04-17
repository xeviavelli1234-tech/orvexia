"use client";

import { useEffect, useState } from "react";

interface BuySignalData {
  score: number;
  label: string;
  color: "green" | "blue" | "yellow" | "orange" | "red" | "gray";
  storeScore:  number;
  dealScore:   number;
  isFakeDeal:  boolean;
  priceScore:  number | null;
  trendScore:  number | null;
  priceMin90d: number | null;
  priceMax90d: number | null;
  priceAvg90d: number | null;
  trendSlope:  number | null;
  historyDays: number;
  recommendation: string;
}

const COLOR_MAP = {
  green:  { bg: "#DCFCE7", text: "#166534", dot: "#22C55E", bar: "#22C55E",  ring: "#22C55E", light: "#F0FDF4" },
  blue:   { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6", bar: "#3B82F6",  ring: "#3B82F6", light: "#EFF6FF" },
  yellow: { bg: "#FEF9C3", text: "#854D0E", dot: "#EAB308", bar: "#EAB308",  ring: "#EAB308", light: "#FEFCE8" },
  orange: { bg: "#FFEDD5", text: "#9A3412", dot: "#F97316", bar: "#F97316",  ring: "#F97316", light: "#FFF7ED" },
  red:    { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444", bar: "#EF4444",  ring: "#EF4444", light: "#FEF2F2" },
  gray:   { bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8", bar: "#94A3B8",  ring: "#94A3B8", light: "#F8FAFC" },
};

// ── Badge pequeño para ProductCard ───────────────────────────────────────────
export function BuySignalBadge({ productId, store }: { productId: string; store: string }) {
  const [data, setData] = useState<BuySignalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/buy-signal?productId=${productId}&store=${encodeURIComponent(store)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId, store]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F5F9] animate-pulse">
        <span className="w-8 h-3 rounded bg-[#E2E8F0]" />
      </span>
    );
  }
  if (!data) return null;

  const c = COLOR_MAP[data.color];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.dot }} />
      {data.score}
      <span className="font-normal opacity-75">/ 100</span>
    </span>
  );
}

// ── Gauge circular de puntuación ──────────────────────────────────────────────
function ScoreGauge({ score, color }: { score: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="rotate-[-90deg]">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#E2E8F0" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
    </svg>
  );
}

// ── Barra de rango de precio ──────────────────────────────────────────────────
function PriceRangeBar({
  min, avg, max, current, barColor,
}: {
  min: number; avg: number; max: number; current: number; barColor: string;
}) {
  const range = max - min;
  if (range < 0.5) return null;
  const pctCur = Math.max(0, Math.min(100, ((current - min) / range) * 100));
  const pctAvg = Math.max(0, Math.min(100, ((avg    - min) / range) * 100));

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Rango de precio — 90 días</p>
      <div className="relative h-2.5 rounded-full bg-[#E2E8F0] overflow-visible">
        {/* Relleno hasta el precio actual */}
        <div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${pctCur}%`, backgroundColor: barColor, opacity: 0.35 }}
        />
        {/* Marca media */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-full bg-[#94A3B8]"
          style={{ left: `${pctAvg}%` }}
          title={`Media: ${avg.toFixed(0)} €`}
        />
        {/* Marcador precio actual */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
          style={{ left: `${pctCur}%`, transform: "translate(-50%, -50%)", backgroundColor: barColor }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-semibold">
        <span className="text-[#64748B]">Mín {min.toFixed(0)} €</span>
        <span className="text-[#94A3B8]">Media {avg.toFixed(0)} €</span>
        <span className="text-[#64748B]">Máx {max.toFixed(0)} €</span>
      </div>
    </div>
  );
}

// ── Tarjeta de factor ─────────────────────────────────────────────────────────
function FactorCard({
  icon, label, score, max, barColor, context, noData,
}: {
  icon: string; label: string; score: number | null; max: number;
  barColor: string; context: string; noData: boolean;
}) {
  const pct = noData || score === null ? 0 : (score / max) * 100;
  return (
    <div className="rounded-xl border border-[#E2E8F0] p-3 flex flex-col gap-2 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{icon}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${noData ? "text-[#CBD5E1]" : "text-[#475569]"}`}>
            {label}
          </span>
        </div>
        <span className={`text-xs font-black ${noData ? "text-[#CBD5E1]" : "text-[#0F172A]"}`}>
          {noData ? "—" : `${score}/${max}`}
        </span>
      </div>
      {/* Barra */}
      <div className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: noData ? "#E2E8F0" : barColor }}
        />
      </div>
      <p className={`text-[10px] leading-tight ${noData ? "text-[#CBD5E1]" : "text-[#94A3B8]"}`}>
        {noData ? "Sin datos aún" : context}
      </p>
    </div>
  );
}

// ── Indicador de tendencia ────────────────────────────────────────────────────
function TrendArrow({ slope }: { slope: number | null }) {
  if (slope === null) return null;
  const up   = slope >  0.1;
  const down = slope < -0.1;
  const color = up ? "#EF4444" : down ? "#22C55E" : "#94A3B8";
  const icon  = up ? "↗" : down ? "↘" : "→";
  const text  = up
    ? `Subiendo ${slope.toFixed(2)} €/día`
    : down
    ? `Bajando ${Math.abs(slope).toFixed(2)} €/día`
    : "Precio estable";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: color + "18", color }}
    >
      {icon} {text}
    </span>
  );
}

// ── Panel detallado para ProductModal ─────────────────────────────────────────
export function BuySignalPanel({ productId, store }: { productId: string; store: string }) {
  const [data, setData]       = useState<BuySignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);

  useEffect(() => {
    fetch(`/api/buy-signal?productId=${productId}&store=${encodeURIComponent(store)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId, store]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] p-4 animate-pulse bg-[#F8FAFC]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#E2E8F0]" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-[#E2E8F0] rounded" />
            <div className="h-2.5 w-20 bg-[#E2E8F0] rounded" />
          </div>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const c = COLOR_MAP[data.color];
  const hasPrice = data.priceScore !== null && data.priceMin90d !== null;
  const hasTrend = data.trendScore !== null && data.trendSlope !== null;

  // Contextos de cada factor
  const priceCtx = hasPrice && data.priceMin90d !== null && data.priceAvg90d !== null && data.priceMax90d !== null
    ? data.priceScore! >= 32 ? "Cerca del mínimo histórico 🎯"
    : data.priceScore! >= 20 ? "En rango medio"
    : "Por encima de la media"
    : "";

  const trendCtx = hasTrend
    ? data.trendSlope! > 0.1  ? `Subiendo ${data.trendSlope!.toFixed(2)} €/día`
    : data.trendSlope! < -0.1 ? `Bajando ${Math.abs(data.trendSlope!).toFixed(2)} €/día`
    : "Precio estable"
    : "";

  const storeCtx = data.storeScore >= 16 ? "Tienda con buen historial"
    : data.storeScore >= 10 ? "Historial mixto"
    : "Inconsistencias detectadas";

  const dealCtx = data.isFakeDeal ? "⚠️ Descuento posiblemente inflado"
    : data.dealScore >= 12 ? "Descuento verificado ✓"
    : data.dealScore >= 7  ? "Descuento moderado"
    : "Sin descuento activo";

  return (
    <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden bg-white">

      {/* ── Header clicable ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[#F8FAFC] transition-colors text-left"
      >
        {/* Gauge */}
        <div className="relative flex-shrink-0 w-[72px] h-[72px]">
          <ScoreGauge score={data.score} color={c.ring} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black leading-none" style={{ color: c.text }}>{data.score}</span>
            <span className="text-[9px] font-semibold text-[#94A3B8] leading-tight">/100</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-0.5">Análisis de Compra</p>
          <p className="text-base font-black text-[#0F172A] leading-tight">{data.label}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: c.bg, color: c.text }}
            >
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: c.dot }} />
              {data.historyDays} días de datos
            </span>
            {hasTrend && <TrendArrow slope={data.trendSlope} />}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-[#94A3B8] flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Cuerpo expandible ── */}
      {open && (
        <div className="border-t border-[#F1F5F9] px-4 pb-4 space-y-4 pt-3">

          {/* Recomendación */}
          <div
            className="rounded-xl px-3.5 py-3 flex gap-2.5 items-start"
            style={{ backgroundColor: c.light }}
          >
            <span className="text-base leading-none mt-0.5">💬</span>
            <p className="text-xs text-[#475569] leading-relaxed">{data.recommendation}</p>
          </div>

          {/* Barra de rango de precio */}
          {hasPrice && data.priceMin90d !== null && data.priceAvg90d !== null && data.priceMax90d !== null && (() => {
            // Reconstruir precio actual a partir del priceScore: score = (1-pct)*40 → pct = 1-score/40
            const pct = 1 - (data.priceScore ?? 0) / 40;
            const cur = data.priceMin90d! + pct * (data.priceMax90d! - data.priceMin90d!);
            return (
              <div className="rounded-xl border border-[#E2E8F0] px-4 py-3">
                <PriceRangeBar
                  min={data.priceMin90d!}
                  avg={data.priceAvg90d!}
                  max={data.priceMax90d!}
                  current={cur}
                  barColor={c.bar}
                />
              </div>
            );
          })()}

          {/* Grid 2×2 de factores */}
          <div className="grid grid-cols-2 gap-2">
            <FactorCard
              icon="💰" label="Precio histórico"
              score={data.priceScore} max={40}
              barColor={c.bar}
              context={priceCtx}
              noData={!hasPrice}
            />
            <FactorCard
              icon="📈" label="Tendencia"
              score={data.trendScore} max={25}
              barColor={c.bar}
              context={trendCtx}
              noData={!hasTrend}
            />
            <FactorCard
              icon="🏬" label="Fiabilidad tienda"
              score={data.storeScore} max={20}
              barColor={c.bar}
              context={storeCtx}
              noData={false}
            />
            <FactorCard
              icon="🏷️" label="Descuento real"
              score={data.dealScore} max={15}
              barColor={c.bar}
              context={dealCtx}
              noData={false}
            />
          </div>

          {/* Footer: puntuación total */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ backgroundColor: c.bg }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.text, opacity: 0.7 }}>
                Puntuación total
              </p>
              <p className="text-[10px]" style={{ color: c.text, opacity: 0.6 }}>
                {data.historyDays < 5
                  ? "Con más historial mejorará el análisis"
                  : "Basado en 90 días de datos reales"}
              </p>
            </div>
            <span className="text-3xl font-black" style={{ color: c.text }}>
              {data.score}<span className="text-sm font-normal">/100</span>
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
