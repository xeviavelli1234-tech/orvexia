export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CategoryProductCard } from "@/components/CategoryProductCard";

export const metadata: Metadata = {
  title: "Mejor Aire Acondicionado 2026: Guía de Compra Completa | Orvexia",
  description:
    "Analizamos los mejores aires acondicionados de 2026. Split, portátil o multisplit: te explicamos potencia, eficiencia energética e instalación para que elijas el ideal.",
  keywords: ["mejor aire acondicionado 2026", "guía compra aire acondicionado", "split inverter", "aire acondicionado eficiente"],
};

async function getAires() {
  return prisma.product.findMany({
    where: { category: "AIRES_ACONDICIONADOS" },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { rating: "desc" },
    take: 6,
  });
}

const CRITERIOS = [
  { icon: "📐", title: "Potencia (frigorías)", desc: "Hasta 15 m²: 2.000 frig. · 15-25 m²: 2.500-3.000 frig. · 25-40 m²: 3.500-4.500 frig. Habitaciones con mucho sol, sube un escalón." },
  { icon: "⚡", title: "Eficiencia energética", desc: "Clase A+++ puede suponer un ahorro del 60% frente a clase A. En uso intensivo (3-4 meses/año) la diferencia es muy notable en la factura." },
  { icon: "🔄", title: "Tecnología Inverter", desc: "Imprescindible. Regula la velocidad del compresor en lugar de encenderse y apagarse. Más silencioso, más eficiente y mayor vida útil." },
  { icon: "❄️", title: "Solo frío vs Bomba de calor", desc: "Una bomba de calor también calienta en invierno con una eficiencia muy superior a cualquier calefactor eléctrico. Merece siempre la pena." },
  { icon: "🔇", title: "Nivel de ruido", desc: "Interior: busca menos de 30 dB para dormitorios. Exterior: revisa las normativas de tu comunidad (suele exigirse menos de 45 dB nocturnos)." },
  { icon: "📱", title: "WiFi y control por app", desc: "Muy útil para encender el aparato antes de llegar a casa. Verifica compatibilidad con Google Home o Alexa si tienes domótica." },
];

const TIPOS = [
  {
    title: "Split 1×1",
    emoji: "❄️",
    pros: ["Más eficiente", "Silencioso en el interior", "Mejor rendimiento a largo plazo", "Gran variedad de marcas y potencias"],
    cons: ["Requiere instalación profesional", "Obra menor necesaria"],
    ideal: "La mayoría de hogares y oficinas",
    color: "#0284C7",
    bg: "#F0F9FF",
    border: "#BAE6FD",
  },
  {
    title: "Portátil",
    emoji: "🧳",
    pros: ["Sin instalación", "Se mueve entre habitaciones", "Precio inicial más bajo"],
    cons: ["Mucho más ruidoso", "Menos eficiente", "Necesita salida de aire al exterior"],
    ideal: "Alquiler o uso puntual",
    color: "#0369A1",
    bg: "#E0F2FE",
    border: "#BAE6FD",
  },
  {
    title: "Multisplit",
    emoji: "🏠",
    pros: ["Un solo compresor para varios ambientes", "Ahorro de espacio exterior", "Control independiente por zona"],
    cons: ["Instalación más cara y compleja", "Si falla el exterior, toda la casa pierde frío"],
    ideal: "Casas o pisos grandes con varias estancias",
    color: "#0891B2",
    bg: "#ECFEFF",
    border: "#A5F3FC",
  },
];

const FAQS = [
  {
    q: "¿Cuántas frigorías necesito para mi habitación?",
    a: "Regla rápida: multiplica los m² por 100 y obtienes las frigorías necesarias en condiciones normales. Una habitación de 20 m² necesita unas 2.000 frig. Si tiene mucho sol o techos altos, sube a 2.500 frig.",
  },
  {
    q: "¿Vale la pena una bomba de calor frente a uno solo frío?",
    a: "Sí, casi siempre. Una bomba de calor calienta produciendo entre 3 y 5 veces más energía de la que consume. Comparado con radiadores eléctricos (eficiencia 1:1) o gas (1:0,9), el ahorro en invierno es muy significativo.",
  },
  {
    q: "¿Qué diferencia hay entre Inverter y no Inverter?",
    a: "Un equipo no Inverter enciende y apaga el compresor al 100% constantemente. El Inverter varía la velocidad para mantener la temperatura de forma continua. Resultado: hasta un 35% menos de consumo, menos ruido y mayor durabilidad.",
  },
  {
    q: "¿Cuánto cuesta instalar un split?",
    a: "Una instalación estándar (hasta 3 metros de tuberías) cuesta entre 150-300€. Si necesitas más metros de tuberías, pasar por paredes o trabajar en altura, el precio sube. Pide siempre presupuesto a un técnico certificado.",
  },
  {
    q: "¿Qué marcas son más fiables en 2026?",
    a: "Las más valoradas por fiabilidad y servicio técnico: Daikin, Mitsubishi Electric y Fujitsu en gama alta. LG, Samsung y Panasonic en gama media. Hisense y Bosch ofrecen buena relación calidad-precio. Evita marcas sin servicio técnico oficial en España.",
  },
];

