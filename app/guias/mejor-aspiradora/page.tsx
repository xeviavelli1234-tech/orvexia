export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryProductCard } from "@/components/CategoryProductCard";

export const metadata: Metadata = {
  title: "Mejor Aspiradora 2026: Guía de Compra Completa | Orvexia",
  description:
    "Analizamos las mejores aspiradoras del mercado en 2026. Comparamos robots, escobas sin cable y trineo para que elijas la que mejor se adapta a tu hogar.",
  keywords: ["mejor aspiradora 2026", "guía compra aspiradora", "aspiradora robot", "aspiradora sin cable"],
};

async function getAspiradoras() {
  return prisma.product.findMany({
    where: { category: "ASPIRADORAS" },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { rating: "desc" },
    take: 6,
  });
}

const CRITERIOS = [
  { icon: "💨", title: "Potencia de succión", desc: "Mide en Pa (pascales) en robots y en vatios/kPa en verticales. Más Pa = mejor en moquetas y alfombras." },
  { icon: "🔋", title: "Autonomía de batería", desc: "Escobas: mínimo 40 min en modo normal. Robots: 90-120 min para pisos medianos y grandes." },
  { icon: "🧹", title: "Tipo de suelo", desc: "Parquet y suelo duro: cualquier modelo. Moqueta y alfombras: necesitas mayor potencia de succión." },
  { icon: "🐾", title: "Mascotas en casa", desc: "Si tienes animales, busca modelos con cepillos anti-enredo y filtros HEPA para alérgenos." },
  { icon: "📡", title: "Navegación (robots)", desc: "Láser LiDAR es el más preciso. Cámara con IA también funciona bien. Evita robots solo con sensores infrarrojos." },
  { icon: "🧽", title: "Función de fregado", desc: "Los robots con fregado ahorran tiempo pero funcionan mejor en suelos duros planos, no en moquetas." },
];

