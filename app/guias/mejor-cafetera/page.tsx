export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryProductCard } from "@/components/CategoryProductCard";

export const metadata: Metadata = {
  title: "Mejor Cafetera 2026: Guía de Compra Completa | Orvexia",
  description:
    "Analizamos las mejores cafeteras del mercado en 2026. Comparamos espresso, cápsulas, filtro y superautomáticas para que elijas la perfecta para ti.",
  keywords: ["mejor cafetera 2026", "guía compra cafetera", "cafetera espresso", "cafetera superautomática"],
};

async function getCafeteras() {
  return prisma.product.findMany({
    where: { category: "CAFETERAS" },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { rating: "desc" },
    take: 6,
  });
}

const CRITERIOS = [
  { icon: "☕", title: "Tipo de café preferido", desc: "Espresso intenso: cafetera de espresso o superautomática. Café suave: filtro o de goteo. Variedad: superautomática." },
  { icon: "⚙️", title: "Presión de extracción", desc: "Para un espresso auténtico necesitas mínimo 9 bares reales de presión en el grupo portafiltros." },
  { icon: "🌡️", title: "Control de temperatura", desc: "Las calderas PID mantienen la temperatura estable y mejoran la calidad de extracción notablemente." },
  { icon: "🥛", title: "Sistema de vapor / leche", desc: "Para capuchinos y lattes: vaporizador manual o sistema automático de espumado. El manual da más control." },
  { icon: "⏱️", title: "Tiempo de preparación", desc: "Cápsulas: 30 segundos. Espresso manual: 3-5 min. Superautomática: 1-2 min. Filtro: 5-10 min." },
  { icon: "🔧", title: "Mantenimiento y limpieza", desc: "Las superautomáticas se limpian solas pero requieren descalcificación periódica. Las manuales son más fáciles de mantener." },
];

