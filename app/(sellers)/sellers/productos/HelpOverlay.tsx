"use client";

import { useEffect, useState } from "react";

export function HelpButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("orvexia:open-help"))}
      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors text-left"
    >
      <span className="flex items-center gap-2">
        <span className="grid h-4 w-4 place-items-center rounded-full border border-white/30 text-[10px] font-bold text-white/60">
          ?
        </span>
        Cómo funciona
      </span>
      <span className="text-[11px] text-white/40">guía rápida →</span>
    </button>
  );
}

const STEPS = [
  "Pulsa «Sincronizar con Amazon» para traer tus productos.",
  "Clic en un producto: se abre el panel de configuración.",
  "Define Precio MÍN y MÁX y pulsa «Guardar rango».",
  "Elige una Estrategia (p. ej. «Ganar Buy Box») y guárdala.",
  "Activa «Reprecio automático» en ese producto.",
  "Pulsa «Ejecutar reprecio ahora» para verlo al momento.",
];

const STRATS: Array<[string, string]> = [
  ["Ganar Buy Box", "Se pone 1 cént. (o %) por debajo del competidor más barato."],
  ["Igualar", "Mismo precio que el competidor, sin bajar de más."],
  ["Precio fijo", "Precio fijo, ignora la competencia."],
  ["Por margen", "Como Buy Box pero nunca por debajo de tu precio rentable."],
  ["Sin competencia", "Subir al máximo · Mantener · Subir gradualmente."],
];

const COLORS: Array<[string, string]> = [
  ["bg-emerald-400", "Buy Box ganada"],
  ["bg-red-400", "Buy Box perdida"],
  ["bg-amber-400", "En precio mínimo / techo"],
  ["bg-orange-500", "Error de reprecio"],
  ["bg-cyan-400", "Repreciando (sin datos aún)"],
  ["bg-blue-400", "Configurable / pausado"],
  ["bg-slate-500", "Sin oferta / ASIN"],
];

export default function HelpOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("orvexia:open-help", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("orvexia:open-help", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto max-w-xl min-h-full sm:min-h-0 rounded-none sm:rounded-2xl border-0 sm:border sm:border-cyan-400/20 bg-[rgba(7,8,18,0.99)] sm:shadow-[0_30px_80px_-20px_rgba(34,211,238,0.4)] fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10 bg-[rgba(7,8,18,0.99)] backdrop-blur-md sm:rounded-t-2xl">
          <h2 className="text-base font-extrabold tracking-tight">
            Cómo funciona el <span className="text-gradient-neon">repricer</span>
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="h-9 w-9 grid place-items-center rounded-full text-white/55 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          <section>
            <h3 className="text-sm font-bold text-white/80 mb-2">
              Empezar en 6 pasos
            </h3>
            <ol className="space-y-2">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/75">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-[11px] font-bold text-cyan-300">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white/80 mb-2">Estrategias</h3>
            <ul className="space-y-1.5">
              {STRATS.map(([k, v]) => (
                <li key={k} className="text-[13px] text-white/65">
                  <span className="font-semibold text-white/85">{k}:</span> {v}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white/80 mb-2">
              Colores de los productos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5">
              {COLORS.map(([c, t]) => (
                <div key={t} className="flex items-center gap-2 text-[12px] text-white/65">
                  <span className={`h-2.5 w-2.5 rounded-full ${c}`} />
                  {t}
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new CustomEvent("orvexia:open-tour"));
            }}
            className="w-full rounded-lg border border-cyan-400/30 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/10 transition-colors"
          >
            ▶ Repetir tutorial guiado
          </button>

          <p className="text-[11px] text-white/40 border-t border-white/10 pt-3">
            El color y el precio se actualizan tras cada ciclo de reprecio. El
            motor compara tu producto contra el resto de vendedores del mismo
            ASIN (el mercado) y te coloca según tu estrategia, siempre dentro
            de tu rango mín–máx.
          </p>
        </div>
      </div>
    </div>
  );
}
