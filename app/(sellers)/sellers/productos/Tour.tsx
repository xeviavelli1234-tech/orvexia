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
    body: "Tu repricer de Amazon. Te guío zona por zona (≈1 min). Usa ← → o los botones; puedes Saltar cuando quieras.",
  },
  {
    anchor: "tour-resumen",
    title: "1 · Resumen",
    body: "De un vistazo: nº de productos, cuántos tienen precio, cuántos están repreciando y el valor total del catálogo. Se actualiza tras cada sincronización y ciclo.",
  },
  {
    anchor: "tour-sync",
    title: "2 · Sincronizar con Amazon",
    body: "Trae (o actualiza) todos tus listings de Seller Central: SKU, ASIN, título, imagen y precio actual. Hazlo la primera vez y cuando cambie tu catálogo.",
  },
  {
    anchor: "tour-run",
    title: "3 · Ejecutar reprecio ahora",
    body: "Fuerza un ciclo al instante (ignora el intervalo del plan y el horario). Úsalo para ver el efecto de tu configuración sin esperar. El automático corre cada 5/15 min.",
  },
  {
    anchor: "tour-graph",
    title: "4 · El grafo de productos",
    body: "Cada producto es un nodo y su color = su estado (verde Buy Box ganada, rojo perdida, ámbar en mínimo…). Clic en el icono Amazon central → herramientas. Clic en un producto → su panel de configuración (precio mín/máx, estrategia, competencia, etiquetas).",
  },
  {
    anchor: "tour-toolbar",
    title: "5 · Buscar, filtrar y vista",
    body: "Busca por título/SKU/ASIN, filtra por estado o etiqueta (los que no coinciden se atenúan) y cambia entre vista Grafo y vista Tabla — ideal con muchos SKUs.",
  },
  {
    anchor: "tour-zoom",
    title: "6 · Zoom y leyenda de color",
    body: "Acercar/alejar/restablecer la vista. El botón 🎨 abre la leyenda exacta de qué significa cada color de nodo.",
  },
  {
    anchor: "tour-activity",
    title: "7 · Plan y actividad",
    body: "Tu plan (prueba/Pro), días restantes y un mini-resumen: eventos, cambios, errores, % Buy Box y último cambio. Aquí están los accesos a Facturación y Factura (IVA).",
  },
  {
    anchor: "tour-tools",
    title: "8 · Herramientas",
    body: "Catálogo (lista, acciones masivas, import/export CSV) · Rentabilidad (margen real por SKU) · Cómo funciona (esta guía) · Ajustes de cuenta (marketplace, horario, alertas, RGPD) · Pausar todo · Desconectar Amazon.",
  },
  {
    anchor: "tour-legend",
    title: "9 · Leyenda",
    body: "Recordatorio permanente del significado de cada color de los productos, siempre visible en la barra.",
  },
  {
    title: "10 · Receta para ganar la Buy Box",
    body: "Abre un producto → pon el precio mínimo POR DEBAJO del competidor → estrategia «Ganar Buy Box» (bajar 0,01 €) → activa el reprecio → «Ejecutar reprecio ahora». El nodo se pondrá verde. Repite este tutorial cuando quieras desde «Cómo funciona».",
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
