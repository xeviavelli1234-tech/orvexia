export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { FuturisticFX } from "@/components/FuturisticFX";

export const metadata: Metadata = {
  title: "Guías de Compra de Electrodomésticos 2026 | Orvexia",
  description:
    "Guías de compra detalladas para elegir los mejores electrodomésticos. Analizamos lavadoras, televisores, frigoríficos y más con precios actualizados.",
};

const GUIAS = [
  {
    slug: "mejor-lavadora",
    title: "Mejor Lavadora 2026",
    desc: "Carga frontal, superior, motor Inverter... todo lo que necesitas saber antes de comprar.",
    icon: "🫧",
    color: "#7C3AED",
    colorLight: "#EDE9FE",
    tag: "Guía completa",
    time: "8 min lectura",
    ready: true,
    featured: false,
  },
  {
    slug: "mejor-televisor",
    title: "Mejor Televisor 2026",
    desc: "QLED vs OLED, tamaños, HDR, Hz... guía completa para acertar con tu próxima TV.",
    icon: "📺",
    color: "var(--brand-600)",
    colorLight: "var(--brand-100)",
    tag: "Guía completa",
    time: "10 min lectura",
    ready: true,
    featured: false,
  },
  {
    slug: "mejor-frigorifico",
    title: "Mejor Frigorífico 2026",
    desc: "Combi, americano, No Frost... cómo elegir la nevera perfecta para tu cocina.",
    icon: "🧊",
    color: "#0891B2",
    colorLight: "#CFFAFE",
    tag: "Guía completa",
    time: "7 min lectura",
    ready: true,
    featured: false,
  },
  {
    slug: "mejor-lavavajillas",
    title: "Mejor Lavavajillas 2026",
    desc: "Integrado o libre instalación, cubiertos, programas y eficiencia.",
    icon: "🍽️",
    color: "var(--accent-600)",
    colorLight: "var(--accent-100)",
    tag: "Guía completa",
    time: "6 min lectura",
    ready: true,
    featured: false,
  },
  {
    slug: "mejor-aspiradora",
    title: "Mejor Aspiradora 2026",
    desc: "Robot, escoba sin cable o trineo: qué modelo se adapta mejor a tu hogar.",
    icon: "🌀",
    color: "#0369A1",
    colorLight: "#E0F2FE",
    tag: "Guía completa",
    time: "7 min lectura",
    ready: true,
    featured: false,
  },
  {
    slug: "mejor-cafetera",
    title: "Mejor Cafetera 2026",
    desc: "Espresso, cápsulas o filtro: la guía para elegir tu cafetera perfecta.",
    icon: "☕",
    color: "#92400E",
    colorLight: "#FDE68A",
    tag: "Guía completa",
    time: "6 min lectura",
    ready: true,
    featured: false,
  },
  {
    slug: "mejor-secadora",
    title: "Mejor Secadora 2026",
    desc: "Bomba de calor, condensación o evacuación: cuál te conviene y por qué.",
    icon: "💨",
    color: "#D97706",
    colorLight: "#FEF3C7",
    tag: "Guía completa",
    time: "6 min lectura",
    ready: true,
    featured: false,
  },
  {
    slug: "mejor-horno",
    title: "Mejor Horno 2026",
    desc: "Integrable, multifunción, vapor... qué horno encaja mejor en tu cocina.",
    icon: "🔥",
    color: "var(--danger-600)",
    colorLight: "#FEE2E2",
    tag: "Guía completa",
    time: "6 min lectura",
    ready: true,
    featured: false,
  },
  {
    slug: "mejor-microondas",
    title: "Mejor Microondas 2026",
    desc: "Solo microondas, con grill o con convección: guía para acertar.",
    icon: "📡",
    color: "#9333EA",
    colorLight: "#F3E8FF",
    tag: "Guía completa",
    time: "5 min lectura",
    ready: true,
    featured: false,
  },
  {
    slug: "mejor-aire-acondicionado",
    title: "Mejor Aire Acondicionado 2026",
    desc: "Split, portátil o multisplit: potencia, eficiencia y instalación explicados.",
    icon: "❄️",
    color: "#0284C7",
    colorLight: "#BAE6FD",
    tag: "Guía completa",
    time: "7 min lectura",
    ready: true,
    featured: false,
  },
];

export default function GuiasPage() {
  return (
    <main className="min-h-screen">

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid-cyber opacity-50 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <FuturisticFX particleCount={6} streamCount={2} beam seed={19} />
        </div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] rounded-full halo-breathe pointer-events-none"
             style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.22), transparent 65%)" }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none opacity-60"
             style={{ background: "radial-gradient(circle, rgba(240,171,252,0.16), transparent 65%)" }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 h-7 rounded-full bg-white/[0.04] border border-white/[0.10] font-mono-ui">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[10px] uppercase tracking-wider text-white/65">
              ▸ /guides · updated 2026
            </span>
          </div>
          <h1 className="font-extrabold text-white mb-5 tracking-tight"
              style={{ fontSize: "clamp(2.6rem, 6vw, 5rem)", lineHeight: 0.98, letterSpacing: "-0.045em" }}>
            Guías de <span className="text-gradient-neon">Compra</span>
          </h1>
          <p className="text-white/55 text-lg max-w-xl mx-auto leading-relaxed">
            Análisis honestos, sin publicidad. Te ayudamos a elegir el electrodoméstico perfecto con precios en tiempo real.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <p className="font-mono-ui text-[10px] font-bold text-cyan-300 uppercase tracking-[0.2em] mb-5">▸ {GUIAS.length.toString().padStart(2, "0")} guías disponibles</p>

        {/* GRID: 2 col en tablet, 3 col en desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GUIAS.map((g, i) => (
            <Link
              key={g.slug}
              href={`/guias/${g.slug}`}
              className={`group flex flex-col bg-bg-elevated rounded-2xl border border-white/[0.08] overflow-hidden hover:border-white/25 hover:shadow-[0_0_28px_-6px_rgba(94,234,212,0.25)] hover:-translate-y-0.5 transition-all duration-200${i === GUIAS.length - 1 && GUIAS.length % 3 === 1 ? " lg:col-start-2" : ""}`}
            >
              {/* Header con color */}
              <div
                className="h-32 flex items-center justify-center relative overflow-hidden flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${g.color}33, ${g.color}11)`,
                  borderBottom: `1px solid ${g.color}40`,
                }}
              >
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-3 left-3 w-14 h-14 rounded-full border border-white/40" />
                  <div className="absolute bottom-3 right-3 w-20 h-20 rounded-full border border-white/20" />
                </div>
                <span className="text-6xl relative z-10" style={{ filter: `drop-shadow(0 0 18px ${g.color}AA)` }}>{g.icon}</span>
              </div>

              {/* Contenido */}
              <div className="flex flex-col flex-1 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono-ui text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                        style={{ color: g.color, background: `${g.color}1A`, border: `1px solid ${g.color}40` }}>
                    {g.tag}
                  </span>
                  <span className="font-mono-ui text-[10px] text-white/40 flex items-center gap-1 uppercase">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {g.time}
                  </span>
                </div>
                <h2 className="font-extrabold text-white text-base mb-1.5 leading-snug">{g.title}</h2>
                <p className="text-xs text-white/55 leading-relaxed flex-1">{g.desc}</p>
                <div className="mt-4 flex items-center gap-1.5 font-mono-ui text-[11px] uppercase tracking-wider font-bold transition-transform group-hover:translate-x-0.5" style={{ color: g.color }}>
                  leer guía
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
