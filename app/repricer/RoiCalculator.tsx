"use client";

import { useState } from "react";

function eur(n: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

const PLAN_PRICE = 19;

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-fg-muted mb-1.5">{label}</span>
      <div className="flex items-center rounded-xl border border-border bg-bg-subtle focus-within:border-[#4F46E5] transition-colors">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm text-fg outline-none"
        />
        {suffix && (
          <span className="px-3 text-sm text-fg-muted whitespace-nowrap">{suffix}</span>
        )}
      </div>
    </label>
  );
}

export default function RoiCalculator() {
  const [sales, setSales] = useState("5000");
  const [margin, setMargin] = useState("20");
  const [hours, setHours] = useState("3");
  const [uplift, setUplift] = useState("2");
  const [hourValue, setHourValue] = useState("15");

  const n = (s: string) => {
    const v = Number(s.replace(",", "."));
    return Number.isFinite(v) && v >= 0 ? v : 0;
  };

  const salesN = n(sales);
  const marginN = n(margin);
  const upliftN = n(uplift);

  // Beneficio extra estimado: ventas adicionales (recuperar Buy Box / optimizar
  // precio) por el % de mejora, multiplicado por tu margen neto.
  const extraRevenue = salesN * (upliftN / 100);
  const extraMargin = extraRevenue * (marginN / 100);

  // Tiempo ahorrado al no repreciar a mano (semanas/mes ≈ 4,33).
  const hoursSaved = n(hours) * 4.33;
  const timeValue = hoursSaved * n(hourValue);

  const totalBenefit = extraMargin + timeValue;
  const net = totalBenefit - PLAN_PRICE;
  const roiX = totalBenefit / PLAN_PRICE;

  return (
    <div className="mt-8 bg-bg-elevated rounded-2xl border border-border p-6 sm:p-8">
      <h3 className="text-lg font-extrabold text-fg mb-1">¿Te compensa? Calcúlalo</h3>
      <p className="text-sm text-fg-muted mb-6">
        Estimación con tus números. Ajusta los supuestos a tu caso.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <NumberField
          label="Ventas al mes en Amazon"
          value={sales}
          onChange={setSales}
          suffix="€"
        />
        <NumberField
          label="Tu margen neto medio"
          value={margin}
          onChange={setMargin}
          suffix="%"
        />
        <NumberField
          label="Horas/semana repreciando a mano"
          value={hours}
          onChange={setHours}
          suffix="h"
        />
        <NumberField
          label="Valor de tu hora"
          value={hourValue}
          onChange={setHourValue}
          suffix="€/h"
        />
        <div className="sm:col-span-2">
          <NumberField
            label="Mejora estimada de ventas con repricing (conservador: 1–3%)"
            value={uplift}
            onChange={setUplift}
            suffix="%"
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[#E0E7FF] bg-[#EEF2FF] p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#4F46E5] font-bold">
              Beneficio extra estimado
            </p>
            <p className="text-2xl font-black text-fg mt-0.5">{eur(totalBenefit)}/mes</p>
            <p className="text-xs text-fg-muted mt-1">
              {eur(extraMargin)} de margen + {eur(timeValue)} en tiempo ahorrado
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-fg-muted font-bold">
              Retorno sobre 19 €
            </p>
            <p className="text-2xl font-black text-[#4F46E5] mt-0.5">
              {roiX >= 1 ? `${roiX.toFixed(1)}×` : "—"}
            </p>
            {net > 0 && (
              <p className="text-xs text-emerald-600 mt-1 font-semibold">
                +{eur(net)} neto/mes
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-fg-muted leading-relaxed">
        Estimación orientativa, no una garantía de resultados: depende de tu
        catálogo, competencia y configuración. El supuesto de mejora lo eliges
        tú — lo dejamos en un valor conservador a propósito.
      </p>
    </div>
  );
}
