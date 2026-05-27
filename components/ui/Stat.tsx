/**
 * Tarjetas de métrica usadas en sidebars y resúmenes.
 *
 *  - <Eyebrow>: etiqueta superior pequeña tracking-ancha (header de sección).
 *  - <Stat>:    métrica principal (sidebar Resumen).
 *  - <MiniStat>:métrica densa para grids de 3+ columnas (ActivityPanel).
 *
 * Todas con line-clamp en lugar de truncate: si el label es largo, parte en
 * 2 líneas en vez de cortar palabras a medias.
 */

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
      {children}
    </div>
  );
}

export interface StatProps {
  label: string;
  value: string;
  /** Tinte: emerald para "activo / OK", default cyan. */
  accent?: boolean;
}

export function Stat({ label, value, accent }: StatProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.06em] text-white/45 leading-snug line-clamp-2 min-h-[1.1em]">
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono text-lg font-extrabold tabular-nums ${
          accent
            ? "text-emerald-300 [text-shadow:0_0_16px_rgba(16,185,129,0.5)]"
            : "text-cyan-300 text-glow-cyan"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export interface MiniStatProps {
  label: string;
  value: string;
  sub?: string;
  tone?: "cyan" | "emerald" | "red";
}

export function MiniStat({ label, value, sub, tone }: MiniStatProps) {
  const c =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "red"
        ? "text-red-300"
        : tone === "cyan"
          ? "text-cyan-300"
          : "text-white/85";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 min-w-0">
      <div className="text-[9px] uppercase tracking-[0.04em] text-white/45 leading-snug line-clamp-2 min-h-[1.1em]">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-sm font-bold tabular-nums ${c}`}>
        {value}
        {sub && <span className="ml-1 text-[9px] text-white/35">{sub}</span>}
      </div>
    </div>
  );
}
