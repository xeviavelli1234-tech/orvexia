export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryProductCard } from "@/components/CategoryProductCard";

export const metadata: Metadata = {
  title: "Mejor Lavavajillas 2026: Guía de Compra Completa | Orvexia",
  description:
    "Analizamos los mejores lavavajillas del mercado en 2026. Comparamos integrados, libre instalación, cubiertos, programas y eficiencia para que elijas el ideal.",
  keywords: ["mejor lavavajillas 2026", "guía compra lavavajillas", "lavavajillas integrado", "lavavajillas eficiente"],
};

async function getLavavajillas() {
  return prisma.product.findMany({
    where: { category: "LAVAVAJILLAS" },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { rating: "desc" },
    take: 6,
  });
}

const CRITERIOS = [
  { icon: "🍽️", title: "Cubiertos / capacidad", desc: "12 cubiertos es el estándar para 4-5 personas. 14 cubiertos para familias más grandes. 6 cubiertos para modelos compactos." },
  { icon: "💧", title: "Consumo de agua", desc: "Los mejores modelos consumen menos de 9 litros por ciclo. Los ineficientes superan los 15 litros." },
  { icon: "⚡", title: "Eficiencia energética", desc: "Clase A o B. La diferencia anual puede ser de 20-40€ en electricidad. Merece la pena invertir." },
  { icon: "🔇", title: "Nivel de ruido", desc: "Menos de 44 dB es silencioso. Menos de 40 dB apenas se escucha. Clave en cocinas abiertas." },
  { icon: "⏱️", title: "Programa rápido", desc: "Un ciclo eco dura 3-4 horas pero ahorra energía. Un programa rápido de 30-60 min es útil para el día a día." },
  { icon: "🛠️", title: "Función de secado", desc: "El secado por zeolitos (Bosch, Siemens) es el más eficiente. El secado por ventilación es suficiente para la mayoría." },
];

