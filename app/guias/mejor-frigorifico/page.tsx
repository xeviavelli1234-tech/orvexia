export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryProductCard } from "@/components/CategoryProductCard";

export const metadata: Metadata = {
  title: "Mejor Frigorífico 2026: Guía de Compra Completa | Orvexia",
  description:
    "Analizamos los mejores frigoríficos del mercado en 2026. Comparamos combi, americano, No Frost, capacidad y eficiencia para que elijas la nevera ideal.",
  keywords: ["mejor frigorífico 2026", "guía compra frigorífico", "nevera No Frost", "frigorífico americano"],
};

async function getFrigorificos() {
  return prisma.product.findMany({
    where: { category: "FRIGORIFICOS" },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { rating: "desc" },
    take: 6,
  });
}

const CRITERIOS = [
  { icon: "📦", title: "Capacidad (litros)", desc: "1-2 personas: 200-280 l · 3-4 personas: 300-380 l · Familias grandes: 400 l+" },
  { icon: "❄️", title: "Sistema No Frost", desc: "Evita la escarcha y mantiene temperatura uniforme. Obligatorio en gama media-alta desde 2026." },
  { icon: "⚡", title: "Eficiencia energética", desc: "Clase D o superior. Un frigorífico A puede ahorrar hasta 100€ al año frente a uno F." },
  { icon: "🔇", title: "Nivel de ruido", desc: "Menos de 38 dB para salón o cocina abierta. Menos de 42 dB es aceptable para cocina independiente." },
  { icon: "🌡️", title: "Zonas de temperatura", desc: "Cajones de humedad para frutas y verduras. Zona 0° o CrispZone alarga la vida de los alimentos." },
  { icon: "📏", title: "Dimensiones", desc: "Mide tu hueco antes de comprar: ancho, alto y fondo. La mayoría mide 60 cm de ancho y 185-200 cm de alto." },
];