const TIPOS = [
  {
    title: "Superautomática",
    emoji: "🟤",
    pros: ["Todo en uno: muele, extrae y espuma", "Mínimo esfuerzo diario", "Constancia en cada taza", "Ideal para varios usuarios"],
    cons: ["Precio elevado (200-1500€)", "Requiere mantenimiento periódico"],
    ideal: "Amantes del café que valoran la comodidad",
    color: "#92400E",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    title: "Espresso manual",
    emoji: "🔵",
    pros: ["Mayor control sobre el resultado", "Permite aprender y perfeccionar", "Precio más accesible en gama media", "Durabilidad superior"],
    cons: ["Curva de aprendizaje pronunciada", "Requiere molinillo separado"],
    ideal: "Entusiastas del café que disfrutan el proceso",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    title: "Cápsulas",
    emoji: "🟢",
    pros: ["Extremadamente fácil de usar", "Precio de entrada muy bajo", "Sin limpieza apenas", "Variedad de sabores"],
    cons: ["Coste por taza más alto", "Menos sostenible (residuos)", "Resultado inferior a espresso real"],
    ideal: "Quienes priorizan rapidez y comodidad",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
];

const FAQS = [
  {
    q: "¿Cuál es la diferencia entre 15 y 19 bares en una cafetera?",
    a: "El marketing de cafeteras infla los números de presión de la bomba, pero lo que importa es la presión real en el portafiltros, que en cualquier buena cafetera es de 9 bares. Más bares en la bomba no significa mejor café: lo que importa es la regulación y la calidad de la caldera.",
  },
  {
    q: "¿Vale la pena una cafetera superautomática?",
    a: "Sí, si bebes 2 o más cafés al día y valoras la comodidad. Aunque el precio inicial es alto (200-800€ para buenas opciones), el coste por taza es mucho menor que las cápsulas y el resultado es mejor. Se amortiza en 1-2 años frente al café de cápsulas.",
  },
  {
    q: "¿Necesito un molinillo separado?",
    a: "Si tienes una cafetera espresso manual, sí. El molinillo es tan importante como la cafetera. Un molinillo de 50-100€ mejora más el café que gastar lo mismo en mejor cafetera. Las superautomáticas ya incluyen molinillo integrado.",
  },
  {
    q: "¿Qué diferencia hay entre caldera y thermoblock?",
    a: "La caldera calienta más agua y mantiene temperatura estable, ideal para extracción de espresso y vapor simultáneo. El thermoblock calienta rápido y es más económico, pero la temperatura puede variar. Para uso serio, la caldera o dual boiler es superior.",
  },
  {
    q: "¿Qué marcas son más fiables en cafeteras en 2026?",
    a: "En espresso manual: De'Longhi, Breville y ECM. En superautomáticas: Jura (premium), De'Longhi y Philips/Saeco. En cápsulas: Nespresso (Vertuo y Original) para calidad, Dolce Gusto para variedad económica.",
  },
];

export default async function MejorCafeteraPage() {
  const cafeteras = await getCafeteras();

  const serialized = cafeteras.map((p) => ({
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#78350F] via-[#92400E] to-[#B45309] pt-16 pb-28 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#92400E] opacity-15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#78350F] opacity-10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <span>›</span>
            <Link href="/guias" className="hover:text-white/70 transition-colors">Guías</Link>
            <span>›</span>
            <span className="text-white/60">Cafeteras</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="bg-[#92400E] text-white text-xs font-bold px-3 py-1 rounded-full">Guía completa</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">6 min lectura</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">Actualizado abril 2026</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                ☕ Mejor Cafetera<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDE68A] to-[#FCA5A5]">2026</span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-xl mb-8">
                Hemos analizado más de {serialized.length > 0 ? serialized.length : "20"} modelos para ayudarte a elegir la cafetera
                perfecta para tu rutina. Sin opiniones pagadas, con precios en tiempo real.
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
              style={{ background: "linear-gradient(135deg, rgba(146,64,14,0.3), rgba(120,53,15,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-9xl">☕</span>
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
            Elegir una cafetera es una decisión muy personal: depende de si buscas comodidad extrema, control total sobre el café o
            un equilibrio entre ambos. En esta guía te explicamos <strong className="text-[#0F172A]">los tipos que existen y qué mirar</strong> en cada uno,
            para que aciertes con tu próxima cafetera.
          </p>
          <p className="text-[#334155] text-base leading-relaxed mt-4">
            Los precios que ves son <strong className="text-[#0F172A]">en tiempo real</strong>: los actualizamos automáticamente varias veces al día
            para que siempre veas la mejor oferta disponible.
          </p>
        </section>

        {/* TIPOS */}
        <section id="tipos">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#92400E] uppercase tracking-widest mb-2">Paso 1</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">¿Qué tipo de cafetera te conviene?</h2>
            <p className="text-[#64748B]">El tipo de cafetera define el tipo de café que obtendrás y el esfuerzo necesario.</p>
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
            <p className="text-xs font-bold text-[#92400E] uppercase tracking-widest mb-2">Paso 2</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">6 criterios clave para elegir bien</h2>
            <p className="text-[#64748B]">Los factores técnicos que determinan la calidad de tu café.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CRITERIOS.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex gap-4 shadow-sm hover:border-[#FDE68A] hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-[#FFFBEB] flex items-center justify-center flex-shrink-0 text-xl">
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#92400E] bg-[#FFFBEB] px-2 py-0.5 rounded-full">#{i + 1}</span>
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
              <p className="text-xs font-bold text-[#92400E] uppercase tracking-widest mb-2">Paso 3</p>
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-1">Los mejores modelos ahora</h2>
              <p className="text-[#64748B] text-sm">Precios actualizados automáticamente · Ordenados por valoración</p>
            </div>
            <Link
              href="/categorias/cafeteras"
              className="hidden sm:flex items-center gap-1 text-sm font-bold text-[#92400E] hover:underline whitespace-nowrap"
            >
              Ver todos →
            </Link>
          </div>

          {serialized.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serialized.map((p) => (
                <CategoryProductCard key={p.id} product={p} catColor="#92400E" catIcon="☕" />
              ))}
            </div>
          ) : (
            <div className="bg-[#FFFBEB] rounded-2xl p-10 text-center text-[#92400E]">
              <p className="text-4xl mb-3">☕</p>
              <p className="font-semibold">Cargando productos...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/categorias/cafeteras"
              className="inline-flex items-center gap-2 bg-[#92400E] hover:bg-[#78350F] text-white px-8 py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-[#92400E]/25"
            >
              Ver todos los modelos →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#92400E] uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none list-none">
                  <span className="font-bold text-[#0F172A] text-sm pr-4">{q}</span>
                  <span className="w-7 h-7 rounded-full bg-[#FFFBEB] flex items-center justify-center flex-shrink-0 text-[#92400E] transition-transform duration-200 group-open:rotate-180">
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#78350F] to-[#92400E] p-10 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative">
            <span className="text-5xl mb-4 block">☕</span>
            <h3 className="text-2xl font-extrabold text-white mb-2">¿Listo para comparar precios?</h3>
            <p className="text-white/60 text-sm mb-7 max-w-md mx-auto">
              Consulta todos los modelos con precios actualizados en tiempo real. Sin registros, sin suscripciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/categorias/cafeteras"
                className="bg-white text-[#92400E] font-bold px-7 py-3 rounded-2xl text-sm hover:bg-[#FFFBEB] transition-colors shadow-lg"
              >
                Ver todas las cafeteras
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
