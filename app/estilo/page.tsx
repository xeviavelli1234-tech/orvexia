import type { Metadata } from "next";
import { SectionHead, SectionChip, AudienceLabel } from "@/app/_components/SectionPrimitives";

export const metadata: Metadata = {
  title: "Sistema de diseño",
  robots: { index: false, follow: false },
};

// Página de referencia interna del lenguaje visual v4 «violeta».
// Documenta los tokens y componentes canónicos descritos en docs/estilo-v4.md.

const RAMPS: { name: string; note?: string; tones: { label: string; hex: string }[] }[] = [
  {
    name: "Brand · violeta (único acento)",
    note: "Todo lo decorativo usa esta rampa. Sin cyan, lime ni fuchsia.",
    tones: [
      { label: "200", hex: "#C7D2FE" },
      { label: "300", hex: "#A5B4FC" },
      { label: "400", hex: "#818CF8" },
      { label: "500", hex: "#6366F1" },
      { label: "600", hex: "#4F46E5" },
    ],
  },
  {
    name: "Esmeralda · solo éxito / «Disponible» / ahorro",
    note: "Nunca como acento decorativo.",
    tones: [
      { label: "300", hex: "#6EE7B7" },
      { label: "400", hex: "#34D399" },
      { label: "500", hex: "#10B981" },
      { label: "600", hex: "#059669" },
    ],
  },
  {
    name: "Hot / ámbar · solo descuentos en tarjetas de producto",
    tones: [
      { label: "400", hex: "#FBBF24" },
      { label: "500", hex: "#F97316" },
      { label: "600", hex: "#EA580C" },
    ],
  },
  {
    name: "Fondos y superficies",
    note: "Fondo #050310; superficies white/2–4% con borde white/7%.",
    tones: [
      { label: "página", hex: "#050310" },
      { label: "panel", hex: "#100d26" },
      { label: "panel-2", hex: "#0a0819" },
      { label: "card", hex: "#0e0c20" },
    ],
  },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <AudienceLabel label={title} />
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="min-h-screen bg-[#050310] px-4 py-14 text-white/90 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-16">
        {/* Intro */}
        <header
          className="reveal relative isolate overflow-hidden rounded-3xl border border-brand-400/15 p-8 sm:p-12"
          style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[560px] -translate-x-1/2 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.2), transparent 70%)" }}
          />
          <div aria-hidden className="noise-overlay" />
          <div className="relative">
            <span className="inline-flex h-7 items-center rounded-full border border-brand-400/30 bg-brand-400/[0.09] px-3.5 text-[11px] font-semibold tracking-wide text-brand-200">
              Orvexia · Design System v4
            </span>
            <h1
              className="mt-5 font-extrabold tracking-tight text-white"
              style={{ fontSize: "clamp(2rem, 4.6vw, 3rem)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" }}
            >
              Un solo acento: <span className="text-shimmer-violet">violeta</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>
              Referencia interna del lenguaje visual v4. La fuente de verdad es{" "}
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[13px] text-brand-200">docs/estilo-v4.md</code>{" "}
              junto con la home (<code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[13px] text-brand-200">app/page.tsx</code>) y las
              primitivas de <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[13px] text-brand-200">SectionPrimitives.tsx</code>.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
                style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
              >
                Botón primario
              </button>
              <button className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]">
                Botón secundario
              </button>
            </div>
          </div>
        </header>

        {/* Paleta */}
        <Block title="01 · Color">
          <div className="grid gap-6 sm:grid-cols-2">
            {RAMPS.map((ramp) => (
              <div key={ramp.name}>
                <div className="mb-1 text-sm font-semibold text-white/80">{ramp.name}</div>
                {ramp.note && <p className="mb-2 text-xs text-white/40">{ramp.note}</p>}
                <div className="flex overflow-hidden rounded-xl border border-white/[0.08]">
                  {ramp.tones.map((t) => (
                    <div key={t.label} className="flex-1" title={t.hex}>
                      <div className="h-16" style={{ background: t.hex }} />
                      <div className="bg-white/[0.03] px-1.5 py-1 text-center">
                        <div className="text-[10px] tabular text-white/45">{t.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Block>

        {/* Cabeceras de sección */}
        <Block title="02 · Cabeceras de sección">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8">
            <SectionHead
              chip="SectionChip"
              title="SectionHead: título extrabold"
              subtitle="Chip con hairlines + título con letter-spacing -0.03em + subtítulo white/50. Siempre con clase «reveal»."
            />
            <div className="flex justify-center">
              <SectionChip label="Chip suelto" />
            </div>
          </div>
        </Block>

        {/* Tipografía */}
        <Block title="03 · Tipografía">
          <div className="space-y-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">AudienceLabel · etiqueta de bloque</p>
            <p className="text-5xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.04em" }}>Display 5xl</p>
            <p className="text-3xl font-bold tracking-tight text-white" style={{ letterSpacing: "-0.03em" }}>Título 3xl</p>
            <p className="text-xl font-semibold text-white/90">Subtítulo xl</p>
            <p className="max-w-2xl text-base leading-relaxed text-white/60">
              Cuerpo base — la prosa larga usa <span className="text-white/85">white/70–85</span> para lo importante y{" "}
              <span className="text-white/50">white/50–60</span> para lo secundario, con max-w cómodo y{" "}
              <code className="rounded bg-white/[0.06] px-1 text-[13px]">textWrap: pretty</code>.
            </p>
            <p className="text-sm text-white/40">Texto pequeño / metadatos · white/40</p>
            <p className="text-sm font-bold tabular text-white">precio · 1.299,00 € · <span className="font-normal text-white/40">números con .tabular</span></p>
          </div>
        </Block>

        {/* Botones */}
        <Block title="04 · Botones">
          <div className="space-y-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8">
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
                style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
              >
                Primario
              </button>
              <button className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]">
                Secundario
              </button>
              <button
                className="inline-flex h-12 cursor-not-allowed items-center justify-center rounded-full bg-brand-500/40 px-7 text-sm font-bold text-white/50"
                disabled
              >
                Desactivado
              </button>
            </div>
            <p className="text-xs text-white/40">
              Siempre <code className="rounded bg-white/[0.06] px-1">rounded-full</code>, altura h-12, primario con{" "}
              <code className="rounded bg-white/[0.06] px-1">shine-on-hover</code> y sombra violeta.
            </p>
          </div>
        </Block>

        {/* Chips y badges */}
        <Block title="05 · Chips y badges">
          <div className="flex flex-wrap gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8">
            <span className="inline-flex h-7 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-3 text-[11px] font-semibold text-brand-200">
              Chip violeta
            </span>
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 text-[11px] font-semibold text-emerald-300">
              <span className="h-1 w-1 rounded-full bg-emerald-400" /> Disponible (éxito)
            </span>
            <span className="inline-flex h-7 items-center rounded-full border border-white/[0.1] bg-white/[0.04] px-3 text-[11px] font-semibold text-white/60">
              Neutro
            </span>
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4">
              <span className="h-1 w-1 rounded-full bg-brand-300" />
              <span className="text-[13px] font-extrabold tabular text-white">12.480</span>
              <span className="text-[11px] text-white/45">stat de cristal</span>
            </span>
          </div>
        </Block>

        {/* Tarjetas y superficies */}
        <Block title="06 · Tarjetas y superficies">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="group shine-on-hover rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-[0_24px_60px_-24px_rgba(99,102,241,0.55)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Card base</p>
              <p className="mt-2 font-semibold text-white">rounded-2xl · white/7%</p>
              <p className="mt-1 text-sm text-white/50">Hover: -translate-y-1, borde brand-400/40 y sombra violeta.</p>
            </div>
            <div
              className="rounded-2xl border border-brand-400/15 p-6"
              style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Panel destacado</p>
              <p className="mt-2 font-semibold text-white">Gradiente #100d26 → #070614</p>
              <p className="mt-1 text-sm text-white/50">rounded-3xl en secciones grandes, con noise-overlay opcional.</p>
            </div>
            <div className="border-glow-violet rounded-2xl p-px">
              <div className="rounded-[15px] bg-[#0a0818]/95 p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">border-glow-violet</p>
                <p className="mt-2 font-semibold text-white">Wrapper de inputs</p>
                <p className="mt-1 text-sm text-white/50">p-px + interior rounded-[15px] para buscadores destacados.</p>
              </div>
            </div>
          </div>
        </Block>

        {/* FAQ / acordeón */}
        <Block title="07 · FAQ / acordeón">
          <details className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200 open:border-brand-400/30 open:bg-white/[0.035] hover:border-white/15">
            <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4.5 sm:px-6 [&::-webkit-details-marker]:hidden">
              <span className="flex-1 text-[15px] font-semibold leading-snug text-white/90">Patrón canónico de acordeón</span>
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-transform duration-200 group-open:rotate-45 group-open:border-brand-400/40 group-open:text-brand-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </summary>
            <div className="px-5 pb-5 sm:px-6">
              <p className="border-t border-white/[0.06] pt-4 text-sm leading-relaxed text-white/60">
                details + icono «+» que rota 45° al abrir, borde brand-400/30 en estado open.
              </p>
            </div>
          </details>
        </Block>

        {/* Detalles */}
        <Block title="08 · Movimiento y detalles">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">.reveal</p>
              <p className="mt-2 font-semibold text-white">Aparición al scroll</p>
              <p className="mt-1 text-sm text-white/50">CSS-only y progresivo; en cabeceras, paneles y cards.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">.divider-glow</p>
              <p className="mt-2 font-semibold text-white">Separador entre secciones</p>
              <div aria-hidden className="divider-glow mt-4" />
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">.text-shimmer-violet</p>
              <p className="text-shimmer-violet mt-3 text-3xl font-extrabold">Segunda línea de hero</p>
              <p className="mt-1 text-sm text-white/50">Solo en heros; nada de degradados multicolor.</p>
            </div>
            <div className="shine-on-hover rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">.shine-on-hover</p>
              <p className="mt-2 font-semibold text-white">Barrido de luz</p>
              <p className="mt-1 text-sm text-white/50">Pasa el ratón para ver el reflejo cruzar.</p>
            </div>
          </div>
        </Block>

        {/* Qué NO usar */}
        <Block title="09 · Prohibido (estilo viejo)">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <ul className="space-y-2">
              {[
                "Kickers mono «▸ /path», códigos SRV-01, build ids y barras «SYS · ONLINE».",
                "text-gradient-neon, text-glow-cyan y degradados cyan→lime→fuchsia.",
                "HudFrame / hud-corners, tickers, particles, data-stream, scanline, beam-sweep, flicker.",
                "font-mono-ui en labels decorativos (para cifras usar .tabular).",
                "bg-grid-cyber como protagonista (solo bg-grid-cyber-fine ≤40% con mask radial).",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/60">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Block>

        <footer className="border-t border-white/[0.06] pt-6 text-sm text-white/40">
          Sistema de diseño de Orvexia · página de referencia interna (no indexada). Desde aquí
          propagamos el lenguaje al resto de la web, una superficie a la vez.
        </footer>
      </div>
    </main>
  );
}
