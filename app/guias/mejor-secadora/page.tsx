export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryProductCard } from "@/components/CategoryProductCard";

export const metadata: Metadata = {
  title: "Mejor Secadora 2026: Guía de Compra Completa | Orvexia",
  description:
    "Analizamos las mejores secadoras del mercado en 2026. Comparamos bomba de calor, condensación y ventilación para que elijas la ideal para tu hogar.",
  keywords: ["mejor secadora 2026", "guía compra secadora", "secadora bomba de calor", "secadora condensación"],
};

async function getSecadoras() {
  return prisma.product.findMany({
    where: { category: "SECADORAS" },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { rating: "desc" },
    take: 6,
  });
}

const CRITERIOS = [
  { icon: "⚖️", title: "Capacidad (kg)", desc: "Para 1-3 personas: 7-8 kg. Para familias de 4+: 9-10 kg. Usa la misma capacidad que tu lavadora o mayor." },
  { icon: "⚡", title: "Eficiencia energética", desc: "Las secadoras de bomba de calor consumen hasta un 50% menos que las de condensación tradicional. Clase A es el estándar recomendado." },
  { icon: "🌡️", title: "Temperatura de secado", desc: "La bomba de calor seca a menor temperatura (45-55°C), respetando más los tejidos y reduciendo el consumo." },
  { icon: "💧", title: "Gestión del agua", desc: "Depósito de agua o desagüe directo. El desagüe directo es más cómodo si tienes toma de agua cerca." },
  { icon: "🔇", title: "Nivel de ruido", desc: "Las secadoras hacen más ruido que las lavadoras. Busca menos de 65 dB para un uso más tranquilo." },
  { icon: "📱", title: "Sensores de humedad", desc: "Los sensores de humedad detectan cuando la ropa está seca y paran automáticamente, ahorrando energía." },
];

const TIPOS = [
  {
    title: "Bomba de calor",
    emoji: "🟢",
    pros: ["Consumo hasta 50% menor", "Cuida más los tejidos (baja temperatura)", "No necesita salida de aire al exterior", "Clase energética A"],
    cons: ["Precio inicial más alto", "Ciclos algo más lentos"],
    ideal: "Uso frecuente y quienes buscan eficiencia",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    title: "Condensación",
    emoji: "🔵",
    pros: ["Precio más accesible", "Sin necesidad de salida de aire exterior", "Amplia variedad de modelos"],
    cons: ["Mayor consumo energético que bomba de calor", "Genera más calor en la habitación"],
    ideal: "Presupuesto ajustado sin salida de ventilación",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    title: "Ventilación (evacuación)",
    emoji: "🟡",
    pros: ["Más rápida en cada ciclo", "Precio más económico", "Sencillez de funcionamiento"],
    cons: ["Necesita salida de aire al exterior", "Mayor consumo que bomba de calor"],
    ideal: "Casas con salida al exterior disponible",
    color: "#B45309",
    bg: "#FEF3C7",
    border: "#FCD34D",
  },
];

const FAQS = [
  {
    q: "¿Vale la pena pagar más por una secadora de bomba de calor?",
    a: "Sí, si la usas con frecuencia. Una secadora de bomba de calor consume entre 1,5-2 kWh por ciclo frente a los 4-5 kWh de una de condensación convencional. Con 4 ciclos semanales, el ahorro puede ser de 80-120€ al año, amortizando el extra de precio en 2-3 años.",
  },
  {
    q: "¿Qué capacidad de secadora necesito?",
    a: "La regla general es igualar o superar la capacidad de tu lavadora. Si tienes una lavadora de 8 kg, una secadora de 8-9 kg es perfecta. Las secadoras no deberían llenarse al máximo para un secado óptimo.",
  },
  {
    q: "¿Puedo usar la secadora con cualquier tipo de ropa?",
    a: "No. Revisa siempre las etiquetas: las prendas de lana, seda y algunas de algodón pueden encogerse o dañarse. La secadora es perfecta para ropa de algodón, toallas, sábanas y ropa de deporte sintética.",
  },
  {
    q: "¿La secadora necesita instalación especial?",
    a: "Las de bomba de calor y condensación solo necesitan enchufe y vaciado del depósito de agua (o desagüe). Las de ventilación necesitan una salida al exterior para evacuar el aire húmedo. En pisos, las de condensación o bomba de calor son las más prácticas.",
  },
  {
    q: "¿Qué marcas son más fiables en secadoras en 2026?",
    a: "Bosch, Siemens y Balay (grupo BSH) lideran en fiabilidad y eficiencia. AEG destaca por sus sensores de humedad avanzados. Miele es la referencia premium. LG y Samsung ofrecen buenas opciones en gama media-alta.",
  },
];

