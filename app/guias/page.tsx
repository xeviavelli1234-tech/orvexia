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
    featured: true,
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
];

export default function GuiasPage() {
  const featured = GUIAS.find((g) => g.featured);
  const rest = GUIAS.filter((g) => !g.featured);

  return (
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] pt-16 pb-24 px-6 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#4F46E5] opacity-10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#7C3AED] opacity-10 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs text-white/70 font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] inline-block" />
            Actualizado abril 2026
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-5 tracking-tight leading-tight">
            Guías de<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#60A5FA]">Compra</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
            Análisis honestos, sin publicidad. Te ayudamos a elegir el electrodoméstico perfecto con precios en tiempo real.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 leading-none">
          <svg viewBox="0 0 1440 50" fill="none" className="w-full h-12">
            <path d="M0 50L720 0L1440 50V50H0V50Z" fill="#F8FAFC" />
          </svg>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 -mt-6 pb-16">

        {/* GUÍA DESTACADA */}
        {featured && (
          <div className="mb-8">
            <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Guía disponible</p>
            <Link
              href={`/guias/${featured.slug}`}
              className="group block bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden hover:shadow-2xl hover:shadow-[#7C3AED]/10 hover:border-[#DDD6FE] transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Visual */}
                <div
                  className="sm:w-72 h-48 sm:h-auto flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, #2E1065, #7C3AED)` }}
                >
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-4 left-4 w-20 h-20 rounded-full border-2 border-white/30" />
                    <div className="absolute bottom-4 right-4 w-32 h-32 rounded-full border-2 border-white/20" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border border-white/10" />
                  </div>
                  <span className="text-8xl relative z-10 drop-shadow-lg">{featured.icon}</span>
                </div>
                {/* Content */}
                <div className="flex-1 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: featured.color }}>
                        {featured.tag}
                      </span>
                      <span className="text-xs text-[#94A3B8]">{featured.time}</span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#0F172A] mb-3 group-hover:text-[#7C3AED] transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-[#64748B] leading-relaxed">{featured.desc}</p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 font-bold text-sm" style={{ color: featured.color }}>
                    Leer la guía completa
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* RESTO DE GUÍAS */}
        <div>
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Más guías</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((g) => (
              <Link
                key={g.slug}
                href={`/guias/${g.slug}`}
                className="group bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col gap-4 hover:shadow-lg hover:border-current/20 transition-all duration-200"
                style={{ ["--tw-border-opacity" as string]: "1" }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: g.colorLight }}
                  >
                    {g.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide border px-2 py-1 rounded-full" style={{ color: g.color, borderColor: g.colorLight, backgroundColor: g.colorLight }}>
                    {g.tag}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#0F172A] mb-1.5 group-hover:transition-colors" style={{ ["--hover-color" as string]: g.color }}>{g.title}</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">{g.desc}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {g.time}
                  </div>
                  <span className="text-xs font-bold group-hover:translate-x-0.5 transition-transform" style={{ color: g.color }}>Leer →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
