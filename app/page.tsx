import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import ProductCard from "@/components/ProductCard";

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
  { key: "TELEVISORES",          label: "Televisores",    icon: "📺", color: "#3B82F6", bg: "#DBEAFE" },
  { key: "LAVADORAS",            label: "Lavadoras",      icon: "🫧", color: "#8B5CF6", bg: "#EDE9FE" },
  { key: "FRIGORIFICOS",         label: "Frigoríficos",   icon: "🧊", color: "#06B6D4", bg: "#CFFAFE" },
  { key: "LAVAVAJILLAS",         label: "Lavavajillas",   icon: "🍽️", color: "#10B981", bg: "#D1FAE5" },
  { key: "SECADORAS",            label: "Secadoras",      icon: "💨", color: "#F59E0B", bg: "#FEF3C7" },
  { key: "HORNOS",               label: "Hornos",         icon: "🔥", color: "#EF4444", bg: "#FEE2E2" },
  { key: "CAFETERAS",            label: "Cafeteras",      icon: "☕", color: "#92400E", bg: "#FDE68A" },
  { key: "AIRES_ACONDICIONADOS", label: "Aire acond.",    icon: "❄️", color: "#0EA5E9", bg: "#BAE6FD" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Busca tu producto",
    desc: "Escribe el electrodoméstico que quieres y compara precios al instante entre las principales tiendas.",
    color: "#2563EB",
    lightBg: "#EFF6FF",
  },
  {
    step: "02",
    title: "Compara ofertas",
    desc: "Ve el historial de precios, detecta el mejor momento de compra y elige la tienda más económica.",
    color: "#7C3AED",
    lightBg: "#F5F3FF",
  },
  {
    step: "03",
    title: "Ahorra dinero",
    desc: "Compra directamente en la tienda con el mejor precio. Sin intermediarios, sin comisiones.",
    color: "#10B981",
    lightBg: "#ECFDF5",
  },
];

const REGISTER_PERKS = [
  {
    title: "Favoritos con historial",
    desc: "Guarda los productos que te interesan y consulta su evolución de precio en un panel limpio.",
    color: "#2563EB",
    bg: "#EFF6FF",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 17-5.09 2.674 1-5.829-4.24-4.136 5.86-.852L12 3l2.47 5.857 5.86.852-4.24 4.136 1 5.829z" />
      </svg>
    ),
  },
  {
    title: "Alertas instantáneas",
    desc: "Elige el precio objetivo y te avisamos en cuanto una tienda lo rebaje. Sin SPAM.",
    color: "#F59E0B",
    bg: "#FEF3C7",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    title: "Comparativa privada",
    desc: "Crea listas comparativas con las tiendas más baratas y compártelas solo con quien quieras.",
    color: "#7C3AED",
    bg: "#F5F3FF",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h10M7 17h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z" />
      </svg>
    ),
  },
  {
    title: "Comunidad y reviews",
    desc: "Próximamente: opiniones verificadas de otros compradores y recomendaciones según tu uso.",
    color: "#10B981",
    bg: "#ECFDF5",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5Zm-6-2.5a2.5 2.5 0 1 1 3.375-2.318" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 13.25A4.25 4.25 0 0 1 8.75 17.5" />
      </svg>
    ),
  },
];

const STORES = ["Amazon", "MediaMarkt", "PC Componentes", "El Corte Inglés"];

