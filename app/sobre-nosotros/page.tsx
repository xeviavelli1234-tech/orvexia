import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre Nosotros | Orvexia",
  description:
    "Conoce el equipo detrás de Orvexia: el comparador de electrodomésticos más honesto de España. Sin publicidad, sin patrocinios. Solo análisis reales.",
};

const VALUES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Honestidad ante todo",
    desc: "No aceptamos pagos por posiciones. El orden de nuestras recomendaciones lo dictan el precio y las valoraciones reales, no acuerdos comerciales.",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Precios en tiempo real",
    desc: "Actualizamos los precios periódicamente desde las principales tiendas para que siempre veas la oferta más reciente antes de comprar.",
    color: "#0891B2",
    bg: "#E0F7FA",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Comunidad real",
    desc: "Detrás de cada análisis hay personas reales que han comprado, probado y opinado. La comunidad es el corazón de Orvexia.",
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Solo España",
    desc: "Nos especializamos en el mercado español. Los precios, tiendas y disponibilidad que ves son reales para compradores en España.",
    color: "#DC2626",
    bg: "#FEF2F2",
  },
];

const STATS = [
  { value: "10+", label: "Categorías de electrodomésticos" },
  { value: "2026", label: "Guías actualizadas este año" },
  { value: "4", label: "Tiendas comparadas" },
  { value: "100%", label: "Gratuito para el usuario" },
];

const STORES = ["Amazon", "PcComponentes", "El Corte Inglés", "Fnac"];

export default function SobreNosotrosPage() {
  return (
    <main className="bg-[#F8FAFC]">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] pt-16 pb-20 px-6 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#4F46E5] opacity-10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-[#7C3AED] opacity-10 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs text-white/70 font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] inline-block" />
            Comparador independiente
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-5 tracking-tight leading-tight">
            Sobre{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#60A5FA]">
              Orvexia
            </span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
            Somos un comparador de electrodomésticos independiente. Nuestro objetivo es uno:
            ayudarte a tomar la mejor decisión de compra con información honesta y precios reales.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">

        {/* Quiénes somos */}
        <section>
          <h2 className="text-2xl font-extrabold text-[#0F172A] mb-4">¿Quiénes somos?</h2>
          <div className="prose prose-slate max-w-none text-[#475569] leading-relaxed space-y-4">
            <p>
              Orvexia nació de una frustración muy concreta: comprar un electrodoméstico en España es
              más difícil de lo que debería. Los comparadores genéricos mezclan categorías sin criterio,
              los precios que muestran a menudo están desactualizados y los "análisis" son en realidad
              artículos de afiliados escritos sin haber tocado el producto.
            </p>
            <p>
              Decidimos construir algo diferente: un comparador especializado únicamente en
              electrodomésticos y tecnología de hogar, con precios actualizados de las principales
              tiendas españolas, guías de compra escritas de verdad y una comunidad donde los usuarios
              comparten experiencias reales.
            </p>
            <p>
              No somos una gran empresa ni un medio de comunicación. Somos un equipo pequeño con un
              propósito claro: que el dinero que gastas en tu próxima lavadora, televisor o frigorífico
              sea una decisión informada, no un salto de fe.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 text-center">
              <p className="text-3xl font-extrabold text-[#4F46E5] mb-1">{s.value}</p>
              <p className="text-xs text-[#64748B] leading-snug">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Cómo funciona */}
        <section>
          <h2 className="text-2xl font-extrabold text-[#0F172A] mb-2">Cómo funciona Orvexia</h2>
          <p className="text-[#64748B] mb-8">
            Comparamos precios en tiempo real de las principales tiendas españolas para que siempre
            veas el mejor precio disponible.
          </p>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] divide-y divide-[#F1F5F9]">
            {[
              {
                n: "01",
                title: "Rastreamos precios automáticamente",
                desc: "Nuestro sistema actualiza los precios de forma periódica en Amazon, PcComponentes, El Corte Inglés y Fnac para que la información sea siempre actual.",
              },
              {
                n: "02",
                title: "Filtramos descuentos reales",
                desc: "Aplicamos criterios estrictos para mostrar solo bajadas de precio genuinas. Ignoramos inflaciones de PVPR artificiales y descuentos de céntimos.",
              },
              {
                n: "03",
                title: "Guías escritas por personas",
                desc: "Nuestras guías de compra las redactamos con criterio técnico real: explicamos qué importa y qué no antes de que abras la cartera.",
              },
              {
                n: "04",
                title: "La comunidad completa el cuadro",
                desc: "Las valoraciones y experiencias de usuarios reales complementan nuestros análisis. Nadie sabe mejor cómo funciona una lavadora que quien la usa a diario.",
              },
            ].map((step) => (
              <div key={step.n} className="flex gap-5 p-6 items-start">
                <span className="text-xs font-black text-[#4F46E5] bg-[#EEF2FF] rounded-lg px-2.5 py-1.5 flex-shrink-0 mt-0.5">
                  {step.n}
                </span>
                <div>
                  <p className="font-bold text-[#0F172A] mb-1">{step.title}</p>
                  <p className="text-sm text-[#64748B] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Valores */}
        <section>
          <h2 className="text-2xl font-extrabold text-[#0F172A] mb-2">Nuestros principios</h2>
          <p className="text-[#64748B] mb-8">Lo que nos guía en cada decisión que tomamos.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex gap-4 items-start">
                <span
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: v.bg, color: v.color }}
                >
                  {v.icon}
                </span>
                <div>
                  <p className="font-bold text-[#0F172A] mb-1">{v.title}</p>
                  <p className="text-sm text-[#64748B] leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tiendas */}
        <section>
          <h2 className="text-2xl font-extrabold text-[#0F172A] mb-2">Tiendas que comparamos</h2>
          <p className="text-[#64748B] mb-6">
            Trabajamos con las principales tiendas de tecnología y electrodomésticos en España.
          </p>
          <div className="flex flex-wrap gap-3">
            {STORES.map((s) => (
              <span
                key={s}
                className="bg-white border border-[#E2E8F0] rounded-full px-5 py-2 text-sm font-semibold text-[#334155]"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Transparencia afiliados */}
        <section className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-6">
          <div className="flex gap-3 items-start">
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <p className="font-bold text-[#92400E] mb-2">Transparencia sobre enlaces de afiliados</p>
              <p className="text-sm text-[#78350F] leading-relaxed">
                Orvexia incluye enlaces de afiliados de Amazon, PcComponentes, El Corte Inglés y Fnac.
                Cuando compras a través de ellos podemos recibir una pequeña comisión por la venta.
                Esto no supone ningún coste adicional para ti y nos ayuda a mantener el servicio gratuito.
                El orden de los resultados y el contenido de nuestras guías no están influenciados por
                estos acuerdos comerciales.
              </p>
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section className="text-center">
          <h2 className="text-2xl font-extrabold text-[#0F172A] mb-3">¿Tienes alguna pregunta?</h2>
          <p className="text-[#64748B] mb-6 max-w-lg mx-auto">
            Si eres una marca, tienda o afiliado y quieres ponerte en contacto con nosotros, escríbenos.
            También atendemos sugerencias de usuarios.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/guias"
              className="inline-flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Ver guías de compra
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] font-bold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Comparar electrodomésticos
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
