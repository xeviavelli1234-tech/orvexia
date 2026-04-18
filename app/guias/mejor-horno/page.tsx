export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryProductCard } from "@/components/CategoryProductCard";

export const metadata: Metadata = {
  title: "Mejor Horno 2026: Guía de Compra Completa | Orvexia",
  description:
    "Analizamos los mejores hornos del mercado en 2026. Comparamos hornos eléctricos, de gas, pirolíticos y multifunción para que elijas el ideal para tu cocina.",
  keywords: ["mejor horno 2026", "guía compra horno", "horno pirolítico", "horno multifunción"],
};

async function getHornos() {
  return prisma.product.findMany({
    where: { category: "HORNOS" },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { rating: "desc" },
    take: 6,
  });
}

const CRITERIOS = [
  { icon: "📐", title: "Capacidad (litros)", desc: "Para familias: 60-70 litros. Para parejas: 45-60 litros. Los hornos compactos de 40 l son suficientes para uno o dos." },
  { icon: "🔥", title: "Funciones de cocción", desc: "El aire caliente (convección) es imprescindible para resultados uniformes. Más funciones no siempre es mejor." },
  { icon: "🧹", title: "Sistema de limpieza", desc: "Pirolítico: calcina los restos a 500°C (el más eficaz). Catalítico: absorbe las grasas. Manual: el más económico." },
  { icon: "🌡️", title: "Control de temperatura", desc: "Termostato preciso y programable. Los hornos premium permiten control por sonda de temperatura de la carne." },
  { icon: "💡", title: "Iluminación interior", desc: "La luz LED interior facilita vigilar la cocción sin abrir la puerta y perder temperatura." },
  { icon: "⚡", title: "Eficiencia energética", desc: "Clase A o superior. El doble o triple cristal en la puerta reduce pérdidas de calor significativamente." },
];

