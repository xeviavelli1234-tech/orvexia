"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "orvexia_tour_v1";

interface Step {
  anchor?: string; // id del elemento a resaltar
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: "Bienvenido al Centro de control",
    body: "Tu repricer de Amazon. Te enseño lo esencial en 5 pasos (30 s).",
  },
  {
    anchor: "tour-actions",
    title: "1 · Sincroniza y ejecuta",
    body: "«Sincronizar con Amazon» trae tus productos. Tras configurar, «Ejecutar reprecio ahora» aplica el ciclo al instante (sin esperar al automático).",
  },
  {
    anchor: "tour-graph",
    title: "2 · El grafo",
    body: "Cada producto es un nodo (su color = su estado). Clic en el icono Amazon central → herramientas. Clic en un producto → configúralo: precio mín/máx y estrategia.",
  },
  {
    anchor: "tour-activity",
    title: "3 · Plan, analíticas y más",
    body: "Aquí tienes plan y actividad, Analíticas, Catálogo, Rentabilidad, Facturación/Factura, Ajustes y la guía «Cómo funciona».",
  },
  {
    title: "4 · Listo",
    body: "Define mín/máx por debajo del competidor, activa el reprecio y ejecuta un ciclo. Puedes repetir este tutorial desde «Cómo funciona».",
  },
];

export default function Tour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  const clearSpot = useCallback(() => {
    document
      .querySelectorAll(".tour-spot")
      .forEach((el) => el.classList.remove("tour-spot"));
  }, []);

  const applySpot = useCallback(
    (idx: number) => {
      clearSpot();
      const id = STEPS[idx]?.anchor;
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("tour-spot");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [clearSpot],
  );

  const finish = useCallback(() => {
    clearSpot();
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [clearSpot]);

  useEffect(() => {
    function onOpen() {
      setI(0);
      setOpen(true);
    }
    let auto: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        auto = setTimeout(() => {
          setI(0);
          setOpen(true);
        }, 900);
      }
    } catch {
      /* ignore */
    }
    window.addEventListener("orvexia:open-tour", onOpen);
    return () => {
      window.removeEventListener("orvexia:open-tour", onOpen);
      if (auto) clearTimeout(auto);
    };
  }, []);

  useEffect(() => {
    if (open) applySpot(i);
    else clearSpot();
  }, [open, i, applySpot, clearSpot]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight")
        setI((n) => Math.min(STEPS.length - 1, n + 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-[min(92vw,420px)] fade-in">
      <div className="rounded-2xl border border-cyan-400/25 bg-[rgba(8,9,20,0.97)] p-5 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9)]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-extrabold text-white">{step.title}</h3>
          <button
            type="button"
            onClick={finish}
            className="text-[11px] text-white/45 hover:text-white"
          >
            Saltar
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-white/70">
          {step.body}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, k) => (
              <span
                key={k}
                className={`h-1.5 w-1.5 rounded-full ${
                  k === i ? "bg-cyan-300" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI((n) => Math.max(0, n - 1))}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/65 hover:bg-white/10"
              >
                Anterior
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                last ? finish() : setI((n) => Math.min(STEPS.length - 1, n + 1))
              }
              className="rounded-lg bg-[var(--brand-600)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-700)]"
            >
              {last ? "Empezar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
