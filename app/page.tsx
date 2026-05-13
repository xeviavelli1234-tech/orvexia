export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { HeroSearch } from "@/components/HeroSearch";

async function getTopDeals() {
  const products = await prisma.product.findMany({
    where: { offers: { some: { priceOld: { not: null }, inStock: true } } },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
  });

  const sorted = products
    .filter((p) => {
      const o = p.offers[0];
      if (!o?.priceOld || !o.inStock) return false;
      const savings = o.priceOld - o.priceCurrent;
      const ratio = o.priceOld / o.priceCurrent;
      return (
        o.priceCurrent < o.priceOld &&
        ratio <= 2.5 &&
        savings >= 3 &&
        savings / o.priceOld >= 0.03
      );
    })
    .sort((a, b) => {
      const savA = (a.offers[0].priceOld ?? 0) - a.offers[0].priceCurrent;
      const savB = (b.offers[0].priceOld ?? 0) - b.offers[0].priceCurrent;
      return savB - savA;
    });

  // Diversificar por categoría: máximo 2 por categoría en el top 8.
  // Sin esto el grid lo monopolizan TVs OLED premium porque su ahorro
  // absoluto en € siempre vence al de electrodomésticos pequeños.
  const MAX_PER_CATEGORY = 2;
  const counts: Record<string, number> = {};
  const diversified: typeof sorted = [];
  for (const p of sorted) {
    if ((counts[p.category] ?? 0) >= MAX_PER_CATEGORY) continue;
    counts[p.category] = (counts[p.category] ?? 0) + 1;
    diversified.push(p);
    if (diversified.length >= 8) break;
  }

  // Si por la diversificación no se llenan los 8 huecos (poca oferta),
  // rellenar con el resto sorted respetando el orden por ahorro.
  if (diversified.length < 8) {
    const seen = new Set(diversified.map((p) => p.id));
    for (const p of sorted) {
      if (seen.has(p.id)) continue;
      diversified.push(p);
      if (diversified.length >= 8) break;
    }
  }

  return diversified;
}

async function getStats() {
  const [productCount, withDiscount, stores] = await Promise.all([
    prisma.product.count(),
    prisma.offer.count({ where: { discountPercent: { gt: 0 }, priceOld: { not: null } } }),
    prisma.offer.findMany({ distinct: ["store"], select: { store: true } }),
  ]);
  return { productCount, withDiscount, storeCount: stores.length };
}

const CATEGORIES = [
  { key: "TELEVISORES",          label: "Televisores",  icon: "📺", accent: "var(--brand-500)" },
  { key: "LAVADORAS",            label: "Lavadoras",    icon: "🫧", accent: "#8B5CF6" },
  { key: "FRIGORIFICOS",         label: "Frigoríficos", icon: "🧊", accent: "#06B6D4" },
  { key: "LAVAVAJILLAS",         label: "Lavavajillas", icon: "🍽️", accent: "var(--accent-500)" },
  { key: "SECADORAS",            label: "Secadoras",    icon: "💨", accent: "var(--warn-500)" },
  { key: "HORNOS",               label: "Hornos",       icon: "🔥", accent: "var(--danger-500)" },
  { key: "CAFETERAS",            label: "Cafeteras",    icon: "☕", accent: "#D97706" },
  { key: "AIRES_ACONDICIONADOS", label: "Aire acond.",  icon: "❄️", accent: "#0EA5E9" },
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Busca",
    desc: "Escribe el electrodoméstico y compara precios al instante en las principales tiendas.",
    accent: "var(--brand-500)",
    bg: "var(--brand-50)",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Compara",
    desc: "Ve el historial de precios, detecta el mejor momento y elige la tienda más económica.",
    accent: "#8B5CF6",
    bg: "#F5F3FF",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 17v-5M12 17V8M17 17v-3" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Ahorra",
    desc: "Compra directamente en la tienda al mejor precio. Sin intermediarios, sin comisiones.",
    accent: "var(--accent-500)",
    bg: "var(--accent-50)",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
  },
];

const REGISTER_PERKS: { title: string; desc: string; accent: string; icon: React.ReactNode }[] = [
  {
    title: "Favoritos con historial",
    desc: "Guarda productos y consulta su evolución de precio en un panel limpio.",
    accent: "#818CF8",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 17-5.09 2.674 1-5.829-4.24-4.136 5.86-.852L12 3l2.47 5.857 5.86.852-4.24 4.136 1 5.829z" />
      </svg>
    ),
  },
  {
    title: "Alertas de precio",
    desc: "Pon tu precio objetivo y te avisamos por email cuando una tienda lo rebaje.",
    accent: "#FBBF24",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    title: "Notificaciones de oferta",
    desc: "Guarda un producto sin descuento y te avisamos cuando entre en oferta o baje de precio.",
    accent: "var(--accent-300)",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Comparativas privadas",
    desc: "Crea listas con las tiendas más baratas y compártelas con quien quieras.",
    accent: "#C084FC",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" />
      </svg>
    ),
  },
];

