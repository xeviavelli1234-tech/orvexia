"use client";

/**
 * Inspector / panel lateral de administración del nodo seleccionado.
 *
 * Extraído de ProductNetwork.tsx para reducir su tamaño. Es puro JSX +
 * binding de props — toda la lógica (estado, transición, handlers) sigue
 * viviendo en el componente padre, que pasa cada pieza explícitamente.
 */

import { useMemo } from "react";
import PricingSuggest from "../PricingSuggest";
import {
  breakEvenPrice,
  minPriceForMargin,
  profitAt,
  type CostInputs,
} from "@/lib/reprice/margin";
import { parseTags } from "@/lib/tags";
import { prettyStrategy } from "@/lib/format/strategy-label";
import { Toggle } from "@/components/ui/Toggle";
import type {
  Strategy,
  UndercutType,
  NoComp,
  Fulfillment,
  NetNode,
} from "./types";
import {
  fmt,
  sym,
  diagnose,
  pnum,
} from "./helpers";
import { CostField, Row } from "./Subcomponents";

export interface InspectorProps {
  sel: NetNode;
  selIsManual: boolean;
  selState: string;

  // Estado del formulario.
  min: string;
  setMin: (v: string) => void;
  max: string;
  setMax: (v: string) => void;
  strategy: Strategy;
  setStrategy: (v: Strategy) => void;
  undType: UndercutType;
  setUndType: (v: UndercutType) => void;
  undVal: string;
  setUndVal: (v: string) => void;
  fixedP: string;
  setFixedP: (v: string) => void;
  cost: string;
  setCost: (v: string) => void;
  ship: string;
  setShip: (v: string) => void;
  fba: string;
  setFba: (v: string) => void;
  vat: string;
  setVat: (v: string) => void;
  feeP: string;
  setFeeP: (v: string) => void;
  tMargin: string;
  setTMargin: (v: string) => void;
  noComp: NoComp;
  setNoComp: (v: NoComp) => void;
  stepUType: UndercutType;
  setStepUType: (v: UndercutType) => void;
  stepUVal: string;
  setStepUVal: (v: string) => void;
  useAccDef: boolean;
  setUseAccDef: (updater: (v: boolean) => boolean) => void;
  ignoreAmz: boolean;
  setIgnoreAmz: (updater: (v: boolean) => boolean) => void;
  fulfil: Fulfillment;
  setFulfil: (v: Fulfillment) => void;
  minRating: string;
  setMinRating: (v: string) => void;
  exclSellers: string;
  setExclSellers: (v: string) => void;
  onlySell: string;
  setOnlySell: (v: string) => void;
  tags: string;
  setTags: (v: string) => void;
  parentA: string;
  setParentA: (v: string) => void;

  // Callbacks.
  saveRange: () => void;
  toggle: () => void;
  saveStrategy: () => void;
  saveCompetition: () => void;
  saveTags: () => void;
  saveParent: () => void;
  repriceNow: () => void;
  setSelId: (v: string | null) => void;

  // Flags.
  pending: boolean;
  repricing: boolean;
  err: string | null;
}

