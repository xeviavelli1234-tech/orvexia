export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

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
    color: "#2563EB",
    colorLight: "#DBEAFE",
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
    color: "#059669",
    colorLight: "#D1FAE5",
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
    color: "#DC2626",
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
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] pt-16 pb-24 px-6 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#4F46E5] opacity-10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#7C3AED] opacity-10 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs text-white/70 font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] inline-block" />
            Actualizado abril 2026
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-5 tracking-tight leading-tight">
            Guías de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#60A5FA]">Compra</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
            Análisis honestos, sin publicidad. Te ayudamos a elegir el electrodoméstico perfecto con precios en tiempo real.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 -mt-6 pb-16">
        <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-5">{GUIAS.length} guías disponibles</p>

        {/* GRID: 2 col en tablet, 3 col en desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GUIAS.map((g, i) => (
            <Link
              key={g.slug}
              href={`/guias/${g.slug}`}
              className={`group flex flex-col bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200${i === GUIAS.length - 1 && GUIAS.length % 3 === 1 ? " lg:col-start-2" : ""}`}
            >
              {/* Header con color */}
              <div
                className="h-32 flex items-center justify-center relative overflow-hidden flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${g.color}ee, ${g.color}99)` }}
              >
                <div className="absolute inset-0 opacity-15">
                  <div className="absolute top-3 left-3 w-14 h-14 rounded-full border-2 border-white/40" />
                  <div className="absolute bottom-3 right-3 w-20 h-20 rounded-full border-2 border-white/20" />
                </div>
                <span className="text-6xl relative z-10 drop-shadow-lg">{g.icon}</span>
              </div>

              {/* Contenido */}
              <div className="flex flex-col flex-1 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: g.color }}>
                    {g.tag}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {g.time}
                  </span>
                </div>
                <h2 className="font-extrabold text-[#0F172A] text-base mb-1.5 leading-snug">{g.title}</h2>
                <p className="text-xs text-[#64748B] leading-relaxed flex-1">{g.desc}</p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold transition-transform group-hover:translate-x-0.5" style={{ color: g.color }}>
                  Leer la guía
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
