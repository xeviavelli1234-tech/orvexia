import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Thin accent stripe at the top of the card */
  accent?: "blue" | "orange" | "green";
};

const accentColors: Record<string, string> = {
  blue:   "#2563EB",
  orange: "#F97316",
  green:  "#10B981",
};

export function AuthShell({ children, accent = "blue" }: Props) {
  const accentColor = accentColors[accent];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-14 overflow-hidden bg-[#0F172A]">
      {/* Gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #1D4ED8 100%)",
        }}
      />

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#3B82F6] opacity-[0.12] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-[#10B981] opacity-[0.08] blur-3xl" />

      {/* Card */}
      <div className="relative w-full max-w-[520px]">
        <div className="rounded-2xl bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.5)] overflow-hidden">
          {/* Accent stripe */}
          <div
            className="h-1 w-full"
            style={{ backgroundColor: accentColor }}
          />
          <div className="px-10 py-10 md:px-12 md:py-12">
            {children}
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-white/30 mt-5">
          Orvexia · Tu comparador de electrodomésticos
        </p>
      </div>
    </div>
  );
}
