export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryProductCard } from "@/components/CategoryProductCard";

export const metadata: Metadata = {
  title: "Mejor Microondas 2026: Guía de Compra Completa | Orvexia",
  description:
    "Analizamos los mejores microondas del mercado en 2026. Comparamos solo microondas, con grill y combinados con horno para que elijas el ideal para tu cocina.",
  keywords: ["mejor microondas 2026", "guía compra microondas", "microondas con grill", "microondas combinado"],
};

async function getMicroondas() {
  return prisma.product.findMany({
    where: { category: "MICROONDAS" },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { rating: "desc" },
    take: 6,
  });
}

const CRITERIOS = [
  { icon: "📡", title: "Potencia (vatios)", desc: "700W es el mínimo útil. 900W es el estándar cómodo. 1000W+ para uso intensivo. Más potencia = menos tiempo." },
  { icon: "📦", title: "Capacidad (litros)", desc: "Para 1-2 personas: 17-20 l. Para familias: 25-32 l. Si lo usas para cocinar: mínimo 25 l." },
  { icon: "🔄", title: "Plato giratorio vs inverter", desc: "Los microondas inverter calientan de forma uniforme sin plato giratorio: mejor resultado y más espacio interior." },
  { icon: "🌡️", title: "Sensor de temperatura", desc: "Los modelos con sensor detectan la temperatura del alimento y ajustan automáticamente el tiempo de cocción." },
  { icon: "🍕", title: "Función grill", desc: "El grill añade gratinado y dorado. Imprescindible si quieres pizza crujiente, gratinados o pollo dorado." },
  { icon: "🔇", title: "Nivel de ruido y diseño", desc: "Los modelos de integración (para empotrar) tienen mejor acabado. El inox resiste mejor las manchas que el blanco." },
];

