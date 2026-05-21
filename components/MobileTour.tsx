"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const STORAGE_KEY = "orvexia_intro_tour_v1";
const EVENT_OPEN = "orvexia:open-intro-tour";

interface Step {
  icon: string;
  // Tailwind gradient classes for the icon background tile.
  accent: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
}

const STEPS: Step[] = [
  {
    icon: "👋",
    accent: "from-indigo-500/30 to-fuchsia-500/30 border-indigo-400/30",
    title: "Bienvenido a Orvexia",
    body: "Compara precios de electrodomésticos en Amazon, PcComponentes, Fnac, El Corte Inglés y más tiendas. Ahorra sin recorrer mil pestañas.",
  },
  {
    icon: "🔎",
    accent: "from-cyan-500/30 to-teal-500/30 border-cyan-400/30",
    title: "Busca o explora",
    body: "Usa la lupa del menú para buscar por nombre, marca o modelo. O abre el menú y entra por categoría (Televisores, Lavadoras, Frigoríficos…).",
  },
  {
    icon: "🏷️",
    accent: "from-emerald-500/30 to-lime-500/30 border-emerald-400/30",
    title: "Mejor precio, siempre visible",
    body: "Cada tarjeta muestra el precio más barato de hoy. Toca un producto para ver el detalle completo, las fotos y comparar con el PVPR.",
  },
  {
    icon: "🎚️",
    accent: "from-amber-500/30 to-orange-500/30 border-amber-400/30",
    title: "Filtra con un gesto",
    body: "Dentro de una categoría, pulsa «Filtros» para refinar por marca, tienda, rango de precio, tecnología (OLED/QLED) o sólo descuentos. El botón inferior te dice cuántos productos encajan.",
    cta: { label: "Ver televisores", href: "/categorias/televisores" },
  },
  {
    icon: "🔔",
    accent: "from-rose-500/30 to-pink-500/30 border-rose-400/30",
    title: "Guarda y recibe avisos",
    body: "Toca el ❤️ de una tarjeta para guardarla en tu lista. En el detalle puedes activar una alerta y avisamos cuando el precio baje.",
    cta: { label: "Ofertas destacadas", href: "/ofertas-destacadas" },
  },
  {
    icon: "✅",
    accent: "from-violet-500/30 to-indigo-500/30 border-violet-400/30",
    title: "¡Listo!",
    body: "Puedes volver a ver este tutorial cuando quieras desde el menú. Ahora dale al botón y a ahorrar.",
  },
];

export default function MobileTour() {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // The Repricer (/sellers/*) has its own dedicated tour — skip the
  // consumer onboarding there. Auth screens also get a pass.
  const skipRoute = pathname.startsWith("/sellers")
    || pathname.startsWith("/login")
    || pathname.startsWith("/register")
    || pathname.startsWith("/forgot-password");

  // Open via window event (from anywhere in the app).
  useEffect(() => {
    function handler() {
      setI(0);
      setOpen(true);
    }
    window.addEventListener(EVENT_OPEN, handler);
    return () => window.removeEventListener(EVENT_OPEN, handler);
  }, []);

  // Auto-open on first visit on consumer routes (small delay so the page settles).
  useEffect(() => {
    if (skipRoute) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        t = setTimeout(() => {
          setI(0);
          setOpen(true);
        }, 1200);
      }
    } catch {
      /* localStorage no disponible */
    }
    return () => { if (t) clearTimeout(t); };
  }, [skipRoute]);

  const finish = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {/* ignore */}
  }, []);

  const next = useCallback(() => {
    setI((n) => Math.min(STEPS.length - 1, n + 1));
  }, []);

  const prev = useCallback(() => {
    setI((n) => Math.max(0, n - 1));
  }, []);

  // Body scroll lock + Esc + arrow keys.
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

  // Swipe navigation.
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
    // Only horizontal swipes (ignore vertical scroll attempts).
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) next();
    else prev();
  }

  if (!open) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const first = i === 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial de Orvexia"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative w-full sm:max-w-md min-h-[88vh] sm:min-h-0 bg-bg-elevated rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/[0.10] shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.7)] flex flex-col animate-slide-up sm:animate-fade-in"
      >
        {/* Skip button (always visible top-right) */}
        <button
          type="button"
          onClick={finish}
          className="absolute top-3 right-3 z-10 text-xs font-semibold text-white/55 hover:text-white px-3 h-9 rounded-full hover:bg-white/[0.06] transition-colors"
        >
          Saltar
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-1">
          {STEPS.map((_, k) => (
            <span
              key={k}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                k === i ? "w-6 bg-cyan-300" : k < i ? "w-1.5 bg-cyan-300/40" : "w-1.5 bg-white/15"
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg leading-tight tracking-tight mb-3">
            {step.title}
          </h2>
          <p className="text-[15px] leading-relaxed text-fg-muted max-w-sm">
            {step.body}
          </p>
          {step.cta && (
            <Link
              href={step.cta.href}
              onClick={finish}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-200 border border-cyan-400/30 bg-cyan-400/[0.06] hover:bg-cyan-400/[0.12] hover:border-cyan-400/60 px-4 h-10 rounded-full transition-all"
            >
              {step.cta.label}
              <span aria-hidden>→</span>
            </Link>
          )}
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
                : "text-fg-muted hover:text-fg hover:bg-bg-subtle"
            }`}
          >
            ← Atrás
          </button>
          <button
            type="button"
            onClick={last ? finish : next}
            className="flex-1 h-12 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-[0_0_24px_-6px_rgba(99,102,241,0.6)]"
          >
            {last ? "¡Empezar!" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );
}