const TIPOS = [
  {
    title: "Robot aspirador",
    emoji: "🤖",
    pros: ["Aspira solo mientras haces otras cosas", "Programa horarios desde el móvil", "Modelos con vaciado automático ya disponibles"],
    cons: ["No llega a esquinas perfectamente", "Requiere orden previo en el suelo", "Precio más elevado en gama alta"],
    ideal: "Quienes quieren automatizar la limpieza diaria",
    color: "#0369A1",
    bg: "#F0F9FF",
    border: "#BAE6FD",
  },
  {
    title: "Escoba sin cable",
    emoji: "🔵",
    pros: ["Ligera y maniobrable", "Sin cable que estorba", "Ideal para limpiezas rápidas", "Cabe en cualquier rincón"],
    cons: ["Batería limitada (30-60 min)", "Depósito pequeño"],
    ideal: "Pisos medianos o limpiezas puntuales",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    title: "Trineo con cable",
    emoji: "🟢",
    pros: ["Potencia constante sin límite de batería", "Gran capacidad de depósito", "Ideal para moquetas gruesas"],
    cons: ["Menos maniobrable", "Cable que estorba", "Más voluminoso"],
    ideal: "Casas grandes con moquetas o muchos muebles bajos",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
];

const FAQS = [
  {
    q: "¿Robot aspirador o escoba sin cable?",
    a: "Depende de tu estilo de vida. Si valoras la automatización y quieres que el suelo esté limpio sin esfuerzo diario, el robot es ideal. Si prefieres control total y limpiezas rápidas y eficaces, la escoba sin cable gana. Muchos hogares tienen los dos.",
  },
  {
    q: "¿Qué potencia de succión necesito?",
    a: "Para suelo duro (parquet, baldosa), 2000 Pa es más que suficiente en robots. Para alfombras y moquetas necesitas al menos 3000-4000 Pa en robots, o una escoba de alta potencia (150W+). Los trineo convencionales alcanzan 900-2200W de potencia eléctrica.",
  },
  {
    q: "¿Merece la pena un robot con vaciado automático?",
    a: "Si tienes mascotas o suelo que se ensucia rápido, sí. La base de vaciado automático acumula la suciedad hasta 30-60 días sin que tengas que vaciar el depósito. El precio extra suele estar entre 100-200€ respecto al modelo sin base.",
  },
  {
    q: "¿Los robots con fregado funcionan bien?",
    a: "Los modelos con fregado de 2025-2026 han mejorado mucho, especialmente los de Roborock y Dreame con levantamiento automático del mopa. Funcionan bien en suelos duros planos. En alfombras, el levantamiento automático es imprescindible.",
  },
  {
    q: "¿Qué marcas son más fiables en aspiradoras en 2026?",
    a: "Dyson es referencia en escobas sin cable. Roborock y Dreame lideran en robots calidad-precio. iRobot (Roomba) sigue siendo muy fiable. Ecovacs destaca en robots con fregado. Miele y Bosch en trineo de alta gama.",
  },
];

export default async function MejorAspiradoraPage() {
  const aspiradoras = await getAspiradoras();

  const serialized = aspiradoras.map((p) => ({
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#075985] via-[#0369A1] to-[#0284C7] pt-16 pb-28 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#0369A1] opacity-15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#075985] opacity-10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <span>›</span>
            <Link href="/guias" className="hover:text-white/70 transition-colors">Guías</Link>
            <span>›</span>
            <span className="text-white/60">Aspiradoras</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="bg-[#0369A1] text-white text-xs font-bold px-3 py-1 rounded-full">Guía completa</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">7 min lectura</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">Actualizado abril 2026</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                🌀 Mejor Aspiradora<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#BAE6FD] to-[#A5F3FC]">2026</span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-xl mb-8">
                Hemos analizado más de {serialized.length > 0 ? serialized.length : "20"} modelos para ayudarte a elegir la aspiradora
                perfecta para tu hogar. Sin opiniones pagadas, con precios en tiempo real.
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
              style={{ background: "linear-gradient(135deg, rgba(3,105,161,0.3), rgba(7,89,133,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-9xl">🌀</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-14 space-y-20">

        {/* INTRO */}
        <section className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-sm">
          <p className="text-[#334155] text-base leading-relaxed">
            El mercado de aspiradoras ha evolucionado enormemente: robots con IA, escobas con 80 min de autonomía,
            trineo ultra-silenciosos... En esta guía te explicamos <strong className="text-[#0F172A]">qué tipo elegir según tu hogar</strong> y
            cuáles son los modelos que mejor rendimiento ofrecen en 2026.
          </p>
          <p className="text-[#334155] text-base leading-relaxed mt-4">
            Los precios que ves son <strong className="text-[#0F172A]">en tiempo real</strong>: los actualizamos automáticamente varias veces al día
            para que siempre veas la mejor oferta disponible.
          </p>
        </section>

        {/* TIPOS */}
        <section id="tipos">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#0369A1] uppercase tracking-widest mb-2">Paso 1</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">¿Qué tipo de aspiradora necesitas?</h2>
            <p className="text-[#64748B]">La elección depende de tu hogar, tu estilo de vida y tu presupuesto.</p>
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
            <p className="text-xs font-bold text-[#0369A1] uppercase tracking-widest mb-2">Paso 2</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">6 criterios clave para elegir bien</h2>
            <p className="text-[#64748B]">Los factores que marcan la diferencia en el rendimiento real.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CRITERIOS.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex gap-4 shadow-sm hover:border-[#BAE6FD] hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-[#F0F9FF] flex items-center justify-center flex-shrink-0 text-xl">
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#0369A1] bg-[#F0F9FF] px-2 py-0.5 rounded-full">#{i + 1}</span>
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
              <p className="text-xs font-bold text-[#0369A1] uppercase tracking-widest mb-2">Paso 3</p>
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-1">Los mejores modelos ahora</h2>
              <p className="text-[#64748B] text-sm">Precios actualizados automáticamente · Ordenados por valoración</p>
            </div>
            <Link
              href="/categorias/aspiradoras"
              className="hidden sm:flex items-center gap-1 text-sm font-bold text-[#0369A1] hover:underline whitespace-nowrap"
            >
              Ver todos →
            </Link>
          </div>

          {serialized.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serialized.map((p) => (
                <CategoryProductCard key={p.id} product={p} catColor="#0369A1" catIcon="🌀" />
              ))}
            </div>
          ) : (
            <div className="bg-[#F0F9FF] rounded-2xl p-10 text-center text-[#0369A1]">
              <p className="text-4xl mb-3">🌀</p>
              <p className="font-semibold">Cargando productos...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/categorias/aspiradoras"
              className="inline-flex items-center gap-2 bg-[#0369A1] hover:bg-[#075985] text-white px-8 py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-[#0369A1]/25"
            >
              Ver todos los modelos →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#0369A1] uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none list-none">
                  <span className="font-bold text-[#0F172A] text-sm pr-4">{q}</span>
                  <span className="w-7 h-7 rounded-full bg-[#F0F9FF] flex items-center justify-center flex-shrink-0 text-[#0369A1] transition-transform duration-200 group-open:rotate-180">
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#075985] to-[#0369A1] p-10 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative">
            <span className="text-5xl mb-4 block">🌀</span>
            <h3 className="text-2xl font-extrabold text-white mb-2">¿Listo para comparar precios?</h3>
            <p className="text-white/60 text-sm mb-7 max-w-md mx-auto">
              Consulta todos los modelos con precios actualizados en tiempo real. Sin registros, sin suscripciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/categorias/aspiradoras"
                className="bg-white text-[#0369A1] font-bold px-7 py-3 rounded-2xl text-sm hover:bg-[#F0F9FF] transition-colors shadow-lg"
              >
                Ver todas las aspiradoras
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
