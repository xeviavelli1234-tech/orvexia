"use client";

import { useState, type FormEvent } from "react";

type PricingOutput = {
  recommended_price: number;
  confidence: number;
  strategy: string;
  explanation: string;
  risk_analysis: string[];
  conservative_price: number;
  aggressive_price: number;
  missing_data?: string[];
};

type Aggression = "conservative" | "balanced" | "aggressive";

const AGGR_LABELS: Record<Aggression, string> = {
  conservative: "Conservadora",
  balanced: "Equilibrada",
  aggressive: "Agresiva",
};

function eur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-white/60 mb-1.5">
        {label} {required && <span className="text-cyan-300">*</span>}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-white/[0.04] border border-white/15 px-3.5 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-cyan-300/60 focus:bg-white/[0.06] transition-colors"
      />
    </label>
  );
}

export default function PriceSimulator() {
  const [product, setProduct] = useState("");
  const [cost, setCost] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [aggression, setAggression] = useState<Aggression>("balanced");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PricingOutput | null>(null);

  const [email, setEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState<
    "idle" | "sending" | "done" | "error"
  >("idle");

  const costNum = Number(cost.replace(",", "."));
  const belowCost =
    result != null &&
    cost.trim() !== "" &&
    Number.isFinite(costNum) &&
    result.recommended_price < costNum;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (currentPrice.trim() === "") {
      setError("Indica al menos tu precio actual.");
      return;
    }
    setLoading(true);
    setResult(null);
    setLeadStatus("idle");
    try {
      const res = await fetch("/api/repricer/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          cost,
          currentPrice,
          competitorPrice,
          priceMin,
          priceMax,
          aggression,
        }),
      });
      if (!res.ok) {
        setError(
          res.status === 429
            ? "Demasiados intentos seguidos. Espera un momento."
            : "Revisa los datos e inténtalo de nuevo.",
        );
        return;
      }
      setResult((await res.json()) as PricingOutput);
    } catch {
      setError("No se pudo calcular. Revisa tu conexión.");
    } finally {
      setLoading(false);
    }
  }

  async function onLead(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLeadStatus("error");
      return;
    }
    setLeadStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "simulador",
          context: {
            product,
            cost,
            currentPrice,
            competitorPrice,
            priceMin,
            priceMax,
            aggression,
            result,
          },
        }),
      });
      setLeadStatus(res.ok ? "done" : "error");
    } catch {
      setLeadStatus("error");
    }
  }

  const delta =
    result && Number(currentPrice.replace(",", "."))
      ? ((result.recommended_price - Number(currentPrice.replace(",", "."))) /
          Number(currentPrice.replace(",", "."))) *
        100
      : null;

  return (
    <div className="neon-border rounded-3xl overflow-hidden">
      <div
        className="relative bg-grid-cyber rounded-[calc(1.5rem-1px)] p-6 sm:p-8"
        style={{ background: "linear-gradient(150deg,#0b0d1c,#08091a 55%,#050913)" }}
      >
        <div className="absolute inset-0 bg-grid-cyber-fine opacity-30 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80">
              ▸ demo en vivo · sin registro
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Prueba el motor de <span className="text-gradient-neon">precios</span>
          </h2>
          <p className="mt-2 text-sm text-white/55 max-w-lg">
            Mete tus números y mira qué precio recomienda el motor de Orvexia
            ahora mismo. Sin crear cuenta.
          </p>

          <form onSubmit={onSubmit} className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field
                label="Producto (opcional)"
                value={product}
                onChange={setProduct}
                placeholder="Ej. Lavadora 8 kg modelo X"
              />
            </div>
            <Field
              label="Precio actual (€)"
              value={currentPrice}
              onChange={setCurrentPrice}
              placeholder="449"
              required
            />
            <Field
              label="Precio de la competencia (€)"
              value={competitorPrice}
              onChange={setCompetitorPrice}
              placeholder="439"
            />
            <Field
              label="Tu coste (€)"
              value={cost}
              onChange={setCost}
              placeholder="310"
            />
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Precio mín. (€)"
                value={priceMin}
                onChange={setPriceMin}
                placeholder="399"
              />
              <Field
                label="Precio máx. (€)"
                value={priceMax}
                onChange={setPriceMax}
                placeholder="499"
              />
            </div>

            <label className="block sm:col-span-2">
              <span className="block text-xs font-semibold text-white/60 mb-1.5">
                Estrategia
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(AGGR_LABELS) as Aggression[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAggression(a)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      aggression === a
                        ? "border-cyan-300/70 bg-cyan-300/10 text-white"
                        : "border-white/15 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                    }`}
                  >
                    {AGGR_LABELS[a]}
                  </button>
                ))}
              </div>
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#0b0d1c] px-6 py-3 text-sm font-bold hover:bg-white/90 transition-colors disabled:opacity-60"
              >
                {loading ? "Calculando…" : "Calcular precio óptimo →"}
              </button>
              {error && (
                <p className="mt-2 text-sm text-rose-300">{error}</p>
              )}
            </div>
          </form>

          {result && (
            <div className="mt-7 rounded-2xl border border-white/12 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80">
                    precio recomendado
                  </p>
                  <p className="text-4xl font-extrabold text-white mt-1">
                    {eur(result.recommended_price)}
                  </p>
                  {delta != null && Math.abs(delta) >= 0.1 && (
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        delta >= 0 ? "text-emerald-300" : "text-amber-300"
                      }`}
                    >
                      {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs tu
                      precio actual
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-mono-ui text-[10px] uppercase tracking-wider text-white/50">
                    confianza
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {result.confidence}%
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-white/45">
                    Conservador
                  </p>
                  <p className="text-lg font-bold text-white/90">
                    {eur(result.conservative_price)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-white/45">
                    Agresivo
                  </p>
                  <p className="text-lg font-bold text-white/90">
                    {eur(result.aggressive_price)}
                  </p>
                </div>
              </div>

              {belowCost && (
                <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                  ⚠️ El precio recomendado queda por debajo de tu coste. Sube el
                  precio mínimo para proteger tu margen — justo lo que el repricer
                  vigila por ti.
                </p>
              )}

              <p className="mt-4 text-sm text-white/70 leading-relaxed">
                {result.explanation}
              </p>

              {result.risk_analysis.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {result.risk_analysis.map((r, i) => (
                    <li key={i} className="text-xs text-white/50 flex gap-2">
                      <span className="text-cyan-300/70">▸</span>
                      {r}
                    </li>
                  ))}
                </ul>
              )}

              {/* Captura de lead */}
              <div className="mt-6 border-t border-white/10 pt-5">
                {leadStatus === "done" ? (
                  <p className="text-sm text-emerald-300 font-semibold">
                    ✅ ¡Listo! Te avisaremos de las novedades y de cuándo se activa
                    el modo Amazon.
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-white">
                      ¿Quieres esto para todo tu catálogo, automático?
                    </p>
                    <p className="text-xs text-white/55 mt-1 mb-3">
                      Déjanos tu email: te avisamos al activar el modo Amazon y te
                      damos acceso a la prueba de 14 días.
                    </p>
                    <form
                      onSubmit={onLead}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="flex-1 rounded-xl bg-white/[0.04] border border-white/15 px-3.5 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-cyan-300/60 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={leadStatus === "sending"}
                        className="rounded-xl bg-cyan-300 text-[#06241f] px-5 py-2.5 text-sm font-bold hover:bg-cyan-200 transition-colors disabled:opacity-60 whitespace-nowrap"
                      >
                        {leadStatus === "sending" ? "Enviando…" : "Avísame"}
                      </button>
                    </form>
                    {leadStatus === "error" && (
                      <p className="mt-2 text-sm text-rose-300">
                        Revisa el email e inténtalo de nuevo.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <p className="mt-4 text-[11px] text-white/35 leading-relaxed">
            Demo orientativa con la heurística del motor. En tu cuenta, el
            repricer usa datos reales de la Buy Box, competencia y velocidad de
            venta.
          </p>
        </div>
      </div>
    </div>
  );
}