export default async function MejorSecadoraPage() {
  const secadoras = await getSecadoras();

  const serialized = secadoras.map((p) => ({
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#F59E0B] pt-16 pb-28 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#D97706] opacity-15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#B45309] opacity-10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <span>›</span>
            <Link href="/guias" className="hover:text-white/70 transition-colors">Guías</Link>
            <span>›</span>
            <span className="text-white/60">Secadoras</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="bg-[#D97706] text-white text-xs font-bold px-3 py-1 rounded-full">Guía completa</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">7 min lectura</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">Actualizado abril 2026</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                💨 Mejor Secadora<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDE68A] to-[#FED7AA]">2026</span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-xl mb-8">
                Hemos analizado más de {serialized.length > 0 ? serialized.length : "20"} modelos para ayudarte a elegir la secadora
                perfecta. Sin opiniones pagadas, con precios en tiempo real.
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
              style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.3), rgba(180,83,9,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-9xl">💨</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-14 space-y-20">

        {/* INTRO */}
        <section className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-sm">
          <p className="text-[#334155] text-base leading-relaxed">
            La secadora es un electrodoméstico que cambia radicalmente la rutina del hogar: adiós a tender ropa,
            adiós a la ropa húmeda esperando. En esta guía te explicamos <strong className="text-[#0F172A]">qué tipo elegir</strong>,
            cuánto consumen realmente y qué modelos ofrecen mejor relación calidad-precio en 2026.
          </p>
          <p className="text-[#334155] text-base leading-relaxed mt-4">
            Los precios que ves son <strong className="text-[#0F172A]">en tiempo real</strong>: los actualizamos automáticamente varias veces al día
            para que siempre veas la mejor oferta disponible.
          </p>
        </section>

        {/* TIPOS */}
        <section id="tipos">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#D97706] uppercase tracking-widest mb-2">Paso 1</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">¿Qué tipo de secadora necesitas?</h2>
            <p className="text-[#64748B]">El tipo determina el consumo, la instalación y el cuidado de la ropa.</p>
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
            <p className="text-xs font-bold text-[#D97706] uppercase tracking-widest mb-2">Paso 2</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">6 criterios clave para elegir bien</h2>
            <p className="text-[#64748B]">Los factores que más influyen en el rendimiento y el gasto real.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CRITERIOS.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex gap-4 shadow-sm hover:border-[#FDE68A] hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-[#FFFBEB] flex items-center justify-center flex-shrink-0 text-xl">
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded-full">#{i + 1}</span>
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
              <p className="text-xs font-bold text-[#D97706] uppercase tracking-widest mb-2">Paso 3</p>
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-1">Los mejores modelos ahora</h2>
              <p className="text-[#64748B] text-sm">Precios actualizados automáticamente · Ordenados por valoración</p>
            </div>
            <Link
              href="/categorias/secadoras"
              className="hidden sm:flex items-center gap-1 text-sm font-bold text-[#D97706] hover:underline whitespace-nowrap"
            >
              Ver todos →
            </Link>
          </div>

          {serialized.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serialized.map((p) => (
                <CategoryProductCard key={p.id} product={p} catColor="#D97706" catIcon="💨" />
              ))}
            </div>
          ) : (
            <div className="bg-[#FFFBEB] rounded-2xl p-10 text-center text-[#D97706]">
              <p className="text-4xl mb-3">💨</p>
              <p className="font-semibold">Cargando productos...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/categorias/secadoras"
              className="inline-flex items-center gap-2 bg-[#D97706] hover:bg-[#B45309] text-white px-8 py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-[#D97706]/25"
            >
              Ver todos los modelos →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#D97706] uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none list-none">
                  <span className="font-bold text-[#0F172A] text-sm pr-4">{q}</span>
                  <span className="w-7 h-7 rounded-full bg-[#FFFBEB] flex items-center justify-center flex-shrink-0 text-[#D97706] transition-transform duration-200 group-open:rotate-180">
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#B45309] to-[#D97706] p-10 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative">
            <span className="text-5xl mb-4 block">💨</span>
            <h3 className="text-2xl font-extrabold text-white mb-2">¿Listo para comparar precios?</h3>
            <p className="text-white/60 text-sm mb-7 max-w-md mx-auto">
              Consulta todos los modelos con precios actualizados en tiempo real. Sin registros, sin suscripciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/categorias/secadoras"
                className="bg-white text-[#D97706] font-bold px-7 py-3 rounded-2xl text-sm hover:bg-[#FFFBEB] transition-colors shadow-lg"
              >
                Ver todas las secadoras
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
