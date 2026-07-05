export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { SectionChip, AudienceLabel } from "@/app/_components/SectionPrimitives";

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
    tag: "Guía completa",
    time: "8 min lectura",
  },
  {
    slug: "mejor-televisor",
    title: "Mejor Televisor 2026",
    desc: "QLED vs OLED, tamaños, HDR, Hz... guía completa para acertar con tu próxima TV.",
    icon: "📺",
    tag: "Guía completa",
    time: "10 min lectura",
  },
  {
    slug: "mejor-frigorifico",
    title: "Mejor Frigorífico 2026",
    desc: "Combi, americano, No Frost... cómo elegir la nevera perfecta para tu cocina.",
    icon: "🧊",
    tag: "Guía completa",
    time: "7 min lectura",
  },
  {
    slug: "mejor-lavavajillas",
    title: "Mejor Lavavajillas 2026",
    desc: "Integrado o libre instalación, cubiertos, programas y eficiencia.",
    icon: "🍽️",
    tag: "Guía completa",
    time: "6 min lectura",
  },
  {
    slug: "mejor-aspiradora",
    title: "Mejor Aspiradora 2026",
    desc: "Robot, escoba sin cable o trineo: qué modelo se adapta mejor a tu hogar.",
    icon: "🌀",
    tag: "Guía completa",
    time: "7 min lectura",
  },
  {
    slug: "mejor-cafetera",
    title: "Mejor Cafetera 2026",
    desc: "Espresso, cápsulas o filtro: la guía para elegir tu cafetera perfecta.",
    icon: "☕",
    tag: "Guía completa",
    time: "6 min lectura",
  },
  {
    slug: "mejor-secadora",
    title: "Mejor Secadora 2026",
    desc: "Bomba de calor, condensación o evacuación: cuál te conviene y por qué.",
    icon: "💨",
    tag: "Guía completa",
    time: "6 min lectura",
  },
  {
    slug: "mejor-horno",
    title: "Mejor Horno 2026",
    desc: "Integrable, multifunción, vapor... qué horno encaja mejor en tu cocina.",
    icon: "🔥",
    tag: "Guía completa",
    time: "6 min lectura",
  },
  {
    slug: "mejor-microondas",
    title: "Mejor Microondas 2026",
    desc: "Solo microondas, con grill o con convección: guía para acertar.",
    icon: "📡",
    tag: "Guía completa",
    time: "5 min lectura",
  },
  {
    slug: "mejor-aire-acondicionado",
    title: "Mejor Aire Acondicionado 2026",
    desc: "Split, portátil o multisplit: potencia, eficiencia y instalación explicados.",
    icon: "❄️",
    tag: "Guía completa",
    time: "7 min lectura",
  },
];

export default function GuiasPage() {
  return (
    <main className="min-h-screen bg-[#050310] text-white/90">

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.05]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-44 left-1/2 h-[480px] w-[1000px] -translate-x-1/2 rounded-full halo-breathe"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.18), transparent 70%)" }}
        />
        <div className="reveal relative mx-auto max-w-5xl px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
          <SectionChip label="Guías · actualizadas 2026" />
          <h1
            className="mt-7 mb-5 font-extrabold tracking-tight text-white"
            style={{ fontSize: "clamp(2.4rem, 5.6vw, 4.2rem)", lineHeight: 1.03, letterSpacing: "-0.04em", textWrap: "balance" }}
          >
            Guías de compra
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>
            Análisis honestos, sin publicidad. Te ayudamos a elegir el electrodoméstico perfecto con precios en tiempo real.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-12 pb-20">
        <AudienceLabel label={`${GUIAS.length} guías disponibles`} />

        {/* GRID: 2 col en tablet, 3 col en desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIAS.map((g, i) => (
            <Link
              key={g.slug}
              href={`/guias/${g.slug}`}
              className={`group shine-on-hover reveal flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-[0_24px_60px_-24px_rgba(99,102,241,0.55)]${i === GUIAS.length - 1 && GUIAS.length % 3 === 1 ? " lg:col-start-2" : ""}`}
              style={{ background: "linear-gradient(165deg, #0e0c20 0%, #0a081a 55%, #070613 100%)" }}
            >
              {/* Zona visual */}
              <div className="relative flex h-32 flex-shrink-0 items-center justify-center overflow-hidden border-b border-white/[0.06]">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.22), transparent 70%)" }}
                />
                <span
                  className="relative z-10 text-5xl transition-transform duration-500 group-hover:scale-110"
                  style={{ filter: "drop-shadow(0 0 20px rgba(129,140,248,0.55))" }}
                >
                  {g.icon}
                </span>
              </div>

              {/* Contenido */}
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex h-6 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-2.5 text-[10px] font-semibold text-brand-200">
                    {g.tag}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-white/40">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {g.time}
                  </span>
                </div>
                <h2 className="mb-1.5 text-base font-bold leading-snug text-white">{g.title}</h2>
                <p className="flex-1 text-[13px] leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>{g.desc}</p>
                <div className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-brand-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-200">
                  Leer guía
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