const TIPOS = [
  {
    title: "Combi",
    emoji: "🔵",
    pros: ["Nevera arriba, congelador abajo (o viceversa)", "Caben en cocinas estándar", "Buena relación precio-capacidad", "Gran variedad de modelos"],
    cons: ["Menos capacidad de congelador que americano", "Acceso al congelador más incómodo"],
    ideal: "La mayoría de hogares",
    color: "#0891B2",
    bg: "#ECFEFF",
    border: "#A5F3FC",
  },
  {
    title: "Americano (Side by Side)",
    emoji: "🟣",
    pros: ["Gran capacidad total", "Acceso cómodo a ambas zonas", "Dispensador de agua/hielo en modelos premium"],
    cons: ["Ocupa mucho ancho (90 cm+)", "Precio más elevado", "Eficiencia menor por tamaño"],
    ideal: "Cocinas grandes y familias numerosas",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  {
    title: "Multi-puerta (French Door)",
    emoji: "🟢",
    pros: ["Doble puerta en nevera muy cómoda", "Congelador inferior con cajones", "Aspecto premium"],
    cons: ["Precio alto", "Requiere espacio frontal para abrir ambas puertas"],
    ideal: "Cocinas modernas con presupuesto holgado",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
];

const FAQS = [
  {
    q: "¿Qué capacidad de frigorífico necesito?",
    a: "La regla general es 100 litros por persona como mínimo. Para una pareja, 200-250 litros es suficiente. Familias de 4 personas deberían optar por 300-380 litros. Si tienes jardín y haces compras grandes, valora más capacidad en el congelador.",
  },
  {
    q: "¿Es importante el sistema No Frost?",
    a: "Sí. El No Frost elimina la necesidad de descongelar manualmente, mantiene la temperatura más uniforme y conserva mejor los alimentos. En 2026 es prácticamente el estándar en gama media y alta.",
  },
  {
    q: "¿Cuánto consume un frigorífico moderno?",
    a: "Un frigorífico eficiente clase D consume entre 150-200 kWh al año. Uno de clase A consume menos de 100 kWh. A 0,20€/kWh, la diferencia puede ser de 10-20€ al año, lo que amortiza la inversión en varios años.",
  },
  {
    q: "¿Qué es la zona 0 grados?",
    a: "Es un compartimento que mantiene temperatura entre 0 y 2°C, ideal para carnes y pescados frescos. Conserva los alimentos hasta tres veces más tiempo que en el refrigerador convencional sin congelarlos.",
  },
  {
    q: "¿Qué marcas son más fiables en frigoríficos en 2026?",
    a: "Bosch, Siemens y Balay (grupo BSH) encabezan los rankings de fiabilidad. LG destaca por su tecnología Linear Cooling. Samsung tiene buenas opciones en gama alta. Liebherr es referente en calidad premium.",
  },
];

export default async function MejorFrigorificoPage() {
  const frigorificos = await getFrigorificos();

  const serialized = frigorificos.map((p) => ({
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0E7490] via-[#0891B2] to-[#06B6D4] pt-16 pb-28 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#0891B2] opacity-15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#0E7490] opacity-10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <span>›</span>
            <Link href="/guias" className="hover:text-white/70 transition-colors">Guías</Link>
            <span>›</span>
            <span className="text-white/60">Frigoríficos</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="bg-[#0891B2] text-white text-xs font-bold px-3 py-1 rounded-full">Guía completa</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">7 min lectura</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">Actualizado abril 2026</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                🧊 Mejor Frigorífico<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A5F3FC] to-[#BAE6FD]">2026</span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-xl mb-8">
                Hemos analizado más de {serialized.length > 0 ? serialized.length : "20"} modelos para ayudarte a elegir el frigorífico
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
              style={{ background: "linear-gradient(135deg, rgba(8,145,178,0.3), rgba(14,116,144,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-9xl">🧊</span>
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
            El frigorífico es el electrodoméstico que más horas trabaja en tu hogar: funciona 24 horas al día, 365 días al año.
            En esta guía te explicamos <strong className="text-[#0F172A]">qué mirar realmente</strong> antes de comprar,
            cuáles son los tipos disponibles y qué modelos ofrecen mejor relación calidad-precio en 2026.
          </p>
          <p className="text-[#334155] text-base leading-relaxed mt-4">
            Los precios que ves son <strong className="text-[#0F172A]">en tiempo real</strong>: los actualizamos automáticamente varias veces al día
            para que siempre veas la mejor oferta disponible.
          </p>
        </section>

        {/* TIPOS */}
        <section id="tipos">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#0891B2] uppercase tracking-widest mb-2">Paso 1</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">¿Qué tipo de frigorífico necesitas?</h2>
            <p className="text-[#64748B]">El formato condiciona el espacio y la comodidad de uso.</p>
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
            <p className="text-xs font-bold text-[#0891B2] uppercase tracking-widest mb-2">Paso 2</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">6 criterios clave para elegir bien</h2>
            <p className="text-[#64748B]">Los factores que más influyen en el día a día.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CRITERIOS.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex gap-4 shadow-sm hover:border-[#A5F3FC] hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-[#ECFEFF] flex items-center justify-center flex-shrink-0 text-xl">
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#0891B2] bg-[#ECFEFF] px-2 py-0.5 rounded-full">#{i + 1}</span>
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
              <p className="text-xs font-bold text-[#0891B2] uppercase tracking-widest mb-2">Paso 3</p>
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-1">Los mejores modelos ahora</h2>
              <p className="text-[#64748B] text-sm">Precios actualizados automáticamente · Ordenados por valoración</p>
            </div>
            <Link
              href="/categorias/frigorificos"
              className="hidden sm:flex items-center gap-1 text-sm font-bold text-[#0891B2] hover:underline whitespace-nowrap"
            >
              Ver todos →
            </Link>
          </div>

          {serialized.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serialized.map((p) => (
                <CategoryProductCard key={p.id} product={p} catColor="#0891B2" catIcon="🧊" />
              ))}
            </div>
          ) : (
            <div className="bg-[#ECFEFF] rounded-2xl p-10 text-center text-[#0891B2]">
              <p className="text-4xl mb-3">🧊</p>
              <p className="font-semibold">Cargando productos...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/categorias/frigorificos"
              className="inline-flex items-center gap-2 bg-[#0891B2] hover:bg-[#0E7490] text-white px-8 py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-[#0891B2]/25"
            >
              Ver todos los modelos →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#0891B2] uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none list-none">
                  <span className="font-bold text-[#0F172A] text-sm pr-4">{q}</span>
                  <span className="w-7 h-7 rounded-full bg-[#ECFEFF] flex items-center justify-center flex-shrink-0 text-[#0891B2] transition-transform duration-200 group-open:rotate-180">
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0E7490] to-[#0891B2] p-10 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative">
            <span className="text-5xl mb-4 block">🧊</span>
            <h3 className="text-2xl font-extrabold text-white mb-2">¿Listo para comparar precios?</h3>
            <p className="text-white/60 text-sm mb-7 max-w-md mx-auto">
              Consulta todos los modelos con precios actualizados en tiempo real. Sin registros, sin suscripciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/categorias/frigorificos"
                className="bg-white text-[#0891B2] font-bold px-7 py-3 rounded-2xl text-sm hover:bg-[#ECFEFF] transition-colors shadow-lg"
              >
                Ver todos los frigoríficos
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
