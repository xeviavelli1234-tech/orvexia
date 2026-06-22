"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatEUR } from "@/lib/format/eur";

/** Convierte el texto de un input numérico (admite coma decimal) a número. */
function parseNum(value: string): number {
  if (!value.trim()) return 0;
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  hint?: string;
  step?: string;
};

function Field({ id, label, value, onChange, suffix, hint, step = "0.01" }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-bold text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-bg-subtle pl-4 pr-12 py-2.5 text-sm font-semibold text-fg placeholder-fg-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-subtle pointer-events-none">
          {suffix}
        </span>
      </div>
      {hint && <p className="text-xs text-fg-subtle leading-relaxed">{hint}</p>}
    </div>
  );
}

export function MargenCalculator() {
  const [precioVenta, setPrecioVenta] = useState("29.99");
  const [costeProducto, setCosteProducto] = useState("10");
  const [comision, setComision] = useState("15");
  const [fba, setFba] = useState("3.50");
  const [iva, setIva] = useState("21");
  const [otros, setOtros] = useState("1");
  const [margenObjetivo, setMargenObjetivo] = useState("20");

  const r = useMemo(() => {
    const pv = parseNum(precioVenta);
    const coste = parseNum(costeProducto);
    const com = parseNum(comision) / 100;
    const tarifaFba = parseNum(fba);
    const ivaPct = parseNum(iva) / 100;
    const otrosCostes = parseNum(otros);
    const objetivo = parseNum(margenObjetivo) / 100;

    // Costes que no dependen del precio (lo que sí depende es comisión e IVA).
    const costesFijos = coste + tarifaFba + otrosCostes;

    // Base imponible (lo que te queda del PVP tras descontar el IVA repercutido).
    const baseImponible = ivaPct > -1 ? pv / (1 + ivaPct) : pv;
    const comisionEur = pv * com;
    const beneficio = baseImponible - costesFijos - comisionEur;
    const margen = pv > 0 ? (beneficio / pv) * 100 : 0;
    const inversion = coste + otrosCostes;
    const roi = inversion > 0 ? (beneficio / inversion) * 100 : 0;

    // Margen que aporta cada euro de precio (tras IVA y comisión).
    const factor = 1 / (1 + ivaPct) - com;
    const breakEven = factor > 0 ? costesFijos / factor : Infinity;
    const factorObjetivo = factor - objetivo;
    const suelo = factorObjetivo > 0 ? costesFijos / factorObjetivo : Infinity;

    return { beneficio, margen, roi, comisionEur, baseImponible, breakEven, suelo };
  }, [precioVenta, costeProducto, comision, fba, iva, otros, margenObjetivo]);

  const enPerdidas = r.beneficio < 0;

  return (
    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
      {/* ── Entradas ── */}
      <div className="bg-bg-elevated border border-border rounded-2xl p-6 sm:p-7 space-y-5">
        <div>
          <h2 className="text-lg font-extrabold text-fg">Tus números</h2>
          <p className="text-sm text-fg-muted mt-0.5">
            Ajusta los valores de tu producto. El cálculo se actualiza al instante.
          </p>
        </div>

        <Field
          id="precio-venta"
          label="Precio de venta (PVP)"
          value={precioVenta}
          onChange={setPrecioVenta}
          suffix="€"
          hint="Precio final en Amazon, IVA incluido."
        />
        <Field
          id="coste-producto"
          label="Coste del producto"
          value={costeProducto}
          onChange={setCosteProducto}
          suffix="€"
          hint="Lo que te cuesta a ti cada unidad."
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            id="comision"
            label="Comisión de Amazon"
            value={comision}
            onChange={setComision}
            suffix="%"
            step="0.1"
            hint="Tarifa por referencia (suele ser 7–15 %)."
          />
          <Field
            id="fba"
            label="Tarifa logística FBA"
            value={fba}
            onChange={setFba}
            suffix="€"
            hint="Por unidad. Pon 0 si gestionas tú (FBM)."
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            id="iva"
            label="IVA"
            value={iva}
            onChange={setIva}
            suffix="%"
            step="0.1"
            hint="IVA aplicado al PVP (21 % general)."
          />
          <Field
            id="otros"
            label="Otros costes"
            value={otros}
            onChange={setOtros}
            suffix="€"
            hint="Envío a Amazon, embalaje, devoluciones…"
          />
        </div>
      </div>

      {/* ── Resultados ── */}
      <div className="space-y-5">
        {/* Beneficio + margen */}
        <div
          className="rounded-2xl border p-6 sm:p-7"
          style={{
            background: enPerdidas
              ? "linear-gradient(135deg, rgba(244,63,94,0.10), rgba(10,13,26,0.4))"
              : "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(10,13,26,0.4))",
            borderColor: enPerdidas ? "rgba(244,63,94,0.35)" : "rgba(16,185,129,0.35)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-fg-subtle">
            Beneficio neto por unidad
          </p>
          <p
            className="text-4xl sm:text-5xl font-black mt-1 tracking-tight"
            style={{ color: enPerdidas ? "#FB7185" : "#34D399" }}
          >
            {formatEUR(r.beneficio)}
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 mt-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-fg-subtle">Margen neto</p>
              <p className="text-xl font-extrabold text-fg mt-0.5">{formatPct(r.margen)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-fg-subtle">ROI</p>
              <p className="text-xl font-extrabold text-fg mt-0.5">{formatPct(r.roi)}</p>
            </div>
          </div>
          {enPerdidas && (
            <p className="mt-5 flex items-start gap-2 text-sm font-semibold text-rose-300">
              <svg className="shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              A este precio vendes a pérdida. Sube el PVP o reduce costes.
            </p>
          )}
        </div>

        {/* Desglose */}
        <div className="bg-bg-elevated border border-border rounded-2xl p-6 divide-y divide-border">
          <Row label="Base imponible (sin IVA)" value={formatEUR(r.baseImponible)} />
          <Row label="Comisión de Amazon" value={`− ${formatEUR(r.comisionEur)}`} />
          <Row label="Precio de equilibrio" value={formatEUR(r.breakEven)} hint="Por debajo de aquí, pierdes dinero." />
        </div>

        {/* Suelo de precio → puente al repricer */}
        <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-bg-elevated p-6 sm:p-7">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-300">
                Tu suelo de precio
              </p>
              <p className="text-sm text-fg-muted mt-0.5 max-w-xs">
                Precio mínimo para mantener un margen del{" "}
                <span className="font-bold text-fg">{formatPct(parseNum(margenObjetivo))}</span>.
              </p>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-fg tracking-tight">
              {formatEUR(r.suelo)}
            </p>
          </div>

          <div className="mt-5">
            <label htmlFor="margen-objetivo" className="block text-[13px] font-bold text-fg mb-1.5">
              Margen objetivo
            </label>
            <div className="relative max-w-[160px]">
              <input
                id="margen-objetivo"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={margenObjetivo}
                onChange={(e) => setMargenObjetivo(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg-subtle pl-4 pr-10 py-2.5 text-sm font-semibold text-fg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-subtle pointer-events-none">
                %
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-bg-subtle/60 border border-border p-4">
            <p className="text-sm text-fg-muted leading-relaxed">
              Este es el número que metes como <strong className="text-fg">suelo</strong> en un repricer:
              automatiza tus precios para ganar la Buy Box <strong className="text-fg">sin bajar nunca</strong> de
              aquí.
            </p>
            <Link
              href="/repricer"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-sm font-bold transition-colors"
            >
              Que el repricer defienda mi suelo
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="mt-3 text-xs text-fg-subtle">14 días gratis · luego 19 €/mes · cancela cuando quieras.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold text-fg">{label}</p>
        {hint && <p className="text-xs text-fg-subtle mt-0.5">{hint}</p>}
      </div>
      <p className="text-sm font-bold text-fg whitespace-nowrap">{value}</p>
    </div>
  );
}