export default function Inspector({
  sel,
  selIsManual,
  selState,
  min,
  setMin,
  max,
  setMax,
  strategy,
  setStrategy,
  undType,
  setUndType,
  undVal,
  setUndVal,
  fixedP,
  setFixedP,
  cost,
  setCost,
  ship,
  setShip,
  fba,
  setFba,
  vat,
  setVat,
  feeP,
  setFeeP,
  tMargin,
  setTMargin,
  noComp,
  setNoComp,
  stepUType,
  setStepUType,
  stepUVal,
  setStepUVal,
  useAccDef,
  setUseAccDef,
  ignoreAmz,
  setIgnoreAmz,
  fulfil,
  setFulfil,
  minRating,
  setMinRating,
  exclSellers,
  setExclSellers,
  onlySell,
  setOnlySell,
  tags,
  setTags,
  parentA,
  setParentA,
  saveRange,
  toggle,
  saveStrategy,
  saveCompetition,
  saveTags,
  saveParent,
  repriceNow,
  setSelId,
  pending,
  repricing,
  err,
}: InspectorProps) {
  const fmtEur = (n: number) => n.toFixed(2).replace(".", ",") + " €";

  // Calculadora de costes/margen en vivo (estrategia MARGIN).
  const costCalc = useMemo(() => {
    const pf = (s: string) => {
      const n = Number.parseFloat(s.replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    };
    const c: CostInputs = {
      cost: pf(cost),
      shipping: pf(ship),
      fbaFee: pf(fba),
      referralPct: pf(feeP) || 15,
      vatPct: feeP === "" && vat === "" ? 21 : pf(vat),
    };
    if (!(c.cost > 0)) return null;
    const breakEven = breakEvenPrice(c);
    const minRec = minPriceForMargin(c, pf(tMargin));
    const atCurrent =
      sel && sel.priceCurrent > 0 ? profitAt(sel.priceCurrent, c) : null;
    return { breakEven, minRec, atCurrent };
  }, [cost, ship, fba, vat, feeP, tMargin, sel]);

  return (
    <div className="absolute inset-y-0 right-0 w-full sm:w-[380px] bg-[rgba(7,7,18,0.96)] backdrop-blur-2xl border-l border-cyan-400/15 shadow-[-30px_0_60px_-30px_rgba(34,211,238,0.35)] overflow-y-auto fade-in">
      {/* Cabecera */}
      <div className="sticky top-0 z-10 flex items-start gap-3 px-5 py-4 bg-[rgba(7,7,18,0.96)] backdrop-blur-2xl border-b border-white/10">
        <div className="h-11 w-11 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden grid place-items-center">
          {sel.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sel.imageUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-white/30 text-xs">—</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white/90 leading-snug line-clamp-2">
            {sel.title}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-white/35 truncate">
            {selIsManual ? (
              <span className="inline-flex items-center gap-1 rounded-sm border border-cyan-400/30 bg-cyan-400/[0.08] px-1 py-px text-cyan-200/85 text-[9px] uppercase tracking-wider">
                Tu tienda
              </span>
            ) : (
              <span className="truncate">{sel.asin || "sin ASIN"}</span>
            )}
            <span className="text-white/25">·</span>
            <span className="truncate">{sel.sku}</span>
          </div>
        </div>
        <button
          onClick={() => setSelId(null)}
          aria-label="Cerrar"
          className="shrink-0 h-7 w-7 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(99,102,241,0.06))] p-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
            Precio actual
          </div>
          <div className="mt-1 text-3xl font-extrabold text-cyan-300 text-glow-cyan tabular-nums">
            {sel.priceCurrent > 0 ? `${fmt(sel.priceCurrent)} ${sym(sel.currency)}` : "Sin oferta"}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {sel.priceMin != null && sel.priceMax != null && (
              <span className="text-[11px] text-white/45">
                Rango {fmt(sel.priceMin)}–{fmt(sel.priceMax)} {sym(sel.currency)}
              </span>
            )}
            {!selIsManual && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  sel.buyBoxStatus === "WON"
                    ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/25"
                    : sel.buyBoxStatus === "LOST"
                      ? "text-red-300 bg-red-500/10 border-red-400/25"
                      : "text-white/45 bg-white/[0.05] border-white/10"
                }`}
              >
                Buy Box:{" "}
                {sel.buyBoxStatus === "WON"
                  ? "ganada"
                  : sel.buyBoxStatus === "LOST"
                    ? "perdida"
                    : "—"}
              </span>
            )}
          </div>
        </div>

      {(() => {
        const dg = diagnose(sel);
        if (!dg) return null;
        const cls =
          dg.tone === "ok"
            ? "text-emerald-300/90 border-emerald-400/25 bg-emerald-400/[0.06]"
            : dg.tone === "warn"
              ? "text-amber-300/90 border-amber-400/25 bg-amber-400/[0.06]"
              : "text-cyan-200/90 border-cyan-400/20 bg-cyan-400/[0.05]";
        return (
          <div
            className={`mt-4 flex gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-relaxed ${cls}`}
          >
            <span className="shrink-0">
              {dg.tone === "ok" ? "✓" : dg.tone === "warn" ? "⚠" : "ℹ"}
            </span>
            <span>{dg.text}</span>
          </div>
        );
      })()}

      {/* Tarjeta de precio sugerido (modo manual con plan generado) */}
      {selIsManual && sel.suggestedPrice != null && sel.suggestedPrice > 0 && (
        <div className="mt-4 rounded-xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(99,102,241,0.06))] p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] uppercase tracking-[0.16em] text-cyan-200/80">
              Precio sugerido
              {sel.suggestedStrategy
                ? ` · ${prettyStrategy(sel.suggestedStrategy)}`
                : ""}
            </span>
            {sel.suggestedConfidence != null && (
              <span className="text-[11px] text-white/55">
                Confianza{" "}
                <strong
                  className={
                    sel.suggestedConfidence >= 75
                      ? "text-emerald-300"
                      : sel.suggestedConfidence >= 50
                        ? "text-amber-300"
                        : "text-rose-300"
                  }
                >
                  {Math.round(sel.suggestedConfidence)}%
                </strong>
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-cyan-200 tabular-nums">
              {fmt(sel.suggestedPrice)} {sym(sel.currency)}
            </span>
            {sel.priceCurrent > 0 && (
              <span
                className={`text-xs font-semibold ${
                  sel.suggestedPrice > sel.priceCurrent
                    ? "text-emerald-300"
                    : sel.suggestedPrice < sel.priceCurrent
                      ? "text-amber-300"
                      : "text-white/50"
                }`}
              >
                {sel.suggestedPrice > sel.priceCurrent ? "+" : ""}
                {((sel.suggestedPrice - sel.priceCurrent) / sel.priceCurrent * 100).toFixed(1)}%
              </span>
            )}
          </div>
          {sel.suggestedReason && (
            <p className="mt-2 text-[11px] text-white/55 leading-relaxed">
              {sel.suggestedReason}
            </p>
          )}
          {sel.suggestedAt && (
            <p className="mt-2 text-[10px] text-white/35">
              Generado:{" "}
              {new Intl.DateTimeFormat("es-ES", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(sel.suggestedAt))}
            </p>
          )}
        </div>
      )}

      {/* ── Botón de reprecio inmediato (solo Amazon, productos con precio) ── */}
      {!selIsManual && selState !== "noprice" && (
        <button
          type="button"
          onClick={repriceNow}
          disabled={repricing || pending}
          className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-all border flex items-center justify-center gap-2
            ${repricing
              ? "border-cyan-400/30 bg-cyan-400/[0.06] text-cyan-300/60 cursor-not-allowed"
              : "border-cyan-400/50 bg-cyan-400/[0.08] text-cyan-200 hover:bg-cyan-400/[0.16] hover:border-cyan-400/70 hover:shadow-[0_0_16px_-4px_rgba(34,211,238,0.55)] active:scale-[0.98]"
            }`}
        >
          {repricing ? (
            <>
              <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Repreciando…
            </>
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10a6 6 0 1 1 1.5 4" />
                <path d="M4 14v-4h4" />
              </svg>
              Repreciar ahora
            </>
          )}
        </button>
      )}

      {selState === "noprice" ? (
        <p className="mt-4 text-xs text-amber-300/80 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
          {selIsManual
            ? "Este producto no tiene precio actual en el CSV. Edita el archivo y vuelve a subirlo."
            : "Este producto no tiene oferta/precio activo en Amazon (o le falta ASIN). No se puede repreciar hasta que tenga una oferta válida."}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Mín €</span>
              <input value={min} onChange={(e) => setMin(e.target.value)}
                inputMode="decimal" placeholder="0,00" disabled={pending}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Máx €</span>
              <input value={max} onChange={(e) => setMax(e.target.value)}
                inputMode="decimal" placeholder="0,00" disabled={pending}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none" />
            </label>
          </div>
          <button onClick={saveRange} disabled={pending}
            className="mt-3 w-full rounded-lg bg-[var(--brand-600)] text-white py-2 text-sm font-semibold hover:bg-[var(--brand-700)] transition-colors disabled:opacity-50">
            {pending ? "Guardando…" : "Guardar rango"}
          </button>

          {!selIsManual && (
            <>
              <PricingSuggest
                listingId={sel.id}
                currency={sel.currency}
                onApplyMin={(v) => setMin(String(v).replace(".", ","))}
                onApplyMax={(v) => setMax(String(v).replace(".", ","))}
                onApplyFixed={(v) => {
                  setStrategy("FIXED");
                  setFixedP(String(v).replace(".", ","));
                }}
              />
              <p className="mt-1 text-[10px] text-white/30 text-center">
                IA analiza histórico, competencia y márgenes
              </p>
            </>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white/90">
                {selIsManual ? "Incluir en el plan" : "Reprecio automático"}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    sel.repricingEnabled ? "bg-emerald-400" : "bg-white/30"
                  }`}
                />
                <span className={sel.repricingEnabled ? "text-emerald-300" : "text-white/45"}>
                  {sel.repricingEnabled
                    ? selIsManual
                      ? "Incluido"
                      : "Activo"
                    : selIsManual
                      ? "Excluido"
                      : "Pausado"}
                </span>
              </div>
            </div>
            <Toggle on={sel.repricingEnabled} disabled={pending} onClick={toggle} />
          </div>

          {/* ── Estrategia de reprecio ── */}
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Estrategia
            </div>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as Strategy)}
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
            >
              {!selIsManual && (
                <option value="BUYBOX">Ganar Buy Box (bajar del más barato)</option>
              )}
              {!selIsManual && (
                <option value="BUYBOX_WINNER">Ganar Buy Box (bajar del ganador)</option>
              )}
              {!selIsManual && (
                <option value="MATCH">Igualar al competidor</option>
              )}
              <option value="FIXED">Precio fijo</option>
              <option value="MARGIN">Por margen (coste + beneficio)</option>
            </select>

            {!selIsManual && (strategy === "BUYBOX" || strategy === "BUYBOX_WINNER" || strategy === "MARGIN") && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    Bajar por
                  </span>
                  <select
                    value={undType}
                    onChange={(e) => setUndType(e.target.value as UndercutType)}
                    disabled={pending}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                  >
                    <option value="AMOUNT">Importe €</option>
                    <option value="PERCENT">Porcentaje %</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {undType === "PERCENT" ? "%" : "€"}
                  </span>
                  <input
                    value={undVal}
                    onChange={(e) => setUndVal(e.target.value)}
                    inputMode="decimal"
                    placeholder={undType === "PERCENT" ? "2" : "0,01"}
                    disabled={pending}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                  />
                </label>
              </div>
            )}

            {strategy === "FIXED" && (
              <label className="mt-3 block">
                <span className="text-[10px] uppercase tracking-wider text-white/40">
                  Precio fijo €
                </span>
                <input
                  value={fixedP}
                  onChange={(e) => setFixedP(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  disabled={pending}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                />
              </label>
            )}

            {strategy === "MARGIN" && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <CostField label="Coste €" value={cost} set={setCost}
                    placeholder="0,00" disabled={pending} />
                  <CostField label="Envío €" value={ship} set={setShip}
                    placeholder="0,00" disabled={pending} />
                  <CostField label="FBA €" value={fba} set={setFba}
                    placeholder="0,00" disabled={pending} />
                  <CostField label="Comis. %" value={feeP} set={setFeeP}
                    placeholder="15" disabled={pending} />
                  <CostField label="IVA %" value={vat} set={setVat}
                    placeholder="21" disabled={pending} />
                  <CostField label="Margen %" value={tMargin} set={setTMargin}
                    placeholder="10" disabled={pending} />
                </div>

                {costCalc && (
                  <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-3 space-y-1.5 text-[12px]">
                    <Row k="Precio de equilibrio"
                      v={costCalc.breakEven != null
                        ? fmtEur(costCalc.breakEven)
                        : "no rentable"}
                      warn={costCalc.breakEven == null} />
                    <Row k={`Mínimo para ${pnum(tMargin) || 0}% margen`}
                      v={costCalc.minRec != null
                        ? fmtEur(costCalc.minRec)
                        : "no alcanzable"}
                      warn={costCalc.minRec == null} accent />
                    {costCalc.atCurrent && (
                      <Row
                        k={`Margen a ${fmtEur(sel.priceCurrent)} (actual)`}
                        v={`${costCalc.atCurrent.profit
                          .toFixed(2)
                          .replace(".", ",")} € · ${costCalc.atCurrent.marginPct.toFixed(
                          1,
                        )}%`}
                        warn={costCalc.atCurrent.profit < 0}
                      />
                    )}
                    {costCalc.minRec != null && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          setMin(
                            String(
                              Math.ceil((costCalc.minRec as number) * 100) / 100,
                            ),
                          )
                        }
                        className="mt-1 w-full rounded-md border border-cyan-400/40 text-cyan-200 py-1.5 text-[11px] font-semibold hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                      >
                        Usar como precio mínimo ↑
                      </button>
                    )}
                    <p className="text-[10px] text-white/35 pt-0.5">
                      Precios con IVA incluido. El motor nunca bajará del
                      mínimo rentable.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!selIsManual && strategy !== "FIXED" && (
              <>
                <label className="mt-3 block">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    Sin competencia
                  </span>
                  <select
                    value={noComp}
                    onChange={(e) => setNoComp(e.target.value as NoComp)}
                    disabled={pending}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                  >
                    <option value="MAX">Subir al máximo</option>
                    <option value="HOLD">Mantener precio</option>
                    <option value="STEP_UP">Subir gradualmente</option>
                  </select>
                </label>
                {noComp === "STEP_UP" && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">
                        Paso por
                      </span>
                      <select
                        value={stepUType}
                        onChange={(e) =>
                          setStepUType(e.target.value as UndercutType)
                        }
                        disabled={pending}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                      >
                        <option value="AMOUNT">Importe €</option>
                        <option value="PERCENT">Porcentaje %</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wider text-white/40">
                        {stepUType === "PERCENT" ? "% / ciclo" : "€ / ciclo"}
                      </span>
                      <input
                        value={stepUVal}
                        onChange={(e) => setStepUVal(e.target.value)}
                        inputMode="decimal"
                        placeholder={stepUType === "PERCENT" ? "1" : "0,05"}
                        disabled={pending}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                      />
                    </label>
                    <p className="col-span-2 text-[10px] text-white/35">
                      Sin competencia el precio sube este paso cada ciclo
                      hasta el máximo (no salta de golpe).
                    </p>
                  </div>
                )}
              </>
            )}

            <button
              onClick={saveStrategy}
              disabled={pending}
              className="mt-3 w-full rounded-lg border border-cyan-400/40 text-cyan-200 py-2 text-sm font-semibold hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar estrategia"}
            </button>
          </div>

          {/* ── Etiquetas / grupos ── */}
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Etiquetas / grupos
            </div>
            {parseTags(tags).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {parseTags(tags).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-200"
                  >
                    {t}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        setTags(
                          parseTags(tags)
                            .filter((x) => x !== t)
                            .join(","),
                        )
                      }
                      className="text-cyan-300/70 hover:text-white leading-none"
                      aria-label={`Quitar ${t}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="marca, temporada-alta, liquidación…"
              disabled={pending}
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-400/60 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-white/35">
              Separadas por comas. Sirven para filtrar y aplicar acciones
              por grupo en el catálogo.
            </p>
            <button
              onClick={saveTags}
              disabled={pending}
              className="mt-2 w-full rounded-lg border border-cyan-400/40 text-cyan-200 py-2 text-sm font-semibold hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar etiquetas"}
            </button>

            {!selIsManual && (
              <div className="mt-4 border-t border-white/10 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-white/40">
                  Variación · ASIN padre
                </span>
                <input
                  value={parentA}
                  onChange={(e) => setParentA(e.target.value)}
                  placeholder="B0XXXXXXXX (vacío = producto único)"
                  disabled={pending}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-400/60 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-white/35">
                  Agrupa tallas/colores bajo el mismo ASIN padre para
                  filtrarlos y gestionarlos como familia.
                </p>
                <button
                  onClick={saveParent}
                  disabled={pending}
                  className="mt-2 w-full rounded-lg border border-cyan-400/40 text-cyan-200 py-2 text-sm font-semibold hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                >
                  {pending ? "Guardando…" : "Guardar variación"}
                </button>
              </div>
            )}
          </div>

          {/* ── Competencia ── */}
          {!selIsManual && (<div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Competencia
            </div>

            <label className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-white/85">Usar ajustes de la cuenta</span>
              <Toggle on={useAccDef} disabled={pending} onClick={() => setUseAccDef((v) => !v)} />
            </label>
            {useAccDef && (
              <p className="mt-1 text-[10px] text-white/35">
                La estrategia se hereda de los ajustes de cuenta.
              </p>
            )}

            <label className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-white/85">Ignorar Amazon (retail)</span>
              <Toggle on={ignoreAmz} disabled={pending} onClick={() => setIgnoreAmz((v) => !v)} />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-white/40">
                  Logística
                </span>
                <select
                  value={fulfil}
                  onChange={(e) => setFulfil(e.target.value as Fulfillment)}
                  disabled={pending}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                >
                  <option value="ANY">Cualquiera</option>
                  <option value="FBA">Solo FBA</option>
                  <option value="FBM">Solo FBM</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-white/40">
                  Valoración mín. (0-5)
                </span>
                <input
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  inputMode="decimal"
                  placeholder="sin filtro"
                  disabled={pending}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                Excluir vendedores (IDs, separados por comas)
              </span>
              <input
                value={exclSellers}
                onChange={(e) => setExclSellers(e.target.value)}
                placeholder="A1B2C3D4E5, F6G7H8I9J0"
                disabled={pending}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-400/60 focus:outline-none"
              />
            </label>
            <label className="mt-2 block">
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                Solo competir con (IDs; vacío = todos)
              </span>
              <input
                value={onlySell}
                onChange={(e) => setOnlySell(e.target.value)}
                placeholder="vacío = todos"
                disabled={pending}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-400/60 focus:outline-none"
              />
            </label>
            <p className="mt-1 text-[10px] text-white/35">
              El seller ID aparece en la actividad/competencia. «Excluir»
              ignora a esos vendedores; «Solo» compite únicamente contra
              ellos.
            </p>

            <button
              onClick={saveCompetition}
              disabled={pending}
              className="mt-3 w-full rounded-lg border border-cyan-400/40 text-cyan-200 py-2 text-sm font-semibold hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar competencia"}
            </button>
          </div>)}
        </>
      )}

        {err && (
          <p className="mt-4 text-xs text-red-300 rounded-lg border border-red-400/25 bg-red-500/10 p-2.5">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

