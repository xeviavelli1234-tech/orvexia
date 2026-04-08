"use client";

import { useEffect, useState } from "react";

interface BuySignalData {
  score: number;
  label: string;
  color: "green" | "blue" | "yellow" | "orange" | "red" | "gray";
  priceScore: number;
  trendScore: number;
  storeScore: number;
  dealScore: number;
  priceMin90d: number;
  priceMax90d: number;
  priceAvg90d: number;
  trendSlope: number;
  isFakeDeal: boolean;
  recommendation: string;
}

const COLOR_MAP = {
  green:  { bg: "#DCFCE7", text: "#166534", dot: "#22C55E", bar: "#22C55E" },
  blue:   { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6", bar: "#3B82F6" },
  yellow: { bg: "#FEF9C3", text: "#854D0E", dot: "#EAB308", bar: "#EAB308" },
  orange: { bg: "#FFEDD5", text: "#9A3412", dot: "#F97316", bar: "#F97316" },
  red:    { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444", bar: "#EF4444" },
  gray:   { bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8", bar: "#94A3B8" },
};

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden flex-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}

// Badge pequeño para ProductCard
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

// Panel detallado para ProductModal
export function BuySignalPanel({ productId, store }: { productId: string; store: string }) {
  const [data, setData] = useState<BuySignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/buy-signal?productId=${productId}&store=${encodeURIComponent(store)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId, store]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] p-4 animate-pulse bg-[#F8FAFC]">
        <div className="h-4 w-40 bg-[#E2E8F0] rounded mb-2" />
        <div className="h-3 w-full bg-[#E2E8F0] rounded" />
      </div>
    );
  }
  if (!data) return null;

  const c = COLOR_MAP[data.color];

  return (
    <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden">
      {/* Header clicable */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
            style={{ backgroundColor: c.bg, color: c.text }}
          >
            {data.score}
          </span>
          <div className="text-left">
            <p className="text-sm font-bold text-[#0F172A] leading-tight">Señal de Compra</p>
            <p className="text-xs font-semibold" style={{ color: c.text }}>{data.label}</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detalle expandible */}
      {open && (
        <div className="px-4 pb-4 border-t border-[#F1F5F9] space-y-4">

          {/* Recomendación */}
          <p className="text-xs text-[#475569] leading-relaxed pt-3">
            {data.recommendation}
          </p>

          {/* Subscores */}
          <div className="space-y-2.5">
            {[
              { label: "💰 Precio histórico", score: data.priceScore, max: 40, context: `Mín 90d: ${data.priceMin90d.toFixed(0)}€ · Media: ${data.priceAvg90d.toFixed(0)}€ · Máx: ${data.priceMax90d.toFixed(0)}€` },
              { label: "📈 Tendencia", score: data.trendScore, max: 25, context: data.trendSlope > 0.1 ? `Subiendo ${data.trendSlope.toFixed(2)}€/día` : data.trendSlope < -0.1 ? `Bajando ${Math.abs(data.trendSlope).toFixed(2)}€/día` : "Precio estable" },
              { label: "🏬 Fiabilidad tienda", score: data.storeScore, max: 20, context: data.storeScore >= 16 ? "Tienda con buen historial" : data.storeScore >= 10 ? "Historial mixto" : "Tienda con manipulaciones detectadas" },
              { label: "🏷️ Descuento real", score: data.dealScore, max: 15, context: data.isFakeDeal ? "⚠️ Descuento posiblemente inflado" : data.dealScore >= 12 ? "Descuento verificado" : "Descuento parcialmente verificado" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#0F172A] w-36 shrink-0">{item.label}</span>
                  <ScoreBar value={item.score} max={item.max} color={c.bar} />
                  <span className="text-xs font-bold text-[#0F172A] w-10 text-right shrink-0">{item.score}/{item.max}</span>
                </div>
                <p className="text-[10px] text-[#94A3B8] ml-36">{item.context}</p>
              </div>
            ))}
          </div>

          {/* Score total */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-2.5 mt-2"
            style={{ backgroundColor: c.bg }}
          >
            <span className="text-sm font-bold" style={{ color: c.text }}>Puntuación total</span>
            <span className="text-xl font-black" style={{ color: c.text }}>{data.score}<span className="text-sm font-normal">/100</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
