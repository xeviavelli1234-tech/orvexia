import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import ProductCard from "@/components/ProductCard";
import { HeroSearch } from "@/components/HeroSearch";

async function getTopDeals() {
  return prisma.product.findMany({
    where: {
      offers: { some: { discountPercent: { gt: 0 }, priceOld: { not: null } } },
    },
    include: {
      offers: { orderBy: { discountPercent: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
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
  { key: "TELEVISORES",          label: "Televisores",    icon: "📺", accent: "#3B82F6" },
  { key: "LAVADORAS",            label: "Lavadoras",      icon: "🫧", accent: "#8B5CF6" },
  { key: "FRIGORIFICOS",         label: "Frigoríficos",   icon: "🧊", accent: "#06B6D4" },
  { key: "LAVAVAJILLAS",         label: "Lavavajillas",   icon: "🍽️", accent: "#10B981" },
  { key: "SECADORAS",            label: "Secadoras",      icon: "💨", accent: "#F59E0B" },
  { key: "HORNOS",               label: "Hornos",         icon: "🔥", accent: "#EF4444" },
  { key: "CAFETERAS",            label: "Cafeteras",      icon: "☕", accent: "#D97706" },
  { key: "AIRES_ACONDICIONADOS", label: "Aire acond.",    icon: "❄️", accent: "#0EA5E9" },
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Busca",
    desc: "Escribe el electrodoméstico y compara precios al instante en las principales tiendas.",
    accent: "#3B82F6",
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
    accent: "#10B981",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
  },
];

const REGISTER_PERKS: { title: string; desc: string; accent: string; icon: React.ReactNode; soon?: boolean }[] = [
  {
    title: "Favoritos con historial",
    desc: "Guarda productos y consulta su evolución de precio en un panel limpio.",
    accent: "#3B82F6",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 17-5.09 2.674 1-5.829-4.24-4.136 5.86-.852L12 3l2.47 5.857 5.86.852-4.24 4.136 1 5.829z" />
      </svg>
    ),
  },
  {
    title: "Alertas de precio",
    desc: "Pon tu precio objetivo y te avisamos por email cuando una tienda lo rebaje.",
    accent: "#F59E0B",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    title: "Notificaciones de oferta",
    desc: "Guarda un producto sin descuento y te avisamos por email en cuanto entre en oferta o baje de precio.",
    accent: "#10B981",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Comparativas privadas",
    desc: "Crea listas con las tiendas más baratas y compártelas con quien quieras.",
    accent: "#8B5CF6",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" />
      </svg>
    ),
  },
];

const STORES = ["Amazon", "MediaMarkt", "PC Componentes", "El Corte Inglés"];

export default async function HomePage() {
  const session = await getSession();
  const [productos, stats] = await Promise.all([getTopDeals(), getStats()]);

  return (
    <main style={{ backgroundColor: "#F8FAFC", minHeight: "100vh" }}>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-28 pb-32" style={{ backgroundColor: "#030305" }}>

        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px]"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 65%)" }} />
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px]"
            style={{ background: "radial-gradient(circle at 100% 50%, rgba(139,92,246,0.10) 0%, transparent 60%)" }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px]"
            style={{ background: "radial-gradient(circle at 0% 100%, rgba(16,185,129,0.08) 0%, transparent 60%)" }} />
          {/* Subtle grid */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
              Precios actualizados en tiempo real
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-black tracking-tight mb-6"
            style={{ fontSize: "clamp(2.8rem,7vw,5.5rem)", lineHeight: 1.05, color: "#ffffff", letterSpacing: "-0.03em" }}>
            Compara precios.{" "}
            <br />
            <span style={{
              backgroundImage: "linear-gradient(90deg, #818CF8 0%, #60A5FA 40%, #34D399 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Ahorra siempre.
            </span>
          </h1>

          <p className="mb-10 max-w-xl mx-auto leading-relaxed"
            style={{ fontSize: "1rem", color: "rgba(255,255,255,0.38)" }}>
            Monitorizamos precios en las principales tiendas de España para que compres
            siempre en el momento y al precio correcto.
          </p>

          {/* Search */}
          <div className="mb-8 max-w-2xl mx-auto">
            <HeroSearch />
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            {[
              { value: stats.productCount.toLocaleString("es-ES"), label: "productos" },
              { value: stats.withDiscount.toLocaleString("es-ES"), label: "con descuento" },
              { value: stats.storeCount, label: "tiendas" },
            ].map(({ value, label }, i) => (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.10)", display: "inline-block" }} />}
                <span className="font-black tabular-nums" style={{ fontSize: "1.2rem", color: "#34D399" }}>{value}</span>
                <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.28)" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Store pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest mr-1" style={{ color: "rgba(255,255,255,0.2)" }}>Comparamos en</span>
            {STORES.map((s) => (
              <span key={s} className="text-[11px] font-medium px-3 py-1 rounded-full"
                style={{ color: "rgba(255,255,255,0.38)", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ─────────────────────────────────────────────────── */}
      <section className="px-6 pt-16 pb-14">
        <div className="max-w-6xl mx-auto">

          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: "#6366F1" }}>Explorar</p>
              <h2 className="text-xl font-extrabold" style={{ color: "#0F172A" }}>Categorías</h2>
            </div>
            <Link href="/categorias"
              className="text-xs font-semibold px-4 py-2 rounded-full transition-all"
              style={{ color: "#6366F1", border: "1px solid #E0E7FF", background: "#EEF2FF" }}>
              Ver todas →
            </Link>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {CATEGORIES.map((cat) => (
              <Link key={cat.key} href={`/categorias?cat=${cat.key}`}
                className="group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 hover:shadow-md"
                style={{ background: "#ffffff", border: "1px solid #E2E8F0" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-200"
                  style={{ background: `${cat.accent}12`, border: `1px solid ${cat.accent}22` }}>
                  {cat.icon}
                </div>
                <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: "#64748B" }}>
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP DEALS ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-14">
        <div className="max-w-6xl mx-auto">

          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: "#F97316" }}>Mejor precio ahora</p>
              <h2 className="text-xl font-extrabold" style={{ color: "#0F172A" }}>Ofertas destacadas</h2>
            </div>
            <Link href="/ofertas-destacadas"
              className="text-xs font-semibold px-4 py-2 rounded-full transition-all"
              style={{ color: "#EA580C", border: "1px solid #FFEDD5", background: "#FFF7ED" }}>
              Ver todas →
            </Link>
          </div>

          {productos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl bg-white border border-slate-100">
              <span className="text-4xl mb-3">📦</span>
              <p className="text-sm font-medium text-slate-400">Todavía no hay productos. Vuelve pronto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {productos.map((producto, i) => (
                <ProductCard key={producto.id} product={producto} priority={i === 0} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────────────────────────── */}
      <section className="px-6 pb-14">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "#7C3AED" }}>Simple y rápido</p>
            <h2 className="text-xl font-extrabold" style={{ color: "#0F172A" }}>¿Cómo funciona?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.n}
                className="group relative p-7 rounded-2xl transition-all duration-200 hover:shadow-md bg-white"
                style={{ border: "1px solid #E2E8F0" }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${step.accent}12`, color: step.accent, border: `1px solid ${step.accent}22` }}>
                    {step.icon}
                  </div>
                  <span className="font-black text-3xl leading-none"
                    style={{ color: `${step.accent}20`, letterSpacing: "-0.04em" }}>
                    {step.n}
                  </span>
                </div>
                <h3 className="text-[15px] font-bold mb-2" style={{ color: "#0F172A" }}>{step.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "#64748B" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGISTER PERKS ──────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl p-px"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(139,92,246,0.2) 50%, rgba(16,185,129,0.2) 100%)" }}>
            <div className="relative rounded-[calc(1.5rem-1px)] overflow-hidden"
              style={{ background: "linear-gradient(150deg, #0c0c1a 0%, #0a0a14 50%, #080d10 100%)" }}>

              {/* Glow */}
              <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
              <div className="pointer-events-none absolute -bottom-20 -left-20 w-60 h-60 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)" }} />

              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0">

                {/* Left */}
                <div className="p-10 lg:p-14 flex flex-col justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] mb-7 px-3 py-1.5 rounded-full"
                      style={{ color: "rgba(165,180,252,0.9)", background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.18)" }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: "#818CF8" }} />
                      Al registrarte obtienes
                    </span>
                    <h2 className="font-extrabold leading-[1.15] mb-5 tracking-tight"
                      style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)", color: "#ffffff" }}>
                      Un panel pensado<br />para ahorrar dinero.
                    </h2>
                    <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                      Seguimiento, alertas y comparativas privadas para comprar en el momento exacto y al mejor precio.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-10">
                    <Link href="/register"
                      className="font-bold px-6 py-3 rounded-xl text-sm text-center transition-all active:scale-95"
                      style={{ background: "linear-gradient(135deg, #4F46E5, #2563EB)", color: "#ffffff", boxShadow: "0 0 24px rgba(79,70,229,0.4)" }}>
                      Crear cuenta gratis
                    </Link>
                    <Link href="/dashboard"
                      className="font-semibold px-6 py-3 rounded-xl text-sm text-center transition-all active:scale-95"
                      style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      Ver el panel en vivo
                    </Link>
                  </div>
                </div>

                {/* Right: perks grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px"
                  style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                  {REGISTER_PERKS.map((perk) => (
                    <div key={perk.title}
                      className="group p-6 transition-colors duration-150"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${perk.accent}18`, color: perk.accent, border: `1px solid ${perk.accent}25` }}>
                          {perk.icon}
                        </div>
                        <h3 className="text-[12px] font-bold" style={{ color: "#ffffff" }}>{perk.title}</h3>
                        {perk.soon && (
                          <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                            style={{ color: "#34D399", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                            Pronto
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.32)" }}>{perk.desc}</p>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RECOMENDADOS ───────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: "#F59E0B" }}>Para ti</p>
              <h2 className="text-xl font-extrabold" style={{ color: "#0F172A" }}>Recomendados</h2>
            </div>
            <Link href="/recomendados"
              className="text-xs font-semibold px-4 py-2 rounded-full transition-all"
              style={{ color: "#D97706", border: "1px solid #FDE68A", background: "#FFFBEB" }}>
              Ver todos →
            </Link>
          </div>

          {/* Layout: texto izq + criterios der */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* Left: copy */}
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] mb-6 px-3 py-1.5 rounded-full"
                style={{ color: "#D97706", background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#F59E0B" }} />
                Selección inteligente
              </span>
              <h3 className="font-extrabold leading-[1.15] mb-4 tracking-tight"
                style={{ fontSize: "clamp(1.5rem,2.5vw,2rem)", color: "#0F172A" }}>
                Productos elegidos por calidad y precio, no por publicidad.
              </h3>
              <p className="text-[14px] leading-relaxed mb-8" style={{ color: "#64748B" }}>
                El algoritmo cruza valoraciones reales de compradores con los descuentos verificados del momento. Si tienes cuenta, aprende de tus favoritos y te sugiere productos de las categorías que más te interesan.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/recomendados"
                  className="font-bold px-6 py-3 rounded-xl text-sm text-center transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)", color: "#ffffff" }}>
                  Ver mis recomendados
                </Link>
              </div>
            </div>

            {/* Right: criterios */}
            <div className="flex flex-col gap-5">
              {[
                {
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                  ),
                  accent: "#7C3AED",
                  bg: "#F5F3FF",
                  border: "#DDD6FE",
                  title: "Rating ≥ 4.3 con +100 reseñas",
                  desc: "Solo aparecen productos con valoraciones sólidas de compradores verificados, sin inflados.",
                },
                {
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                    </svg>
                  ),
                  accent: "#10B981",
                  bg: "#ECFDF5",
                  border: "#A7F3D0",
                  title: "Descuentos reales verificados",
                  desc: "Cruzamos el historial de precios para distinguir descuentos genuinos de precios inflados.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: item.bg, color: item.accent, border: `1px solid ${item.border}` }}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold mb-1" style={{ color: "#0F172A" }}>{item.title}</h4>
                    <p className="text-[12px] leading-relaxed" style={{ color: "#64748B" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

    </main>
  );
}
