"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "@/components/ui/Spinner";

type Urgency = "low" | "normal" | "high";
type Aggression = "conservative" | "balanced" | "aggressive";

interface Suggestion {
  recommended_price: number;
  confidence: number;
  strategy: string;
  explanation: string;
  risk_analysis: string[];
  conservative_price: number;
  aggressive_price: number;
  missing_data?: string[];
}

interface ApiResponse {
  ok: true;
  listingId: string;
  sku: string;
  input: {
    currency: string;
    currentPrice: number;
    priceMin: number | null;
    priceMax: number | null;
    historical: {
      averagePrice: number | null;
      minHistoricalPrice: number | null;
      maxHistoricalPrice: number | null;
      lastPrices: number[];
      trendPercent7d: number | null;
    };
    urgency: Urgency;
    aggression: Aggression;
  };
  suggestion: Suggestion;
}

interface Props {
  listingId: string;
  currency: string;
  onApplyMin?: (v: number) => void;
  onApplyMax?: (v: number) => void;
  onApplyFixed?: (v: number) => void;
}

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function sym(c: string) {
  return c === "USD" ? "$" : c === "GBP" ? "£" : "€";
}

export default function PricingSuggest({
  listingId,
  currency,
  onApplyMin,
  onApplyMax,
  onApplyFixed,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [aggression, setAggression] = useState<Aggression>("balanced");
  const [mounted, setMounted] = useState(false);

  // Solo creamos el portal en cliente (evita hydration mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Bloquea scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function run() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/sellers/pricing/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, urgency, aggression }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `http_${res.status}`);
      }
      const j = (await res.json()) as ApiResponse;
      setData(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setOpen(true);
    if (!data && !loading) run();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/20 transition-colors"
      >
        <span aria-hidden>💡</span>
        Sugerir precio con IA
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm fade-in p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-400/25 bg-[rgba(7,7,18,0.97)] shadow-[0_20px_60px_-20px_rgba(34,211,238,0.55)]"
          >
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
              <div>
                <div className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300">
                  ▸ pricing engine · IA
                </div>
                <h3 className="text-base font-bold text-white">Sugerir precio</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10"
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-white/45">
                    Urgencia
                  </span>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as Urgency)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                  >
                    <option value="low">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta (liquidar)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-white/45">
                    Estrategia
                  </span>
                  <select
                    value={aggression}
                    onChange={(e) => setAggression(e.target.value as Aggression)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                  >
                    <option value="conservative">Conservadora</option>
                    <option value="balanced">Equilibrada</option>
                    <option value="aggressive">Agresiva</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={run}
                disabled={loading}
                aria-busy={loading || undefined}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500/90 px-3 py-2 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="text-black" />
                    <span>Analizando…</span>
                  </>
                ) : (
                  <span>{data ? "Recalcular" : "Generar recomendación"}</span>
                )}
              </button>

              {err && (
                <p className="text-xs text-rose-300 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2">
                  Error: {err}
                </p>
              )}

              {loading && !data && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.04] px-4 py-6 flex flex-col items-center justify-center gap-3"
                >
                  <Spinner size="lg" className="text-cyan-300" />
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                    ▸ procesando señales
                  </p>
                  <p className="text-xs text-white/55 text-center max-w-[280px] leading-relaxed">
                    Analizando histórico, competencia y tendencia para sugerir el mejor precio dentro de tu rango.
                  </p>
                </div>
              )}

              {data && !loading && (
                <div className="space-y-4">
                  {/* Recomendado */}
                  <div className="rounded-xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(99,102,241,0.06))] p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-cyan-200/80">
                        Recomendado · {data.suggestion.strategy}
                      </span>
                      <span className="text-[11px] text-white/55">
                        Confianza{" "}
                        <strong
                          className={
                            data.suggestion.confidence >= 75
                              ? "text-emerald-300"
                              : data.suggestion.confidence >= 50
                                ? "text-amber-300"
                                : "text-rose-300"
                          }
                        >
                          {data.suggestion.confidence}%
                        </strong>
                      </span>
                    </div>
                    <div className="mt-1 text-3xl font-extrabold text-cyan-300 tabular-nums">
                      {fmt(data.suggestion.recommended_price)} {sym(data.input.currency)}
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-white/80">
                      {data.suggestion.explanation}
                    </p>
                  </div>

                  {/* Alternativas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/[0.06] p-3">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-300/80">
                        Conservadora
                      </div>
                      <div className="mt-0.5 text-xl font-bold text-emerald-200 tabular-nums">
                        {fmt(data.suggestion.conservative_price)} {sym(data.input.currency)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-rose-400/25 bg-rose-500/[0.06] p-3">
                      <div className="text-[10px] uppercase tracking-wider text-rose-300/80">
                        Agresiva
                      </div>
                      <div className="mt-0.5 text-xl font-bold text-rose-200 tabular-nums">
                        {fmt(data.suggestion.aggressive_price)} {sym(data.input.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Riesgos */}
                  {data.suggestion.risk_analysis.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/45 mb-1">
                        Riesgos detectados
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-[13px] text-white/70">
                        {data.suggestion.risk_analysis.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {data.suggestion.missing_data && data.suggestion.missing_data.length > 0 && (
                    <div className="rounded-lg border border-amber-400/25 bg-amber-500/[0.05] p-3 text-[12px] text-amber-200/85">
                      <strong>Datos faltantes:</strong>{" "}
                      {data.suggestion.missing_data.join(" · ")}
                    </div>
                  )}

                  {/* Histórico */}
                  {data.input.historical.averagePrice != null && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[12px] text-white/65">
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                        Histórico (30 d)
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Media:{" "}
                          <strong className="text-white/85">
                            {fmt(data.input.historical.averagePrice)} {sym(data.input.currency)}
                          </strong>
                        </span>
                        {data.input.historical.minHistoricalPrice != null && (
                          <span>
                            Mín:{" "}
                            <strong className="text-white/85">
                              {fmt(data.input.historical.minHistoricalPrice)}
                            </strong>
                          </span>
                        )}
                        {data.input.historical.maxHistoricalPrice != null && (
                          <span>
                            Máx:{" "}
                            <strong className="text-white/85">
                              {fmt(data.input.historical.maxHistoricalPrice)}
                            </strong>
                          </span>
                        )}
                        {data.input.historical.trendPercent7d != null && (
                          <span>
                            Tendencia 7 d:{" "}
                            <strong
                              className={
                                data.input.historical.trendPercent7d > 0
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                              }
                            >
                              {data.input.historical.trendPercent7d > 0 ? "+" : ""}
                              {data.input.historical.trendPercent7d.toFixed(2)}%
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Aplicar */}
                  <div className="border-t border-white/10 pt-3">
                    <div className="text-[10px] uppercase tracking-wider text-white/45 mb-2">
                      Aplicar al producto
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {onApplyMin && (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyMin(data.suggestion.conservative_price);
                            setOpen(false);
                          }}
                          className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20 transition-colors text-left"
                        >
                          <div className="font-semibold">→ Mín</div>
                          <div className="text-[10px] opacity-70">conservador</div>
                        </button>
                      )}
                      {onApplyFixed && (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyFixed(data.suggestion.recommended_price);
                            setOpen(false);
                          }}
                          className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20 transition-colors text-left"
                        >
                          <div className="font-semibold">→ Precio fijo</div>
                          <div className="text-[10px] opacity-70">recomendado</div>
                        </button>
                      )}
                      {onApplyMax && (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyMax(data.suggestion.aggressive_price);
                            setOpen(false);
                          }}
                          className="rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-2 text-xs text-rose-200 hover:bg-rose-500/20 transition-colors text-left"
                        >
                          <div className="font-semibold">→ Máx</div>
                          <div className="text-[10px] opacity-70">agresivo</div>
                        </button>
                      )}
                    </div>
                    {(onApplyMin || onApplyMax) && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyMin?.(data.suggestion.conservative_price);
                          onApplyMax?.(data.suggestion.aggressive_price);
                          setOpen(false);
                        }}
                        className="mt-2 w-full rounded-md border border-white/20 bg-white/[0.04] px-3 py-2 text-xs text-white/85 hover:bg-white/10 transition-colors"
                      >
                        → Aplicar Mín y Máx a la vez (rango completo)
                      </button>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-white/35 leading-relaxed">
                ⚠ La sugerencia se basa en histórico de los últimos 30 días + datos del listing.
                Sin <em>ventas reales</em> (requiere SP-API Orders) la confianza es limitada.
                Revisa siempre antes de aplicar.
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