export default async function HomePage() {
  const session = await getSession();
  const [productos, stats] = await Promise.all([getTopDeals(), getStats()]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F8FAFC" }}>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-28 pb-16 lg:pb-[220px] px-6"
        style={{ background: "linear-gradient(160deg, #080D1C 0%, #0F172A 40%, #1A1040 70%, #0D1F5C 100%)" }}
      >
        {/* Noise texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />

        {/* Glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(79,70,229,0.3) 0%, transparent 65%)" }} />
          <div className="absolute top-1/3 -right-32 w-[450px] h-[450px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-20 -left-20 w-[350px] h-[350px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%)" }} />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 mb-8 px-5 py-2 rounded-full border border-white/10 bg-white/[0.06] backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold text-white/75 tracking-wide">Precios actualizados en tiempo real</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.04] tracking-tight mb-6">
            Nunca pagues{" "}
            <span style={{
              backgroundImage: "linear-gradient(95deg, #A78BFA 0%, #60A5FA 45%, #34D399 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              de más
            </span>
            <br />
            <span style={{ color: "rgba(255,255,255,0.88)" }}>por un electrodoméstico</span>
          </h1>

          <p className="text-base sm:text-lg text-white/45 mb-10 max-w-md mx-auto leading-relaxed">
            Comparamos precios en las principales tiendas de España para que
            siempre compres al mejor precio.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link
              href="/ofertas-destacadas"
              className="group px-8 py-3.5 rounded-2xl font-bold text-sm text-white transition-all duration-200 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #2563EB)",
                boxShadow: "0 0 32px rgba(79,70,229,0.55), 0 4px 16px rgba(0,0,0,0.3)",
              }}
            >
              Ver ofertas destacadas →
            </Link>
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-2xl font-semibold text-sm text-white/70 border border-white/[0.12] hover:border-white/25 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all duration-200"
            >
              Crear cuenta gratis
            </Link>
          </div>

          {/* Store pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mr-1">Comparamos en</span>
            {STORES.map((store) => (
              <span key={store} className="px-3 py-1 rounded-full text-[11px] font-semibold text-white/55 border border-white/[0.08] bg-white/[0.04]">
                {store}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="inline-flex items-center divide-x divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm overflow-hidden">
            {[
              { value: stats.productCount, label: "productos" },
              { value: stats.withDiscount, label: "con descuento" },
              { value: stats.storeCount, label: "tiendas" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center px-8 py-4">
                <span className="text-2xl font-black text-emerald-400 leading-none">{value}</span>
                <span className="text-[10px] text-white/35 font-semibold mt-1 uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom decorative line */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="h-px" style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.7) 30%, rgba(96,165,250,1) 50%, rgba(139,92,246,0.7) 70%, transparent 100%)"
          }} />
          <div className="h-3 -mt-3" style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.08) 100%)"
          }} />
        </div>
      </section>

      {/* ── REGISTER PERKS ──────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-16 lg:-mt-[210px]">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl overflow-hidden" style={{ boxShadow: "0 32px 80px -20px rgba(15,23,42,0.35), 0 0 0 1px rgba(226,232,240,0.8)" }}>
            <div className="grid grid-cols-1 lg:grid-cols-2">

              {/* Left: dark */}
              <div className="relative p-10 lg:p-14 flex flex-col justify-between overflow-hidden"
                style={{ background: "linear-gradient(150deg, #080D1C 0%, #0F172A 40%, #1E1B4B 75%, #1e3a8a 100%)" }}>
                <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)" }} />
                <div className="pointer-events-none absolute -bottom-20 -left-12 w-56 h-56 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)" }} />
                <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />

                <div className="relative">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-7 bg-indigo-500/[0.12] border border-indigo-500/[0.18] px-3 py-1.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-indigo-400" />
                    Al registrarte obtienes
                  </span>
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-[1.15] mb-5 tracking-tight">
                    Crea tu cuenta gratis y desbloquea un panel pensado para ahorrar.
                  </h2>
                  <p className="text-[13px] text-slate-400 leading-relaxed">
                    Herramientas claras: seguimiento, alertas y comparativas privadas para comprar en el momento exacto y al mejor precio.
                  </p>
                </div>

                <div className="relative flex flex-col sm:flex-row gap-3 mt-10">
                  <Link href="/register"
                    className="bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 active:scale-95 transition-all text-sm text-center shadow-[0_4px_16px_rgba(255,255,255,0.15)]">
                    Crear cuenta gratis
                  </Link>
                  <Link href="/dashboard"
                    className="text-white/60 font-semibold px-6 py-3 rounded-xl border border-white/[0.12] hover:bg-white/[0.07] hover:text-white active:scale-95 transition-all text-sm text-center">
                    Ver el panel en vivo
                  </Link>
                </div>
              </div>

              {/* Right: perks */}
              <div className="bg-white divide-y divide-slate-100/80">
                {REGISTER_PERKS.map((perk, i) => (
                  <div key={perk.title} className="group flex items-start gap-4 px-8 py-6 hover:bg-slate-50/70 transition-colors duration-150">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform duration-200"
                      style={{ backgroundColor: perk.bg, color: perk.color }}
                    >
                      {perk.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[13px] font-bold text-slate-900">{perk.title}</h3>
                        {i === 3 && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Pronto</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{perk.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ─────────────────────────────────────────────────── */}
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.18em] mb-1.5">Por tipo</p>
              <h2 className="text-[22px] font-extrabold text-slate-900 leading-tight">Categorías</h2>
            </div>
            <Link href="/categorias"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-all">
              Ver todas
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            {CATEGORIES.map((cat) => (
              <Link key={cat.key} href={`/categorias?cat=${cat.key}`}
                className="group flex flex-col items-center gap-2.5 p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-transparent hover:shadow-lg transition-all duration-200"
                style={{ "--tw-shadow-color": cat.color + "25" } as React.CSSProperties}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px] group-hover:scale-110 transition-transform duration-200"
                  style={{ backgroundColor: cat.bg }}>
                  {cat.icon}
                </div>
                <span className="text-[10.5px] font-semibold text-center text-slate-500 group-hover:text-slate-800 leading-tight transition-colors">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP DEALS ──────────────────────────────────────────────────── */}
      <section className="pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.18em] mb-1.5">Mejor precio</p>
              <h2 className="text-[22px] font-extrabold text-slate-900 leading-tight">Ofertas destacadas</h2>
            </div>
            <Link href="/ofertas-destacadas"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-full transition-all">
              Ver todas
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {productos.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-slate-100">
              <p className="text-5xl mb-4">📦</p>
              <p className="text-slate-400 text-sm font-medium">Todavía no hay productos. Vuelve pronto.</p>
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
      <section className="py-20 px-6 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-[0.2em] mb-3">Simple y rápido</p>
            <h2 className="text-[26px] font-extrabold text-slate-900">¿Cómo funciona?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            <div className="hidden sm:block absolute top-[34px] left-[calc(16.67%+36px)] right-[calc(16.67%+36px)] h-px"
              style={{ background: "linear-gradient(90deg, #2563EB33, #7C3AED33, #10B98133)" }} />

            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="flex flex-col items-center text-center">
                <div className="relative mb-6 z-10">
                  <div className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${step.color}bb, ${step.color})`, boxShadow: `0 8px 24px ${step.color}40` }}>
                    {step.step}
                  </div>
                </div>
                <h3 className="text-[15px] font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed max-w-[220px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ──────────────────────────────────────────────────────── */}
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              svg: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>,
              color: "#2563EB", bg: "#EFF6FF",
              title: "Precios actualizados cada hora",
              desc: "Monitorizamos los precios continuamente para que siempre veas la oferta real del momento.",
            },
            {
              svg: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" /></svg>,
              color: "#7C3AED", bg: "#F5F3FF",
              title: "Múltiples tiendas",
              desc: "Comparamos Amazon, MediaMarkt, PC Componentes y más para darte siempre el mejor precio.",
            },
            {
              svg: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" /></svg>,
              color: "#10B981", bg: "#ECFDF5",
              title: "Alertas de bajada de precio",
              desc: "Próximamente: te avisamos cuando baje el precio de tu producto favorito. Nunca más pierdas una oferta.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-sm hover:border-slate-200 transition-all">
              <div className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: item.bg, color: item.color }}>
                {item.svg}
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────────────── */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl px-8 py-16 text-center"
            style={{ background: "linear-gradient(150deg, #080D1C 0%, #0F172A 35%, #1E1B4B 70%, #1e3a8a 100%)", boxShadow: "0 24px 64px -16px rgba(15,23,42,0.5)" }}>
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
                style={{ background: "radial-gradient(ellipse, rgba(79,70,229,0.35) 0%, transparent 65%)" }} />
              <div className="absolute bottom-[-60px] right-[-40px] w-[280px] h-[280px] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)" }} />
              <div className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
            </div>
            <div className="relative">
              <span className="inline-block text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] mb-4 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
                Empieza gratis
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-5 tracking-tight leading-tight">
                Compra más<br />inteligente
              </h2>
              <p className="text-slate-400 text-sm mb-10 max-w-sm mx-auto leading-relaxed">
                Crea tu cuenta gratis y guarda tus productos favoritos para nunca perderte una bajada de precio.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register"
                  className="bg-white text-blue-700 font-bold px-9 py-4 rounded-xl hover:bg-blue-50 active:scale-95 transition-all text-sm shadow-[0_4px_24px_rgba(255,255,255,0.2)]">
                  Crear cuenta gratis
                </Link>
                <Link href="/ofertas-destacadas"
                  className="text-white/65 font-semibold px-9 py-4 rounded-xl border border-white/[0.12] hover:bg-white/[0.07] hover:text-white active:scale-95 transition-all text-sm">
                  Explorar ofertas →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