const TIPOS = [
  {
    title: "Horno eléctrico",
    emoji: "🔴",
    pros: ["Mayor variedad de funciones", "Temperatura más uniforme", "Fácil instalación", "Gran variedad de modelos"],
    cons: ["Mayor consumo que gas", "Más caro de usar en zonas con electricidad cara"],
    ideal: "La mayoría de cocinas modernas",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
  },
  {
    title: "Horno de gas",
    emoji: "🟠",
    pros: ["Menor coste de uso", "Calienta muy rápido", "Ideal para pan artesano y masas"],
    cons: ["Distribución de calor menos uniforme", "Menos funciones que el eléctrico"],
    ideal: "Hogares con cocina de gas y cocineros de repostería",
    color: "#EA580C",
    bg: "#FFF7ED",
    border: "#FED7AA",
  },
  {
    title: "Horno pirolítico",
    emoji: "🟡",
    pros: ["Autolimpieza a alta temperatura", "Resultados profesionales", "Puerta más fría durante el uso"],
    cons: ["Precio más elevado", "El ciclo de limpieza consume más energía"],
    ideal: "Quienes cocinan mucho y valoran la limpieza fácil",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
];

const FAQS = [
  {
    q: "¿Qué diferencia hay entre un horno con ventilador y sin ventilador?",
    a: "El ventilador (convección o aire caliente) distribuye el calor de forma uniforme por todo el interior. Permite cocinar varios platos a la vez, acorta los tiempos y da mejores resultados en repostería y asados. Es prácticamente imprescindible en un horno moderno.",
  },
  {
    q: "¿Vale la pena un horno pirolítico?",
    a: "Sí, si cocinas con frecuencia y no quieres limpiar el horno manualmente. El ciclo pirolítico calcina los restos a 500°C y solo hay que limpiar el polvo restante. El coste energético del ciclo (1-2 kWh) compensa el tiempo y el esfuerzo ahorrados.",
  },
  {
    q: "¿Qué capacidad de horno necesito?",
    a: "Para la mayoría de familias, 60 litros es el estándar cómodo. Permite cocinar un pavo entero, dos bandejas simultáneas o pizzas de tamaño grande. Los hornos de 45 litros son suficientes para cocinar diario sin grandes asados.",
  },
  {
    q: "¿Cómo afecta la doble puerta a la eficiencia?",
    a: "La doble o triple pared de cristal reduce la temperatura exterior de la puerta y mantiene mejor el calor interior. Esto mejora la eficiencia energética y aumenta la seguridad, especialmente en hogares con niños.",
  },
  {
    q: "¿Qué marcas son más fiables en hornos en 2026?",
    a: "Bosch, Siemens y Neff (grupo BSH) son los líderes en calidad y funciones. AEG y Electrolux ofrecen excelentes modelos con buena relación calidad-precio. Smeg destaca por diseño y calidad. Balay es la opción más económica del grupo BSH.",
  },
];

export default async function MejorHornoPage() {
  const hornos = await getHornos();

  const serialized = hornos.map((p) => ({
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#B91C1C] via-[#DC2626] to-[#EF4444] pt-16 pb-28 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#DC2626] opacity-15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#B91C1C] opacity-10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <span>›</span>
            <Link href="/guias" className="hover:text-white/70 transition-colors">Guías</Link>
            <span>›</span>
            <span className="text-white/60">Hornos</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="bg-[#DC2626] text-white text-xs font-bold px-3 py-1 rounded-full">Guía completa</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">7 min lectura</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">Actualizado abril 2026</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                🔥 Mejor Horno<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCA5A5] to-[#FDE68A]">2026</span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-xl mb-8">
                Hemos analizado más de {serialized.length > 0 ? serialized.length : "20"} modelos para ayudarte a elegir el horno
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
              style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.3), rgba(185,28,28,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-9xl">🔥</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-14 space-y-20">

        {/* INTRO */}
        <section className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-sm">
          <p className="text-[#334155] text-base leading-relaxed">
            Un buen horno transforma la cocina diaria: desde un asado perfecto hasta una pizza crujiente o un bizcocho
            esponjoso. En esta guía te explicamos <strong className="text-[#0F172A]">qué características importan realmente</strong>,
            cuáles son los tipos disponibles y qué modelos ofrecen mejor rendimiento en 2026.
          </p>
          <p className="text-[#334155] text-base leading-relaxed mt-4">
            Los precios que ves son <strong className="text-[#0F172A]">en tiempo real</strong>: los actualizamos automáticamente varias veces al día
            para que siempre veas la mejor oferta disponible.
          </p>
        </section>

        {/* TIPOS */}
        <section id="tipos">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#DC2626] uppercase tracking-widest mb-2">Paso 1</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">¿Qué tipo de horno te conviene?</h2>
            <p className="text-[#64748B]">El tipo de horno define las posibilidades culinarias y el coste de uso.</p>
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
            <p className="text-xs font-bold text-[#DC2626] uppercase tracking-widest mb-2">Paso 2</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">6 criterios clave para elegir bien</h2>
            <p className="text-[#64748B]">Los factores que determinan el rendimiento real en cocina.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CRITERIOS.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex gap-4 shadow-sm hover:border-[#FECACA] hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-[#FEF2F2] flex items-center justify-center flex-shrink-0 text-xl">
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-full">#{i + 1}</span>
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
              <p className="text-xs font-bold text-[#DC2626] uppercase tracking-widest mb-2">Paso 3</p>
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-1">Los mejores modelos ahora</h2>
              <p className="text-[#64748B] text-sm">Precios actualizados automáticamente · Ordenados por valoración</p>
            </div>
            <Link
              href="/categorias/hornos"
              className="hidden sm:flex items-center gap-1 text-sm font-bold text-[#DC2626] hover:underline whitespace-nowrap"
            >
              Ver todos →
            </Link>
          </div>

          {serialized.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serialized.map((p) => (
                <CategoryProductCard key={p.id} product={p} catColor="#DC2626" catIcon="🔥" />
              ))}
            </div>
          ) : (
            <div className="bg-[#FEF2F2] rounded-2xl p-10 text-center text-[#DC2626]">
              <p className="text-4xl mb-3">🔥</p>
              <p className="font-semibold">Cargando productos...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/categorias/hornos"
              className="inline-flex items-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white px-8 py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-[#DC2626]/25"
            >
              Ver todos los modelos →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#DC2626] uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none list-none">
                  <span className="font-bold text-[#0F172A] text-sm pr-4">{q}</span>
                  <span className="w-7 h-7 rounded-full bg-[#FEF2F2] flex items-center justify-center flex-shrink-0 text-[#DC2626] transition-transform duration-200 group-open:rotate-180">
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#B91C1C] to-[#DC2626] p-10 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative">
            <span className="text-5xl mb-4 block">🔥</span>
            <h3 className="text-2xl font-extrabold text-white mb-2">¿Listo para comparar precios?</h3>
            <p className="text-white/60 text-sm mb-7 max-w-md mx-auto">
              Consulta todos los modelos con precios actualizados en tiempo real. Sin registros, sin suscripciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/categorias/hornos"
                className="bg-white text-[#DC2626] font-bold px-7 py-3 rounded-2xl text-sm hover:bg-[#FEF2F2] transition-colors shadow-lg"
              >
                Ver todos los hornos
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