const STORES = ["Amazon", "PcComponentes", "Fnac", "El Corte Inglés"];

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "¿Cuánto cuesta usar Orvexia?",
    a: "Es 100% gratis. No pagas por buscar, comparar precios ni por las alertas. Si compras a través de un enlace nuestro la tienda nos paga una pequeña comisión, pero el precio que ves es exactamente el que pagas: no se aplica ningún recargo.",
  },
  {
    q: "¿De dónde salen los precios y cada cuánto se actualizan?",
    a: "Sincronizamos con los feeds oficiales de cada tienda y revisamos los catálogos varias veces al día. En la ficha de cada producto verás el gráfico con los últimos 90 días y el momento exacto de la última actualización.",
  },
  {
    q: "¿En qué tiendas comparáis?",
    a: "Hoy comparamos en Amazon, PcComponentes, Fnac y El Corte Inglés, las cuatro principales del mercado español de electrodomésticos. Iremos sumando más tiendas a medida que validemos su catálogo y la fiabilidad de sus precios.",
  },
  {
    q: "¿Cómo funcionan las alertas de precio?",
    a: (
      <>
        Guarda un producto, define el precio al que comprarías y te avisamos por email en cuanto cualquier tienda lo iguale o baje. Sin spam: solo recibes emails de las alertas que tú activas y puedes desactivarlas en un clic desde tu{" "}
        <Link href="/dashboard" className="font-semibold text-brand-600 hover:text-brand-700 underline decoration-dotted underline-offset-2">
          panel
        </Link>
        .
      </>
    ),
  },
  {
    q: "¿Vuestras recomendaciones son neutrales?",
    a: "Sí. El orden lo calcula nuestro algoritmo a partir de precio actual, valoraciones de compradores reales y descuento verificado contra el histórico de los últimos 90 días. La comisión que recibimos es la misma sea cual sea la tienda en la que termines comprando, así que no tenemos incentivo para empujarte hacia una concreta.",
  },
  {
    q: "He visto un precio mal o un producto agotado, ¿qué hago?",
    a: (
      <>
        Escríbenos a{" "}
        <a href="mailto:orvexiaesp@gmail.com" className="font-semibold text-brand-600 hover:text-brand-700 underline decoration-dotted underline-offset-2">
          orvexiaesp@gmail.com
        </a>{" "}
        con el enlace del producto. Revisamos cada caso el mismo día. Nuestra obsesión es que el precio que muestras coincida con el que pagas en la tienda.
      </>
    ),
  },
];

