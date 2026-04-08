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
  { key: "TELEVISORES",          label: "Televisores",    icon: "📺", color: "#3B82F6", bg: "#EFF6FF" },
  { key: "LAVADORAS",            label: "Lavadoras",      icon: "🫧", color: "#8B5CF6", bg: "#F5F3FF" },
  { key: "FRIGORIFICOS",         label: "Frigoríficos",   icon: "🧊", color: "#06B6D4", bg: "#ECFEFF" },
  { key: "LAVAVAJILLAS",         label: "Lavavajillas",   icon: "🍽️", color: "#10B981", bg: "#ECFDF5" },
  { key: "SECADORAS",            label: "Secadoras",      icon: "💨", color: "#F59E0B", bg: "#FFFBEB" },
  { key: "HORNOS",               label: "Hornos",         icon: "🔥", color: "#EF4444", bg: "#FEF2F2" },
  { key: "CAFETERAS",            label: "Cafeteras",      icon: "☕", color: "#92400E", bg: "#FEF3C7" },
  { key: "AIRES_ACONDICIONADOS", label: "Aire acond.",    icon: "❄️", color: "#0EA5E9", bg: "#F0F9FF" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Busca tu producto",
    desc: "Escribe el electrodoméstico que quieres y compara precios al instante entre las principales tiendas.",
    color: "#2563EB",
    gradient: "from-blue-500 to-blue-700",
  },
  {
    step: "02",
    title: "Compara ofertas",
    desc: "Ve el historial de precios, detecta el mejor momento de compra y elige la tienda más económica.",
    color: "#7C3AED",
    gradient: "from-violet-500 to-violet-700",
  },
  {
    step: "03",
    title: "Ahorra dinero",
    desc: "Compra directamente en la tienda con el mejor precio. Sin intermediarios, sin comisiones.",
    color: "#10B981",
    gradient: "from-emerald-400 to-emerald-600",
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

export default async function HomePage() {
  const session = await getSession();
  const [productos, stats] = await Promise.all([getTopDeals(), getStats()]);
  const topDeals = productos;

  return (
    <main className="min-h-screen bg-[#F1F5F9]">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#060B18] pt-24 pb-40 px-6">
        {/* Background glow orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.25) 0%, transparent 70%)" }} />
          <div className="absolute top-20 right-[-80px] w-[400px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-[-60px] w-[300px] h-[300px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)" }} />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs font-semibold text-white/80 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            Precios actualizados en tiempo real
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl font-black text-white leading-[1.05] mb-6 tracking-tight">
            Nunca pagues{" "}
            <span style={{
              backgroundImage: "linear-gradient(100deg, #818CF8 0%, #60A5FA 50%, #34D399 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              de más
            </span>
            <br />
            <span className="text-white/90">por un electrodoméstico</span>
          </h1>

          <p className="text-base sm:text-lg text-white/50 mb-10 max-w-lg mx-auto leading-relaxed">
            Comparamos precios en las principales tiendas de España para que encuentres
            la mejor oferta al instante.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link
              href="/ofertas-destacadas"
              className="relative group px-8 py-3.5 rounded-2xl font-bold text-sm text-white overflow-hidden shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all duration-200 hover:shadow-[0_0_40px_rgba(37,99,235,0.7)] active:scale-95"
              style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
            >
              Ver ofertas →
            </Link>
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-2xl font-semibold text-sm text-white/80 border border-white/10 hover:bg-white/8 hover:text-white hover:border-white/20 active:scale-95 transition-all duration-200"
            >
              Crear cuenta gratis
            </Link>
          </div>

          {/* Stats */}
          <div className="inline-flex items-center gap-6 px-6 py-3 rounded-2xl bg-white/5 border border-white/8 backdrop-blur-sm divide-x divide-white/10">
            <div className="flex items-center gap-2 pr-6">
              <span className="text-xl font-black text-emerald-400">{stats.productCount}</span>
              <span className="text-xs text-white/40 font-medium">productos</span>
            </div>
            <div className="flex items-center gap-2 px-6">
              <span className="text-xl font-black text-emerald-400">{stats.withDiscount}</span>
              <span className="text-xs text-white/40 font-medium">con descuento</span>
            </div>
            <div className="flex items-center gap-2 pl-6">
              <span className="text-xl font-black text-emerald-400">{stats.storeCount}</span>
              <span className="text-xs text-white/40 font-medium">tiendas</span>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-20">
            <path d="M0 80L360 30L720 55L1080 15L1440 45V80H0Z" fill="#F1F5F9" />
          </svg>
        </div>
      </section>

      {/* ── REGISTER PERKS ──────────────────────────────────────────── */}
      <section className="px-6 -mt-6 mb-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl bg-white shadow-[0_8px_48px_-16px_rgba(15,23,42,0.15)] border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-5">
              {/* Left: text */}
              <div className="lg:col-span-2 p-8 lg:p-12 flex flex-col justify-center"
                style={{ background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 60%, #1e3a8a 100%)" }}>
                <span className="inline-block text-[10px] font-bold text-indigo-300 uppercase tracking-[0.18em] mb-4 bg-indigo-500/15 px-3 py-1 rounded-full w-fit">
                  Al registrarte obtienes
                </span>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight mb-4">
                  Crea tu cuenta gratis y desbloquea un panel pensado para ahorrar.
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-8">
                  Herramientas claras: seguimiento, alertas y comparativas privadas para comprar en el momento exacto y al mejor precio.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/register"
                    className="bg-white text-[#1D4ED8] font-bold px-6 py-3 rounded-xl hover:bg-blue-50 active:scale-95 transition-all text-sm text-center"
                  >
                    Crear cuenta gratis
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-white/70 font-semibold px-6 py-3 rounded-xl border border-white/15 hover:bg-white/8 hover:text-white active:scale-95 transition-all text-sm text-center"
                  >
                    Ver el panel en vivo
                  </Link>
                </div>
              </div>

              {/* Right: perks grid */}
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-100">
                {REGISTER_PERKS.map((perk) => (
                  <div key={perk.title} className="bg-white p-7 flex flex-col gap-4 hover:bg-slate-50 transition-colors">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: perk.bg, color: perk.color }}
                    >
                      {perk.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">{perk.title}</h3>
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
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.15em] mb-1">Por tipo</p>
              <h2 className="text-2xl font-extrabold text-slate-900">Categorías</h2>
            </div>
            <Link
              href="/categorias"
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-all"
            >
              Ver todas
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                href={`/categorias?cat=${cat.key}`}
                className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-200"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200"
                  style={{ backgroundColor: cat.bg }}
                >
                  {cat.icon}
                </div>
                <span className="text-[11px] font-semibold text-center text-slate-500 group-hover:text-slate-800 leading-tight transition-colors">
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
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold text-orange-500 uppercase tracking-[0.15em] mb-1">Mejor precio</p>
              <h2 className="text-2xl font-extrabold text-slate-900">Ofertas destacadas</h2>
            </div>
            <Link
              href="/ofertas-destacadas"
              className="flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-full transition-all"
            >
              Ver todas
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {topDeals.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-slate-100">
              <p className="text-5xl mb-4">📦</p>
              <p className="text-slate-400 text-sm font-medium">Todavía no hay productos. Vuelve pronto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {topDeals.map((producto, i) => (
                <ProductCard key={producto.id} product={producto} priority={i === 0} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-violet-600 uppercase tracking-[0.18em] mb-3">Simple y rápido</p>
            <h2 className="text-3xl font-extrabold text-slate-900">¿Cómo funciona?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {/* Connector */}
            <div className="hidden sm:block absolute top-9 left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] h-px"
              style={{ background: "linear-gradient(90deg, #2563EB40, #7C3AED40, #10B98140)" }} />

            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="flex flex-col items-center text-center px-4">
                <div
                  className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-6 relative z-10 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${step.color}cc, ${step.color})` }}
                >
                  {step.step}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ────────────────────────────────────────────────── */}
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              svg: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              ),
              color: "#2563EB", bg: "#EFF6FF",
              title: "Precios actualizados cada hora",
              desc: "Monitorizamos los precios continuamente para que siempre veas la oferta real del momento.",
            },
            {
              svg: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
                </svg>
              ),
              color: "#7C3AED", bg: "#F5F3FF",
              title: "Múltiples tiendas",
              desc: "Comparamos Amazon, MediaMarkt, PC Componentes y más para darte siempre el mejor precio.",
            },
            {
              svg: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
                </svg>
              ),
              color: "#10B981", bg: "#ECFDF5",
              title: "Alertas de bajada",
              desc: "Próximamente: te avisamos cuando baje el precio de tu producto favorito. Nunca te pierdas una oferta.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
            >
              <div
                className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: item.bg, color: item.color }}
              >
                {item.svg}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────────────── */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div
            className="relative overflow-hidden rounded-3xl p-12 text-center"
            style={{ background: "linear-gradient(135deg, #060B18 0%, #1E1B4B 50%, #1e3a8a 100%)" }}
          >
            {/* Glow */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full"
                style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.3) 0%, transparent 70%)" }} />
              <div className="absolute bottom-[-60px] right-[-40px] w-[250px] h-[250px] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)" }} />
            </div>
            <div className="relative">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Empieza gratis</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
                Compra más inteligente
              </h2>
              <p className="text-slate-400 text-sm mb-10 max-w-sm mx-auto leading-relaxed">
                Crea tu cuenta gratis y guarda tus productos favoritos para nunca perderte una bajada de precio.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/register"
                  className="bg-white text-blue-700 font-bold px-8 py-3.5 rounded-xl hover:bg-blue-50 active:scale-95 transition-all text-sm shadow-lg"
                >
                  Crear cuenta gratis
                </Link>
                <Link
                  href="/ofertas-destacadas"
                  className="text-white/70 font-semibold px-8 py-3.5 rounded-xl border border-white/15 hover:bg-white/8 hover:text-white active:scale-95 transition-all text-sm"
                >
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
