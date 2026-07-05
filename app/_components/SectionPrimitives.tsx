import React from "react";

// ── Primitivas de sección del diseño v4 (violeta) ──────────────────────────
// Un solo acento (brand/violeta), chips con hairlines y títulos extrabold.
// Usadas por la home y por el resto de páginas públicas para que toda la web
// comparta el mismo lenguaje. Ver docs/estilo-v4.md.

export function SectionChip({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-brand-400/50" />
      <span
        className="inline-flex h-7 items-center rounded-full border border-brand-400/30 bg-brand-400/[0.09] px-3.5 text-[11px] font-semibold tracking-wide text-brand-200"
        style={{ boxShadow: "0 0 24px -6px rgba(129,140,248,0.55)" }}
      >
        {label}
      </span>
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-brand-400/50" />
    </div>
  );
}

export function SectionHead({
  chip,
  title,
  subtitle,
  id,
}: {
  chip: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="reveal mx-auto mb-12 max-w-2xl text-center">
      <SectionChip label={chip} />
      <h2
        id={id}
        className="mt-5 font-extrabold tracking-tight text-white"
        style={{ fontSize: "clamp(1.9rem, 4.4vw, 2.9rem)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-[15px] leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>{subtitle}</p>
      ) : null}
    </div>
  );
}

// Etiqueta de bloque: texto corto en mayúsculas + hairline hacia la derecha.
export function AudienceLabel({ label }: { label: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-brand-400/35 to-transparent" />
    </div>
  );
}
