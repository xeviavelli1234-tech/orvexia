import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Thin accent stripe at the top of the card */
  accent?: "blue" | "orange" | "green";
};

const accentColors: Record<string, string> = {
  blue:   "#5EEAD4",  // cyan
  orange: "#FB923C",
  green:  "#A3E635",
};

export function AuthShell({ children, accent = "blue" }: Props) {
  const accentColor = accentColors[accent];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-14 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid-cyber opacity-60"
           style={{
             maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
             WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
           }} />
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] rounded-full halo-breathe"
           style={{ background: `radial-gradient(ellipse at center, ${accentColor}33, transparent 60%)` }} />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-[600px] h-[600px] rounded-full opacity-60"
           style={{ background: "radial-gradient(circle, rgba(129,140,248,0.18), transparent 60%)" }} />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-60"
           style={{ background: "radial-gradient(circle, rgba(240,171,252,0.16), transparent 60%)" }} />

      {/* Card */}
      <div className="relative w-full max-w-[520px]">
        <div className="rounded-3xl bg-bg-elevated/95 backdrop-blur-md shadow-2xl shadow-black/60 overflow-hidden border border-white/[0.08] relative">
          {/* Accent stripe */}
          <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
          {/* HUD corners */}
          <span aria-hidden className="absolute top-2 left-2 w-3 h-3 border-t border-l border-white/30" />
          <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-t border-r border-white/30" />
          <span aria-hidden className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-white/30" />
          <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-white/30" />
          <div className="px-8 py-10 sm:px-12 sm:py-12">
            {children}
          </div>
        </div>

        <p className="font-mono-ui text-center text-[10px] uppercase tracking-wider text-white/35 mt-5">
          orvexia · price intelligence
        </p>
      </div>
    </div>
  );
}