export default async function MejorAireAcondicionadoPage() {
  const aires = await getAires();

  const serialized = aires.map((p) => ({
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082F49] via-[#0C4A6E] to-[#0284C7] pt-16 pb-28 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#0EA5E9] opacity-15 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#0369A1] opacity-10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white/70 transition-colors">Inicio</Link>
            <span>›</span>
            <Link href="/guias" className="hover:text-white/70 transition-colors">Guías</Link>
            <span>›</span>
            <span className="text-white/60">Aire acondicionado</span>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="bg-[#0284C7] text-white text-xs font-bold px-3 py-1 rounded-full">Guía completa</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">7 min lectura</span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-white/50 text-xs">Actualizado abril 2026</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                ❄️ Mejor Aire<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7DD3FC] to-[#38BDF8]">Acondicionado 2026</span>
              </h1>
              <p className="text-white/65 text-base leading-relaxed max-w-xl mb-8">
                Hemos analizado más de {serialized.length > 0 ? serialized.length : "20"} modelos para ayudarte a elegir el aire acondicionado
                ideal. Sin opiniones pagadas, con precios en tiempo real.
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
              style={{ background: "linear-gradient(135deg, rgba(2,132,199,0.3), rgba(14,165,233,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-9xl">❄️</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-14 space-y-20">

        {/* INTRO */}
        <section className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-sm">
          <p className="text-[#334155] text-base leading-relaxed">
            Con las temperaturas cada vez más extremas, el aire acondicionado ha pasado de ser un lujo a una necesidad en muchos hogares españoles.
            Pero elegir mal puede costarte cientos de euros al año en electricidad o dejarte con un equipo que no refresca bien tu espacio.
          </p>
          <p className="text-[#334155] text-base leading-relaxed mt-4">
            En esta guía te explicamos <strong className="text-[#0F172A]">qué mirar realmente</strong> antes de comprar un split:
            potencia, eficiencia, tipo de instalación y qué marcas ofrecen mejor relación calidad-precio en 2026.
            Los precios se actualizan en tiempo real varias veces al día.
          </p>
        </section>

        {/* TIPOS */}
        <section id="tipos">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#0284C7] uppercase tracking-widest mb-2">Paso 1</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">¿Qué tipo de aire necesitas?</h2>
            <p className="text-[#64748B]">El tipo correcto depende de tu vivienda y si puedes hacer instalación.</p>
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
            <p className="text-xs font-bold text-[#0284C7] uppercase tracking-widest mb-2">Paso 2</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">6 criterios clave para elegir bien</h2>
            <p className="text-[#64748B]">Los factores que más influyen en el rendimiento y el consumo.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CRITERIOS.map((c, i) => (
              <div key={c.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex gap-4 shadow-sm hover:border-[#BAE6FD] hover:shadow-md transition-all duration-200">
                <div className="w-11 h-11 rounded-2xl bg-[#F0F9FF] flex items-center justify-center flex-shrink-0 text-xl">
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#0284C7] bg-[#F0F9FF] px-2 py-0.5 rounded-full">#{i + 1}</span>
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
              <p className="text-xs font-bold text-[#0284C7] uppercase tracking-widest mb-2">Paso 3</p>
              <h2 className="text-3xl font-extrabold text-[#0F172A] mb-1">Los mejores modelos ahora</h2>
              <p className="text-[#64748B] text-sm">Precios actualizados automáticamente · Ordenados por valoración</p>
            </div>
            <Link
              href="/categorias/aires_acondicionados"
              className="hidden sm:flex items-center gap-1 text-sm font-bold text-[#0284C7] hover:underline whitespace-nowrap"
            >
              Ver todos →
            </Link>
          </div>

          {serialized.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serialized.map((p) => (
                <CategoryProductCard key={p.id} product={p} catColor="#0284C7" catIcon="❄️" />
              ))}
            </div>
          ) : (
            <div className="bg-[#F0F9FF] rounded-2xl p-10 text-center text-[#0284C7]">
              <p className="text-4xl mb-3">❄️</p>
              <p className="font-semibold">Cargando productos...</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/categorias/aires_acondicionados"
              className="inline-flex items-center gap-2 bg-[#0284C7] hover:bg-[#0369A1] text-white px-8 py-3 rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-[#0284C7]/25"
            >
              Ver todos los modelos →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="preguntas">
          <div className="mb-8">
            <p className="text-xs font-bold text-[#0284C7] uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-3xl font-extrabold text-[#0F172A]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer select-none list-none">
                  <span className="font-bold text-[#0F172A] text-sm pr-4">{q}</span>
                  <span className="w-7 h-7 rounded-full bg-[#F0F9FF] flex items-center justify-center flex-shrink-0 text-[#0284C7] transition-transform duration-200 group-open:rotate-180">
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0C4A6E] to-[#0284C7] p-10 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl" />
          </div>
          <div className="relative">
            <span className="text-5xl mb-4 block">❄️</span>
            <h3 className="text-2xl font-extrabold text-white mb-2">¿Listo para comparar precios?</h3>
            <p className="text-white/60 text-sm mb-7 max-w-md mx-auto">
              Consulta todos los modelos con precios actualizados en tiempo real. Sin registros, sin suscripciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/categorias/aires_acondicionados"
                className="bg-white text-[#0284C7] font-bold px-7 py-3 rounded-2xl text-sm hover:bg-[#F0F9FF] transition-colors shadow-lg"
              >
                Ver todos los aires
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