const TIPOS = [
  {
    title: "Libre instalación",
    emoji: "🔵",
    pros: ["Fácil de instalar y mover", "Gran variedad de modelos y precios", "Mantenimiento más accesible"],
    cons: ["Ocupa espacio visible en cocina", "Menos integrado estéticamente"],
    ideal: "Cocinas sin muebles a medida o alquileres",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
  {
    title: "Integrado / Semintegrado",
    emoji: "🟢",
    pros: ["Se integra con los muebles de cocina", "Estética limpia y uniforme", "Mayor silencio al estar encajado"],
    cons: ["Instalación más compleja", "Más difícil de mover o cambiar"],
    ideal: "Cocinas con muebles a medida",
    color: "#047857",
    bg: "#F0FDF4",
    border: "#86EFAC",
  },
  {
    title: "Compacto / Sobremesa",
    emoji: "🟡",
    pros: ["Ideal para espacios muy pequeños", "No requiere instalación", "Precio más bajo"],
    cons: ["Menor capacidad (6 cubiertos)", "No apto para familias"],
    ideal: "Estudios, pisos pequeños o segunda residencia",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
];

const FAQS = [
  {
    q: "¿Cuántos cubiertos necesito en mi lavavajillas?",
    a: "La norma europea define un cubierto como: plato llano, plato hondo, plato de postre, vaso, taza, cuchillo, tenedor, cuchara y cucharilla. Para 4 personas, 12 cubiertos es suficiente. Si sois más o coináis mucho, opta por 14.",
  },
  {
    q: "¿Es mejor el lavavajillas o lavar a mano?",
    a: "Un lavavajillas moderno consume entre 6-12 litros de agua por ciclo completo. Lavar a mano consume entre 30-60 litros. En términos de agua y energía, el lavavajillas eficiente siempre gana si lo llevas lleno.",
  },
  {
    q: "¿Qué significa el programa Eco y cuándo usarlo?",
    a: "El programa Eco es el más eficiente energéticamente pero dura 3-4 horas. Úsalo por la noche o cuando no tengas prisa. Para el día a día, los programas de 60-90 minutos son más prácticos con un consumo razonable.",
  },
  {
    q: "¿Qué tipo de sal y abrillantador necesito?",
    a: "La sal regeneradora ablanda el agua y es necesaria en zonas de agua dura (la mayoría de España). El abrillantador mejora el secado y evita manchas. Algunos modelos tienen sistemas de 3 en 1 que reducen la necesidad de productos separados.",
  },
  {
    q: "¿Qué marcas son más fiables en lavavajillas en 2026?",
    a: "Bosch, Siemens y Balay (grupo BSH) son los líderes en fiabilidad y silencio. AEG y Electrolux ofrecen excelente eficiencia. Miele es la referencia premium. Whirlpool y Beko ofrecen buena relación calidad-precio.",
  },
];

export default async function MejorLavavajillasPage() {
  const lavavajillas = await getLavavajillas();

  const serialized = lavavajillas.map((p) => ({
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#047857] via-[#059669] to-[#10B981] pt-16 pb-28 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#059669] opacity-15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#047857] opacity-10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <span>›</span>
            <Link href="/guias" className="hover:text-white/70 transition-colors">Guías</Link>
            <span>›</span>
            <span className="text-white/60">Lavavajillas</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="bg-[#059669] text-white text-xs font-bold px-3 py-1 rounded-full">Guía completa</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">6 min lectura</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">Actualizado abril 2026</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                🍽️ Mejor Lavavajillas<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A7F3D0] to-[#BAE6FD]">2026</span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-xl mb-8">
                Hemos analizado más de {serialized.length > 0 ? serialized.length : "20"} modelos para ayudarte a elegir el lavavajillas
                ideal para tu cocina. Sin opiniones pagadas, con precios en tiempo real.
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
              style={{ background: "linear-gradient(135deg, rgba(5,150,105,0.3), rgba(4,120,87,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-9xl">🍽️</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 leading-none">
          <svg viewBox="0 0 1440 50" fill="none" className="w-full h-12">
            <path d="M0 50L720 0L1440 50V50H0V50Z" fill="#F8FAFC" />
          </svg>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-14 space-y-20">

        {/* INTRO */}
        <section className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-sm">
          <p className="text-[#334155] text-base leading-relaxed">
            El lavavajillas es uno de los electrodomésticos que más tiempo ahorra en el hogar. Pero con tantos modelos,
            programas y especificaciones, elegir bien no es fácil. En esta guía te explicamos
            <strong className="text-[#0F172A]"> qué importa de verdad</strong> y qué puedes ignorar,
            para que elijas el lavavajillas que mejor se adapte a tu cocina y rutina.
          </p>
          <p className="text-[#334155] text-base leading-relaxed mt-4">
            Los precios que ves son <strong className="text-[#0F172A]">en tiempo real</strong>: los actualizamos automáticamente varias veces al día
            para que siempre veas la mejor oferta disponible.
          </p>
        </section>

        {/* TIPOS */}
        <section id="tipos">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#059669] uppercase tracking-widest mb-2">Paso 1</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">¿Qué tipo de lavavajillas necesitas?</h2>
            <p className="text-[#64748B]">El formato depende del espacio y del diseño de tu cocina.</p>
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
            <p className="text-xs font-bold text-[#059669] uppercase tracking-widest mb-2">Paso 2</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">6 criterios clave para elegir bien</h2>
            <p className="text-[#64748B]">Los factores que más influyen en el uso diario.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CRITERIOS.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex gap-4 shadow-sm hover:border-[#A7F3D0] hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] flex items-center justify-center flex-shrink-0 text-xl">
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">#{i + 1}</span>
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
              <p className="text-xs font-bold text-[#059669] uppercase tracking-widest mb-2">Paso 3</p>
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-1">Los mejores modelos ahora</h2>
              <p className="text-[#64748B] text-sm">Precios actualizados automáticamente · Ordenados por valoración</p>
            </div>
            <Link
              href="/categorias/lavavajillas"
              className="hidden sm:flex items-center gap-1 text-sm font-bold text-[#059669] hover:underline whitespace-nowrap"
            >
              Ver todos →
            </Link>
          </div>

          {serialized.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serialized.map((p) => (
                <CategoryProductCard key={p.id} product={p} catColor="#059669" catIcon="🍽️" />
              ))}
            </div>
          ) : (
            <div className="bg-[#ECFDF5] rounded-2xl p-10 text-center text-[#059669]">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="font-semibold">Cargando productos...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/categorias/lavavajillas"
              className="inline-flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white px-8 py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-[#059669]/25"
            >
              Ver todos los modelos →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#059669] uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none list-none">
                  <span className="font-bold text-[#0F172A] text-sm pr-4">{q}</span>
                  <span className="w-7 h-7 rounded-full bg-[#ECFDF5] flex items-center justify-center flex-shrink-0 text-[#059669] transition-transform duration-200 group-open:rotate-180">
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#047857] to-[#059669] p-10 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative">
            <span className="text-5xl mb-4 block">🍽️</span>
            <h3 className="text-2xl font-extrabold text-white mb-2">¿Listo para comparar precios?</h3>
            <p className="text-white/60 text-sm mb-7 max-w-md mx-auto">
              Consulta todos los modelos con precios actualizados en tiempo real. Sin registros, sin suscripciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/categorias/lavavajillas"
                className="bg-white text-[#059669] font-bold px-7 py-3 rounded-2xl text-sm hover:bg-[#ECFDF5] transition-colors shadow-lg"
              >
                Ver todos los lavavajillas
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