export default async function HomePage() {
  const [productos, stats] = await Promise.all([getTopDeals(), getStats()]);

  return (
    <main className="bg-bg min-h-screen">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden isolate" style={{ backgroundColor: "#05060B" }}>

        {/* Mesh gradient + grid */}
        <div className="absolute inset-0 pointer-events-none -z-0">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] rounded-full opacity-80"
            style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.30) 0%, rgba(139,92,246,0.12) 30%, transparent 65%)" }}
          />
          <div
            className="absolute top-1/3 -right-40 w-[700px] h-[700px] rounded-full opacity-60"
            style={{ background: "radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 60%)" }}
          />
          <div
            className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full opacity-60"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 60%)" }}
          />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            }}
          />
        </div>

        <div className="relative px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-4xl mx-auto text-center">

            {/* Live badge */}
            <div className="inline-flex items-center gap-2 mb-8 px-3.5 h-7 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-white/60">
                Precios actualizados en tiempo real
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-extrabold mb-6 text-white"
              style={{
                fontSize: "clamp(2.6rem, 7vw, 5.5rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.045em",
              }}
            >
              Compara precios.
              <br />
              <span className="text-gradient-brand">Ahorra siempre.</span>
            </h1>

            <p
              className="mb-10 max-w-xl mx-auto leading-relaxed text-white/55"
              style={{ fontSize: "clamp(0.95rem, 1.2vw, 1.05rem)" }}
            >
              Monitorizamos precios en las principales tiendas de España para que compres siempre en el momento y al precio correcto.
            </p>

            {/* Search */}
            <div className="mb-10 max-w-2xl mx-auto">
              <HeroSearch />
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-8">
              {[
                { value: stats.productCount.toLocaleString("es-ES"), label: "productos" },
                { value: stats.withDiscount.toLocaleString("es-ES"), label: "con descuento" },
                { value: stats.storeCount, label: "tiendas" },
              ].map(({ value, label }, i) => (
                <div key={label} className="flex items-center gap-2.5">
                  {i > 0 && <span className="hidden sm:inline-block w-px h-4 bg-white/10" />}
                  <span className="font-extrabold tabular text-white text-xl tracking-tight">{value}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{label}</span>
                </div>
              ))}
            </div>

            {/* Store pills */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] mr-1 text-white/30">
                Comparamos en
              </span>
              {STORES.map((s) => (
                <span
                  key={s}
                  className="text-[11px] font-medium px-3 h-7 inline-flex items-center rounded-full text-white/55 border border-white/[0.08] bg-white/[0.02]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pt-14 sm:pt-20 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 text-brand-600">Explorar</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fg">Categorías</h2>
            </div>
            <Link
              href="/categorias"
              className="inline-flex items-center gap-1 text-xs font-bold px-4 h-9 rounded-full text-brand-700 border border-brand-100 bg-brand-50 hover:bg-brand-100 transition-all"
            >
              Ver todas
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                href={`/categorias?cat=${cat.key}`}
                className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-bg-elevated border border-border hover:border-border-strong hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200"
                  style={{ background: `color-mix(in srgb, ${cat.accent} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${cat.accent} 18%, transparent)` }}
                >
                  {cat.icon}
                </div>
                <span className="text-[11px] font-bold text-center leading-tight text-fg-muted group-hover:text-fg transition-colors">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP DEALS ──────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 text-hot-600">
                Mejor precio ahora
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fg">Ofertas destacadas</h2>
            </div>
            <Link
              href="/ofertas-destacadas"
              className="inline-flex items-center gap-1 text-xs font-bold px-4 h-9 rounded-full text-hot-700 border border-hot-100 bg-hot-50 hover:bg-hot-100 transition-all"
            >
              Ver todas
              <span aria-hidden>→</span>
            </Link>
          </div>

          {productos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl bg-bg-elevated border border-border">
              <span className="text-4xl mb-3">📦</span>
              <p className="text-sm font-medium text-fg-subtle">Todavía no hay productos. Vuelve pronto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {productos.map((producto, i) => (
                <ProductCard key={producto.id} product={producto} priority={i === 0} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14 sm:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-brand-600">Simple y rápido</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-fg">¿Cómo funciona?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.n}
                className="group relative p-7 rounded-2xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-bg-elevated border border-border"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: step.bg, color: step.accent, border: `1px solid color-mix(in srgb, ${step.accent} 20%, transparent)` }}
                  >
                    {step.icon}
                  </div>
                  <span
                    className="font-black text-3xl leading-none tracking-tighter tabular"
                    style={{ color: `color-mix(in srgb, ${step.accent} 25%, transparent)` }}
                  >
                    {step.n}
                  </span>
                </div>
                <h3 className="text-base font-extrabold mb-2 text-fg tracking-tight">{step.title}</h3>
                <p className="text-sm leading-relaxed text-fg-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGISTER PERKS ──────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14 sm:py-16">
        <div className="max-w-7xl mx-auto">
          <div
            className="relative overflow-hidden rounded-3xl p-px"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(139,92,246,0.25) 50%, rgba(16,185,129,0.25) 100%)" }}
          >
            <div
              className="relative rounded-[calc(1.5rem-1px)] overflow-hidden"
              style={{ background: "linear-gradient(150deg, #0c0c1a 0%, #0a0a14 50%, #080d10 100%)" }}
            >
              <div
                className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)" }}
              />
              <div
                className="pointer-events-none absolute -bottom-20 -left-20 w-60 h-60 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)" }}
              />

              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="p-8 sm:p-10 lg:p-14 flex flex-col justify-between gap-8">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] mb-7 px-3 h-7 rounded-full bg-white/[0.06] border border-white/[0.10] text-white/70">
                      <span className="w-1 h-1 rounded-full bg-brand-300" />
                      Al registrarte obtienes
                    </span>
                    <h2
                      className="font-extrabold leading-[1.1] mb-5 tracking-tight text-white"
                      style={{ fontSize: "clamp(1.7rem, 3vw, 2.4rem)" }}
                    >
                      Un panel pensado<br />para ahorrar dinero.
                    </h2>
                    <p className="text-sm leading-relaxed text-white/55 max-w-md">
                      Seguimiento, alertas y comparativas privadas para comprar en el momento exacto y al mejor precio.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center font-bold px-6 h-12 rounded-xl text-sm bg-bg-elevated text-fg-strong hover:bg-white/90 transition-all active:scale-[0.97] shadow-lg"
                    >
                      Crear cuenta gratis
                    </Link>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center justify-center font-semibold px-6 h-12 rounded-xl text-sm text-white/70 hover:text-white border border-white/15 hover:border-white/30 hover:bg-white/[0.04] transition-all active:scale-[0.97]"
                    >
                      Ver el panel en vivo
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px lg:border-l border-white/10">
                  {REGISTER_PERKS.map((perk) => (
                    <div
                      key={perk.title}
                      className="group p-6 transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-center gap-2.5 mb-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${perk.accent}1A`, color: perk.accent, border: `1px solid ${perk.accent}30` }}
                        >
                          {perk.icon}
                        </div>
                        <h3 className="text-[13px] font-bold text-white">{perk.title}</h3>
                      </div>
                      <p className="text-[12px] leading-relaxed text-white/45">{perk.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RECOMENDADOS ───────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-14 sm:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] mb-6 px-3 h-7 rounded-full text-amber-700 bg-amber-50 border border-amber-100">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 pulse-dot" />
                Selección inteligente
              </span>
              <h2
                className="font-extrabold leading-[1.1] mb-4 tracking-tight text-fg"
                style={{ fontSize: "clamp(1.7rem, 2.5vw, 2.2rem)" }}
              >
                Productos elegidos por calidad y precio, no por publicidad.
              </h2>
              <p className="text-sm leading-relaxed mb-7 text-fg-muted max-w-md">
                El algoritmo cruza valoraciones reales de compradores con los descuentos verificados del momento. Si tienes cuenta, aprende de tus favoritos y te sugiere productos de las categorías que más te interesan.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/recomendados"
                  className="inline-flex items-center justify-center font-bold px-6 h-11 rounded-xl text-sm bg-fg-strong text-bg hover:opacity-90 transition-all active:scale-[0.97]"
                >
                  Ver mis recomendados
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {[
                {
                  accent: "#7C3AED",
                  bg: "#F5F3FF",
                  border: "#DDD6FE",
                  title: "Rating ≥ 4.3 con +100 reseñas",
                  desc: "Solo aparecen productos con valoraciones sólidas de compradores verificados, sin inflados.",
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                  ),
                },
                {
                  accent: "var(--accent-500)",
                  bg: "var(--accent-50)",
                  border: "var(--accent-100)",
                  title: "Descuentos reales verificados",
                  desc: "Cruzamos el historial de precios para distinguir descuentos genuinos de precios inflados.",
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-5 rounded-2xl bg-bg-elevated border border-border hover:border-border-strong transition-all">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: item.bg, color: item.accent, border: `1px solid ${item.border}` }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-1.5 text-fg">{item.title}</h4>
                    <p className="text-xs leading-relaxed text-fg-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 pb-20 sm:pb-28 pt-4" aria-labelledby="faq-title">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-brand-600">Resolvemos dudas</p>
            <h2 id="faq-title" className="text-2xl sm:text-3xl font-extrabold mb-3 text-fg tracking-tight">
              Preguntas frecuentes
            </h2>
            <p className="text-sm leading-relaxed max-w-md mx-auto text-fg-muted">
              Lo que la gente nos pregunta antes de empezar a comparar.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group bg-bg-elevated rounded-2xl px-5 sm:px-6 transition-all duration-200 hover:border-border-strong open:border-border-strong open:shadow-md border border-border"
              >
                <summary className="flex items-start gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black tabular bg-brand-50 text-brand-700 border border-brand-100 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-[15px] font-bold leading-snug text-fg">{faq.q}</span>
                  <span
                    aria-hidden="true"
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 transition-transform duration-200 group-open:rotate-180 bg-bg-subtle border border-border text-fg-muted"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </span>
                </summary>
                <div className="pb-5 pl-11 pr-2 text-sm leading-relaxed text-fg-muted">{faq.a}</div>
              </details>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-fg-subtle">
            ¿No encuentras tu respuesta?{" "}
            <a href="mailto:orvexiaesp@gmail.com" className="font-semibold text-brand-600 hover:text-brand-700 underline decoration-dotted underline-offset-2">
              Escríbenos
            </a>
            {" "}y la añadimos.
          </p>
        </div>
      </section>
    </main>
  );
}
