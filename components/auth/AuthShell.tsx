import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Thin accent stripe at the top of the card */
  accent?: "blue" | "orange" | "green";
};

const accentColors: Record<string, string> = {
  blue:   "var(--brand-600)",
  orange: "var(--hot-500)",
  green:  "var(--accent-500)",
};

export function AuthShell({ children, accent = "blue" }: Props) {
  const accentColor = accentColors[accent];

  return (
    <div
      className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-14 overflow-hidden"
      style={{ backgroundColor: "#05060B" }}
    >
      {/* Mesh gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 1200px 800px at 50% 0%, rgba(99,102,241,0.30) 0%, transparent 60%), radial-gradient(circle at 100% 50%, rgba(96,165,250,0.18) 0%, transparent 60%), radial-gradient(circle at 0% 100%, rgba(16,185,129,0.14) 0%, transparent 60%)",
        }}
      />

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-[520px]">
        <div className="rounded-3xl bg-bg-elevated shadow-2xl shadow-black/40 overflow-hidden border border-white/5">
          {/* Accent stripe */}
          <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />
          <div className="px-8 py-10 sm:px-12 sm:py-12">
            {children}
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-white/35 mt-5">
          Orvexia · Tu comparador de electrodomésticos
        </p>
      </div>
    </div>
  );
}
