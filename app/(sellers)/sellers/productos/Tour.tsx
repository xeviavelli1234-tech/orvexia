"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "orvexia_tour_v2";
const EVENT_OPEN = "orvexia:open-tour";

interface Step {
  /** Optional id del elemento a resaltar en desktop (sm+). */
  anchor?: string;
  icon: string;
  /** Tailwind gradient classes for the icon tile background. */
  accent: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: "🎯",
    accent: "from-indigo-500/30 to-fuchsia-500/30 border-indigo-400/30",
    title: "Bienvenido al Centro de control",
    body: "Tu repricer de Amazon. Te enseño todo en 30 segundos. Puedes saltarlo cuando quieras y volver desde «Cómo funciona».",
  },
  {
    anchor: "tour-resumen",
    icon: "📊",
    accent: "from-cyan-500/30 to-teal-500/30 border-cyan-400/30",
    title: "Tu resumen",
    body: "De un vistazo: productos en tu catálogo, cuántos tienen precio en Amazon, cuántos están repreciando y el valor total. Se actualiza tras cada sincronización.",
  },
  {
    anchor: "tour-sync",
    icon: "🔄",
    accent: "from-emerald-500/30 to-lime-500/30 border-emerald-400/30",
    title: "Sincroniza con Amazon",
    body: "El primer paso. Trae tus listings de Seller Central: SKU, ASIN, título, imagen y precio. Repite cuando cambie tu catálogo.",
  },
  {
    anchor: "tour-run",
    icon: "▶️",
    accent: "from-amber-500/30 to-orange-500/30 border-amber-400/30",
    title: "Ejecuta un reprecio ya",
    body: "Fuerza un ciclo al instante (sin esperar al horario). Útil para ver el efecto de tu configuración. El automático corre cada 5–15 min según tu plan.",
  },
  {
    anchor: "tour-graph",
    icon: "📋",
    accent: "from-sky-500/30 to-cyan-500/30 border-sky-400/30",
    title: "Tus productos",
    body: "Cada fila es un producto con un color que indica su estado: verde = Buy Box ganada · rojo = perdida · ámbar = en mínimo · azul = pausado · gris = sin oferta.",
  },
  {
    icon: "⚙️",
    accent: "from-violet-500/30 to-indigo-500/30 border-violet-400/30",
    title: "Configura tocando una fila",
    body: "Abre el panel: define Precio mín/máx, elige estrategia (Ganar Buy Box · Igualar · Por margen · Precio fijo) y activa el reprecio automático.",
  },
  {
    anchor: "tour-tools",
    icon: "🛠️",
    accent: "from-rose-500/30 to-pink-500/30 border-rose-400/30",
    title: "Herramientas avanzadas",
    body: "Catálogo (acciones masivas + CSV) · Rentabilidad (margen real por SKU) · Cómo funciona · Ajustes de cuenta · Pausar todo · Auditoría.",
  },
  {
    anchor: "tour-activity",
    icon: "📈",
    accent: "from-purple-500/30 to-violet-500/30 border-purple-400/30",
    title: "Plan y actividad",
    body: "Tu plan (prueba/Pro) con días restantes. Mini-resumen: eventos, cambios, errores, % Buy Box. Acceso a Facturación y Factura.",
  },
  {
    icon: "🏆",
    accent: "from-emerald-500/30 to-green-500/30 border-emerald-400/30",
    title: "Receta para ganar la Buy Box",
    body: "Toca un producto → mínimo POR DEBAJO del competidor → estrategia «Ganar Buy Box» (bajar 0,01 €) → activa → «Ejecutar reprecio ahora». Verás el estado pasar a verde.",
  },
  {
    icon: "🚀",
    accent: "from-cyan-500/30 to-blue-500/30 border-cyan-400/30",
    title: "¡A vender!",
    body: "Recuerda: si te pierdes, vuelve a este tutorial desde «Cómo funciona». Pulsa el botón y empieza a recuperar la Buy Box.",
  },
];

export default function Tour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Highlight an anchor element (desktop only — el drawer móvil oculta
  // muchos anclajes y el resalte no aportaría nada).
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
      // Skip the spotlight on phones: el sidebar es un drawer y la mayoría
      // de los IDs no están en pantalla. La descripción del paso ya basta.
      if (typeof window !== "undefined" && window.innerWidth < 640) return;
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

  const next = useCallback(() => {
    setI((n) => Math.min(STEPS.length - 1, n + 1));
  }, []);
  const prev = useCallback(() => {
    setI((n) => Math.max(0, n - 1));
  }, []);

  // Auto-open la primera vez + escucha del evento para reabrir.
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
    window.addEventListener(EVENT_OPEN, onOpen);
    return () => {
      window.removeEventListener(EVENT_OPEN, onOpen);
      if (auto) clearTimeout(auto);
    };
  }, []);

  useEffect(() => {
    if (open) applySpot(i);
    else clearSpot();
  }, [open, i, applySpot, clearSpot]);

  // Body scroll lock + Esc + arrow keys while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, finish, next, prev]);

  // Swipe horizontal para navegar entre pasos en móvil.
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) next();
    else prev();
  }

  if (!open) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const first = i === 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial del Centro de control"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative w-full sm:max-w-md min-h-[88vh] sm:min-h-0 bg-[rgba(8,9,20,0.98)] rounded-t-3xl sm:rounded-3xl border-t sm:border border-cyan-400/15 shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.8)] flex flex-col animate-slide-up sm:animate-fade-in"
      >
        {/* Skip */}
        <button
          type="button"
          onClick={finish}
          className="absolute top-3 right-3 z-10 text-xs font-semibold text-white/55 hover:text-white px-3 h-9 rounded-full hover:bg-white/[0.06] transition-colors"
        >
          Saltar
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-1 px-12">
          {STEPS.map((_, k) => (
            <span
              key={k}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                k === i
                  ? "w-6 bg-cyan-300"
                  : k < i
                    ? "w-1.5 bg-cyan-300/40"
                    : "w-1.5 bg-white/15"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-8 py-6 sm:py-8">
          <div
            className={`relative inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br ${step.accent} border mb-6 text-5xl sm:text-6xl`}
          >
            {step.icon}
          </div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-cyan-300/70 mb-2">
            ▸ paso {i + 1} de {STEPS.length}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight mb-3">
            {step.title}
          </h2>
          <p className="text-[15px] leading-relaxed text-white/70 max-w-sm">
            {step.body}
          </p>
        </div>

        {/* Footer actions */}
        <div
          className="px-5 pt-3 pb-4 border-t border-white/[0.06] flex items-center gap-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 1rem)" }}
        >
          <button
            type="button"
            onClick={prev}
            disabled={first}
            aria-label="Paso anterior"
            className={`h-12 px-5 rounded-xl text-sm font-semibold transition-colors ${
              first
                ? "opacity-0 pointer-events-none"
                : "text-white/65 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            ← Atrás
          </button>
          <button
            type="button"
            onClick={last ? finish : next}
            className="flex-1 h-12 rounded-xl bg-[var(--brand-600)] hover:bg-[var(--brand-700)] active:scale-[0.98] text-white font-bold text-sm transition-all shadow-[0_0_24px_-6px_rgba(99,102,241,0.6)]"
          >
            {last ? "¡Empezar!" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );
}