const TIPOS = [
  {
    title: "Solo microondas",
    emoji: "🟣",
    pros: ["Precio muy económico", "Fácil de usar", "Pequeño y manejable", "Bajo consumo energético"],
    cons: ["Solo calienta y descongela", "No dora ni gratina"],
    ideal: "Calentar comida y descongelar en el día a día",
    color: "#9333EA",
    bg: "#FAF5FF",
    border: "#E9D5FF",
  },
  {
    title: "Con grill",
    emoji: "🔵",
    pros: ["Calienta y gratina", "Mejor resultado en pizzas y gratinados", "Precio moderado", "Versatilidad añadida"],
    cons: ["El grill tarda más que el microondas", "No sustituye a un horno completo"],
    ideal: "Quienes quieren más versatilidad sin gastar mucho",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  {
    title: "Combinado (microondas + horno)",
    emoji: "🟢",
    pros: ["Sustituye al horno en cocinas pequeñas", "Calienta, gratina y hornea", "Ahorro de espacio"],
    cons: ["Precio más elevado", "Mayor tamaño", "Más complejo de limpiar"],
    ideal: "Pisos pequeños o segunda residencia sin horno",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
];

const FAQS = [
  {
    q: "¿Qué potencia de microondas necesito?",
    a: "Para uso básico (calentar y descongelar), 700-800W es suficiente. Para cocinar y resultados más rápidos, 900-1000W es lo recomendable. Los modelos de 1200W+ son para uso intensivo o cocina profesional en casa.",
  },
  {
    q: "¿Qué es un microondas inverter y merece la pena?",
    a: "Los microondas convencionales solo pueden estar al 100% de potencia o apagados, alternando rápidamente. El inverter regula la potencia de forma continua, lo que da un calentamiento más uniforme, sin bordes fríos y centros calientes. Merece la pena desde la gama media.",
  },
  {
    q: "¿Puedo usar el microondas para cocinar de verdad?",
    a: "Sí, con un microondas de buena potencia (900W+) puedes cocinar verduras al vapor, arroces, pescados y huevos perfectamente. Los combinados con horno amplían aún más las posibilidades. No es un sustituto del horno para asados, pero para cocina rápida del día a día funciona muy bien.",
  },
  {
    q: "¿Cuánto consume un microondas al mes?",
    a: "Un microondas de 900W usado 15 minutos al día consume aproximadamente 6-7 kWh al mes, unos 1,2-1,5€ a precios actuales. Es uno de los electrodomésticos más eficientes en relación tiempo de uso/resultado.",
  },
  {
    q: "¿Qué marcas son más fiables en microondas en 2026?",
    a: "Panasonic es referente en calidad y tecnología inverter. Samsung y LG ofrecen buenas opciones en todos los rangos de precio. Bosch y Siemens destacan en modelos de integración. Cecotec y Teka ofrecen buena relación calidad-precio.",
  },
];

export default async function MejorMicroondasPage() {
  const microondas = await getMicroondas();

  const serialized = microondas.map((p) => ({
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#7E22CE] via-[#9333EA] to-[#A855F7] pt-16 pb-28 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#9333EA] opacity-15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#7E22CE] opacity-10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <span>›</span>
            <Link href="/guias" className="hover:text-white/70 transition-colors">Guías</Link>
            <span>›</span>
            <span className="text-white/60">Microondas</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="bg-[#9333EA] text-white text-xs font-bold px-3 py-1 rounded-full">Guía completa</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">6 min lectura</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">Actualizado abril 2026</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                📡 Mejor Microondas<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E9D5FF] to-[#BAE6FD]">2026</span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-xl mb-8">
                Hemos analizado más de {serialized.length > 0 ? serialized.length : "20"} modelos para ayudarte a elegir el microondas
                perfecto para tu cocina. Sin opiniones pagadas, con precios en tiempo real.
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
              style={{ background: "linear-gradient(135deg, rgba(147,51,234,0.3), rgba(126,34,206,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-9xl">📡</span>
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
            El microondas es quizá el electrodoméstico más infrautilizado del hogar. Con el modelo adecuado, puedes
            calentar, descongelar, cocinar al vapor y hasta gratinar. En esta guía te explicamos
            <strong className="text-[#0F172A]"> qué tipo elegir</strong> según tu uso real y cuáles son los modelos más recomendables en 2026.
          </p>
          <p className="text-[#334155] text-base leading-relaxed mt-4">
            Los precios que ves son <strong className="text-[#0F172A]">en tiempo real</strong>: los actualizamos automáticamente varias veces al día
            para que siempre veas la mejor oferta disponible.
          </p>
        </section>

        {/* TIPOS */}
        <section id="tipos">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#9333EA] uppercase tracking-widest mb-2">Paso 1</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">¿Qué tipo de microondas necesitas?</h2>
            <p className="text-[#64748B]">Elige en función de lo que vas a cocinar y tu presupuesto.</p>
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
            <p className="text-xs font-bold text-[#9333EA] uppercase tracking-widest mb-2">Paso 2</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">6 criterios clave para elegir bien</h2>
            <p className="text-[#64748B]">Los factores que marcan la diferencia en el uso diario.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CRITERIOS.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex gap-4 shadow-sm hover:border-[#E9D5FF] hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-[#FAF5FF] flex items-center justify-center flex-shrink-0 text-xl">
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#9333EA] bg-[#FAF5FF] px-2 py-0.5 rounded-full">#{i + 1}</span>
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
              <p className="text-xs font-bold text-[#9333EA] uppercase tracking-widest mb-2">Paso 3</p>
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-1">Los mejores modelos ahora</h2>
              <p className="text-[#64748B] text-sm">Precios actualizados automáticamente · Ordenados por valoración</p>
            </div>
            <Link
              href="/categorias/microondas"
              className="hidden sm:flex items-center gap-1 text-sm font-bold text-[#9333EA] hover:underline whitespace-nowrap"
            >
              Ver todos →
            </Link>
          </div>

          {serialized.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serialized.map((p) => (
                <CategoryProductCard key={p.id} product={p} catColor="#9333EA" catIcon="📡" />
              ))}
            </div>
          ) : (
            <div className="bg-[#FAF5FF] rounded-2xl p-10 text-center text-[#9333EA]">
              <p className="text-4xl mb-3">📡</p>
              <p className="font-semibold">Cargando productos...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/categorias/microondas"
              className="inline-flex items-center gap-2 bg-[#9333EA] hover:bg-[#7E22CE] text-white px-8 py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-[#9333EA]/25"
            >
              Ver todos los modelos →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#9333EA] uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none list-none">
                  <span className="font-bold text-[#0F172A] text-sm pr-4">{q}</span>
                  <span className="w-7 h-7 rounded-full bg-[#FAF5FF] flex items-center justify-center flex-shrink-0 text-[#9333EA] transition-transform duration-200 group-open:rotate-180">
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7E22CE] to-[#9333EA] p-10 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative">
            <span className="text-5xl mb-4 block">📡</span>
            <h3 className="text-2xl font-extrabold text-white mb-2">¿Listo para comparar precios?</h3>
            <p className="text-white/60 text-sm mb-7 max-w-md mx-auto">
              Consulta todos los modelos con precios actualizados en tiempo real. Sin registros, sin suscripciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/categorias/microondas"
                className="bg-white text-[#9333EA] font-bold px-7 py-3 rounded-2xl text-sm hover:bg-[#FAF5FF] transition-colors shadow-lg"
              >
                Ver todos los microondas
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
