export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryProductCard } from "@/components/CategoryProductCard";

export const metadata: Metadata = {
  title: "Mejor Televisor 2026: Guía de Compra Completa | Orvexia",
  description:
    "Analizamos los mejores televisores del mercado en 2026. Comparamos OLED, QLED, tamaños, tasa de refresco y precio para que aciertes con tu próxima TV.",
  keywords: ["mejor televisor 2026", "guía compra televisor", "OLED vs QLED", "televisor 4K"],
};

async function getTelevisores() {
  return prisma.product.findMany({
    where: { category: "TELEVISORES" },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { rating: "desc" },
    take: 6,
  });
}

const CRITERIOS = [
  { icon: "📐", title: "Tamaño de pantalla", desc: "A 2-3 m de distancia: 55\". A 3-4 m: 65\". A más de 4 m: 75\" o superior." },
  { icon: "🖼️", title: "Tecnología de panel", desc: "OLED: negros perfectos y colores vivos. QLED: mayor brillo. LED: más económico." },
  { icon: "🔄", title: "Tasa de refresco", desc: "120 Hz es el estándar actual para gaming y deportes. 60 Hz suficiente para series y películas." },
  { icon: "✨", title: "HDR", desc: "Dolby Vision o HDR10+ ofrecen la mejor experiencia. Verifica que el TV tenga brillo suficiente para activarlo." },
  { icon: "🎮", title: "Gaming (HDMI 2.1)", desc: "Para consolas actuales necesitas HDMI 2.1 con 4K@120Hz y ALLM/VRR activados." },
  { icon: "📡", title: "Smart TV y sistema operativo", desc: "Google TV y webOS son los más completos. Evita sistemas propietarios poco actualizados." },
];

