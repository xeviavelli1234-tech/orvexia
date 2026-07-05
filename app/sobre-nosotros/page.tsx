import type { Metadata } from "next";
import Link from "next/link";
import { SectionChip, AudienceLabel } from "@/app/_components/SectionPrimitives";

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
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Precios en tiempo real",
    desc: "Actualizamos los precios periódicamente desde las principales tiendas para que siempre veas la oferta más reciente antes de comprar.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Comunidad real",
    desc: "Detrás de cada análisis hay personas reales que han comprado, probado y opinado. La comunidad es el corazón de Orvexia.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Solo España",
    desc: "Nos especializamos en el mercado español. Los precios, tiendas y disponibilidad que ves son reales para compradores en España.",
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
    <main className="min-h-screen bg-[#050310] text-white/90">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.05]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-44 left-1/2 h-[480px] w-[1000px] -translate-x-1/2 rounded-full halo-breathe"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.2), transparent 70%)" }}
        />
        <div className="reveal relative mx-auto max-w-3xl px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
          <SectionChip label="Comparador independiente" />
          <h1
            className="mt-7 mb-5 font-extrabold tracking-tight text-white"
            style={{ fontSize: "clamp(2.4rem, 5.6vw, 4.2rem)", lineHeight: 1.03, letterSpacing: "-0.04em", textWrap: "balance" }}
          >
            Sobre Orvexia
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>
            Somos un comparador de electrodomésticos independiente. Nuestro objetivo es uno:
            ayudarte a tomar la mejor decisión de compra con información honesta y precios reales.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 space-y-20">

        {/* Quiénes somos */}
        <section className="reveal">
          <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-white">¿Quiénes somos?</h2>
          <div className="max-w-none space-y-4 text-[15px] leading-relaxed text-white/65">
            <p>
              Orvexia nació de una frustración muy concreta: comprar un electrodoméstico en España es
              más difícil de lo que debería. Los comparadores genéricos mezclan categorías sin criterio,
              los precios que muestran a menudo están desactualizados y los &ldquo;análisis&rdquo; son en realidad
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

        {/* Nuestras dos actividades */}
        <section className="reveal">
          <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-white">Nuestras dos actividades</h2>
          <p className="mb-6 text-white/60">
            Orvexia opera dos actividades complementarias pero independientes entre sí.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Comparador público</p>
              <p className="mb-2 font-bold text-white">Comparador público de precios</p>
              <p className="text-sm leading-relaxed text-white/60">
                <strong className="text-white/80">orvexia.es</strong> — comparador independiente de electrodomésticos con enlaces de
                afiliados a Amazon, PcComponentes, El Corte Inglés y Fnac. Cualquier visitante puede consultar
                precios, guías y comparativas sin registro.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Tienda propia</p>
              <p className="mb-2 font-bold text-white">Tienda propia en Amazon (OrvexiaShop)</p>
              <p className="text-sm leading-relaxed text-white/60">
                Vendemos electrodomésticos directamente como vendedor en Amazon España bajo la marca
                <strong className="text-white/80"> OrvexiaShop</strong>. Para gestionar nuestro catálogo utilizamos la
                <strong className="text-white/80"> Selling Partner API (SP-API) de Amazon</strong> de forma estrictamente privada y
                únicamente sobre nuestra propia cuenta de vendedor: importamos nuestros listings,
                consultamos el precio competitivo y ajustamos automáticamente el precio dentro de un rango
                mín/máx que definimos manualmente.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-brand-400/20 bg-brand-400/[0.05] p-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Aislamiento de datos</p>
            <p className="text-sm leading-relaxed text-white/75">
              Las dos actividades están <strong className="text-white">aisladas técnica y operativamente</strong>. Los datos obtenidos
              de Amazon SP-API <strong className="text-white">nunca</strong> se utilizan en el comparador público, no se comparten con
              terceros y no se cruzan con datos de usuarios. El comparador público no consume SP-API: los
              precios de Amazon que se muestran ahí proceden del programa de afiliados (Product Advertising API
              y enlaces públicos), no de SP-API.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Para más detalle consulta nuestra{" "}
              <Link href="/politica-datos-amazon" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
                Política de Protección de Datos de Amazon
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="reveal grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-center transition-colors hover:border-brand-400/30">
              <p className="mb-1 text-3xl font-extrabold tabular text-brand-300">{s.value}</p>
              <p className="text-xs leading-snug text-white/50">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Cómo funciona */}
        <section className="reveal">
          <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-white">Cómo funciona Orvexia</h2>
          <p className="mb-8 text-white/60">
            Comparamos precios en tiempo real de las principales tiendas españolas para que siempre
            veas el mejor precio disponible.
          </p>
          <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07] bg-white/[0.02]">
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
              <div key={step.n} className="flex items-start gap-5 p-6">
                <span className="mt-0.5 flex-shrink-0 rounded-lg border border-brand-400/25 bg-brand-400/10 px-2.5 py-1.5 text-xs font-black tabular text-brand-200">
                  {step.n}
                </span>
                <div>
                  <p className="mb-1 font-bold text-white">{step.title}</p>
                  <p className="text-sm leading-relaxed text-white/60">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Valores */}
        <section className="reveal">
          <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-white">Nuestros principios</h2>
          <p className="mb-8 text-white/60">Lo que nos guía en cada decisión que tomamos.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/30">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-400/10 text-brand-300">
                  {v.icon}
                </span>
                <div>
                  <p className="mb-1 font-bold text-white">{v.title}</p>
                  <p className="text-sm leading-relaxed text-white/60">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tiendas */}
        <section className="reveal">
          <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-white">Tiendas que comparamos</h2>
          <p className="mb-6 text-white/60">
            Trabajamos con las principales tiendas de tecnología y electrodomésticos en España.
          </p>
          <div className="flex flex-wrap gap-3">
            {STORES.map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2 text-sm font-semibold text-white/75 transition-colors hover:border-brand-400/30 hover:text-white"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Transparencia afiliados */}
        <section className="reveal rounded-2xl border border-brand-400/20 bg-brand-400/[0.05] p-6">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 text-xl">💡</span>
            <div>
              <p className="mb-2 font-bold text-white">Transparencia sobre enlaces de afiliados</p>
              <p className="text-sm leading-relaxed text-white/65">
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
        <section className="reveal text-center">
          <AudienceLabel label="Contacto" />
          <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-white">¿Tienes alguna pregunta?</h2>
          <p className="mx-auto mb-7 max-w-lg text-white/60">
            Si eres una marca, tienda o afiliado y quieres ponerte en contacto con nosotros, escríbenos.
            También atendemos sugerencias de usuarios.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/guias"
              className="shine-on-hover inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-7 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:shadow-[0_0_48px_-4px_rgba(129,140,248,0.9)] active:scale-[0.97]"
              style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
            >
              Ver guías de compra
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-7 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
            >
              Comparar electrodomésticos
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
