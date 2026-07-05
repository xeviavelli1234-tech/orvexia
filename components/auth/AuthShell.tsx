import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Thin accent stripe at the top of the card */
  accent?: "blue" | "orange" | "green";
};

// Mapeo al lenguaje v4: acento violeta por defecto; esmeralda solo para el
// caso «green» (éxito) y ámbar para «orange». Sin cyan/fuchsia decorativos.
const accentColors: Record<string, string> = {
  blue:   "#818CF8",  // violeta (brand-400)
  orange: "#F59E0B",
  green:  "#34D399",
};

export function AuthShell({ children, accent = "blue" }: Props) {
  const accentColor = accentColors[accent];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-14 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid-cyber-fine opacity-40"
           style={{
             maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
             WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
           }} />
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] rounded-full halo-breathe"
           style={{ background: `radial-gradient(ellipse at center, ${accentColor}2E, transparent 60%)` }} />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-[600px] h-[600px] rounded-full opacity-60"
           style={{ background: "radial-gradient(circle, rgba(129,140,248,0.16), transparent 60%)" }} />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-60"
           style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent 60%)" }} />

      {/* Card */}
      <div className="relative w-full max-w-[520px]">
        <div className="rounded-3xl bg-bg-elevated/95 backdrop-blur-md shadow-2xl shadow-black/60 overflow-hidden border border-white/[0.07] relative">
          {/* Accent stripe */}
          <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
          <div className="px-8 py-10 sm:px-12 sm:py-12">
            {children}
          </div>
        </div>

        <p className="text-center text-[11px] text-white/35 mt-5">
          Orvexia · Comparador de precios
        </p>
      </div>
    </div>
  );
}