const TIPOS = [
  {
    title: "OLED",
    emoji: "🟣",
    pros: ["Negros perfectos (píxeles se apagan)", "Colores y contraste superiores", "Ángulos de visión amplísimos", "Ideal para cine en oscuridad"],
    cons: ["Precio elevado", "Riesgo leve de burn-in con uso extremo"],
    ideal: "Cinéfilos y gamers que priorizan calidad de imagen",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  {
    title: "QLED / Mini-LED",
    emoji: "🔵",
    pros: ["Mayor brillo (ideal habitaciones luminosas)", "Buena relación calidad-precio en grandes tamaños", "Sin riesgo de burn-in"],
    cons: ["Negros menos profundos que OLED", "Halos en escenas oscuras"],
    ideal: "Salones con mucha luz natural",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    title: "LED / LCD estándar",
    emoji: "🟢",
    pros: ["Precio más accesible", "Amplia variedad de tamaños", "Buena durabilidad"],
    cons: ["Contraste inferior", "Ángulos de visión más limitados"],
    ideal: "Dormitorios, cocinas o presupuesto ajustado",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
];

const FAQS = [
  {
    q: "¿Qué tamaño de televisor necesito?",
    a: "La regla general es que la distancia de visión óptima es 1,5 veces la diagonal de la pantalla. Para un sofá a 3 metros, lo ideal es un televisor de 55-65 pulgadas. Si estás más lejos, 75 pulgadas o más.",
  },
  {
    q: "¿Vale la pena un OLED frente a un QLED?",
    a: "Si ves mucho cine en habitaciones oscuras, el OLED gana sin discusión: los negros son perfectos y el contraste es incomparable. Para salones luminosos, un QLED de calidad puede ser mejor por su mayor brillo máximo.",
  },
  {
    q: "¿Qué significa 120 Hz y lo necesito?",
    a: "120 Hz significa que la imagen se actualiza 120 veces por segundo, lo que elimina el efecto borroso en movimiento. Es imprescindible para gaming con consolas de última generación y muy recomendable para deportes en directo.",
  },
  {
    q: "¿Cuál es el mejor sistema Smart TV en 2026?",
    a: "Google TV (Sony, TCL) y webOS (LG) son los más completos y actualizados. Tizen (Samsung) también es buena opción. Evita televisores con sistemas propietarios menos conocidos que reciben pocas actualizaciones.",
  },
  {
    q: "¿Qué marcas son más fiables en televisores en 2026?",
    a: "LG y Sony lideran en calidad de imagen. Samsung ofrece la gama QLED más completa. Philips destaca por Ambilight. Hisense y TCL son las mejores opciones en relación calidad-precio.",
  },
];

export default async function MejorTelevisorPage() {
  const televisores = await getTelevisores();

  const serialized = televisores.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category as string,
    description: p.description,
    image: p.image,
    images: p.images as string[],
    rating: p.rating,
    reviewCount: p.reviewCount,
    offers: p.offers.map((o) => ({
      store: o.store,
      priceCurrent: o.priceCurrent,
      priceOld: o.priceOld,
      discountPercent: o.discountPercent,
      externalUrl: o.externalUrl,
      inStock: o.inStock,
    })),
  }));

  return (
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#2563EB] pt-16 pb-28 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#2563EB] opacity-15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#1E40AF] opacity-10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <span>›</span>
            <Link href="/guias" className="hover:text-white/70 transition-colors">Guías</Link>
            <span>›</span>
            <span className="text-white/60">Televisores</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="bg-[#2563EB] text-white text-xs font-bold px-3 py-1 rounded-full">Guía completa</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">10 min lectura</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">Actualizado abril 2026</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                📺 Mejor Televisor<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#93C5FD] to-[#BAE6FD]">2026</span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-xl mb-8">
                Hemos analizado más de {serialized.length > 0 ? serialized.length : "20"} modelos para ayudarte a elegir el televisor
                que mejor se adapta a tu salón. Sin opiniones pagadas, con precios en tiempo real.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["#tipos", "Tipos"],
                  ["#criterios", "Criterios clave"],
                  ["#mejores", "Mejores modelos"],
                  ["#preguntas", "FAQ"],
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    className="text-xs font-semibold text-white/70 bg-white/10 border border-white/20 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
            <div className="hidden lg:flex w-52 h-52 rounded-3xl items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(29,78,216,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-9xl">📺</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-14 space-y-20">

        {/* INTRO */}
        <section className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-sm">
          <p className="text-[#334155] text-base leading-relaxed">
            El mercado de televisores en 2026 es más confuso que nunca: OLED, QLED, Mini-LED, Neo QLED, 4K, 8K...
            En esta guía te explicamos <strong className="text-[#0F172A]">qué importa de verdad</strong> y qué puedes ignorar,
            para que elijas el televisor que más disfrutes sin pagar de más.
          </p>
          <p className="text-[#334155] text-base leading-relaxed mt-4">
            Los precios que ves son <strong className="text-[#0F172A]">en tiempo real</strong>: los actualizamos automáticamente varias veces al día
            para que siempre veas la mejor oferta disponible.
          </p>
        </section>

        {/* TIPOS */}
        <section id="tipos">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-2">Paso 1</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">¿Qué tecnología de panel te conviene?</h2>
            <p className="text-[#64748B]">El tipo de panel es la decisión más importante antes de mirar modelos.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TIPOS.map((t) => (
              <div
                key={t.title}
                className="rounded-3xl border p-6 flex flex-col gap-4"
                style={{ backgroundColor: t.bg, borderColor: t.border }}
              >
                <div>
                  <span className="text-2xl">{t.emoji}</span>
                  <h3 className="font-extrabold text-[#0F172A] mt-2 text-lg">{t.title}</h3>
                  <p className="text-xs font-medium mt-1" style={{ color: t.color }}>Ideal para: {t.ideal}</p>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-bold text-green-700 mb-1.5">✓ Ventajas</p>
                    <ul className="space-y-1 text-[#475569]">
                      {t.pros.map((p) => <li key={p} className="flex gap-1.5"><span className="text-green-600 mt-px">·</span>{p}</li>)}
                    </ul>
                  </div>
                  <div className="pt-2 border-t" style={{ borderColor: t.border }}>
                    <p className="font-bold text-red-500 mb-1.5">✗ Inconvenientes</p>
                    <ul className="space-y-1 text-[#475569]">
                      {t.cons.map((c) => <li key={c} className="flex gap-1.5"><span className="text-red-400 mt-px">·</span>{c}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CRITERIOS */}
        <section id="criterios">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-2">Paso 2</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">6 criterios clave para elegir bien</h2>
            <p className="text-[#64748B]">Los factores que más influyen en la experiencia diaria.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CRITERIOS.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex gap-4 shadow-sm hover:border-[#BFDBFE] hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0 text-xl">
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">#{i + 1}</span>
                    <h3 className="font-bold text-[#0F172A] text-sm">{c.title}</h3>
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* MEJORES */}
        <section id="mejores">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-2">Paso 3</p>
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-1">Los mejores modelos ahora</h2>
              <p className="text-[#64748B] text-sm">Precios actualizados automáticamente · Ordenados por valoración</p>
            </div>
            <Link
              href="/categorias/televisores"
              className="hidden sm:flex items-center gap-1 text-sm font-bold text-[#2563EB] hover:underline whitespace-nowrap"
            >
              Ver todos →
            </Link>
          </div>

          {serialized.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serialized.map((p) => (
                <CategoryProductCard key={p.id} product={p} catColor="#2563EB" catIcon="📺" />
              ))}
            </div>
          ) : (
            <div className="bg-[#EFF6FF] rounded-2xl p-10 text-center text-[#2563EB]">
              <p className="text-4xl mb-3">📺</p>
              <p className="font-semibold">Cargando productos...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/categorias/televisores"
              className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-8 py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-[#2563EB]/25"
            >
              Ver todos los modelos →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none list-none">
                  <span className="font-bold text-[#0F172A] text-sm pr-4">{q}</span>
                  <span className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0 text-[#2563EB] transition-transform duration-200 group-open:rotate-180">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 text-sm text-[#475569] leading-relaxed border-t border-[#F1F5F9] pt-4">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] p-10 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative">
            <span className="text-5xl mb-4 block">📺</span>
            <h3 className="text-2xl font-extrabold text-white mb-2">¿Listo para comparar precios?</h3>
            <p className="text-white/60 text-sm mb-7 max-w-md mx-auto">
              Consulta todos los modelos con precios actualizados en tiempo real. Sin registros, sin suscripciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/categorias/televisores"
                className="bg-white text-[#2563EB] font-bold px-7 py-3 rounded-2xl text-sm hover:bg-[#EFF6FF] transition-colors shadow-lg"
              >
                Ver todos los televisores
              </Link>
              <Link
                href="/guias"
                className="bg-white/10 border border-white/20 text-white font-semibold px-7 py-3 rounded-2xl text-sm hover:bg-white/20 transition-colors"
              >
                Más guías
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
