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
  { key: "TELEVISORES",        label: "Televisores",        icon: "📺", color: "#3B82F6", bg: "#EFF6FF" },
  { key: "LAVADORAS",          label: "Lavadoras",          icon: "🫧", color: "#8B5CF6", bg: "#F5F3FF" },
  { key: "FRIGORIFICOS",       label: "Frigoríficos",       icon: "🧊", color: "#06B6D4", bg: "#ECFEFF" },
  { key: "LAVAVAJILLAS",       label: "Lavavajillas",       icon: "🍽️", color: "#10B981", bg: "#ECFDF5" },
  { key: "SECADORAS",          label: "Secadoras",          icon: "💨", color: "#F59E0B", bg: "#FFFBEB" },
  { key: "HORNOS",             label: "Hornos",             icon: "🔥", color: "#EF4444", bg: "#FEF2F2" },
  { key: "CAFETERAS",          label: "Cafeteras",          icon: "☕", color: "#92400E", bg: "#FEF3C7" },
  { key: "AIRES_ACONDICIONADOS", label: "Aire acond.", icon: "❄️", color: "#0EA5E9", bg: "#F0F9FF" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Busca tu producto",
    desc: "Escribe el electrodoméstico que quieres y compara precios al instante entre las principales tiendas.",
    color: "#2563EB",
  },
  {
    step: "02",
    title: "Compara ofertas",
    desc: "Ve el historial de precios, detecta el mejor momento de compra y elige la tienda más económica.",
    color: "#7C3AED",
  },
  {
    step: "03",
    title: "Ahorra dinero",
    desc: "Compra directamente en la tienda con el mejor precio. Sin intermediarios, sin comisiones.",
    color: "#10B981",
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
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#2563EB] pt-20 pb-32 px-6">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#3B82F6] opacity-[0.15] blur-3xl" />
          <div className="absolute top-10 -left-20 w-[300px] h-[300px] rounded-full bg-[#10B981] opacity-[0.10] blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-xs font-semibold text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Precios actualizados en tiempo real
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.1] mb-5 tracking-tight">
            Nunca pagues{" "}
            <span
              style={{
                backgroundImage: "linear-gradient(90deg, #A78BFA, #60A5FA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              de más
            </span>
            <br />por un electrodoméstico
          </h1>

          <p className="text-lg text-white/65 mb-8 max-w-xl mx-auto leading-relaxed">
            Comparamos precios en las principales tiendas de España para que encuentres
            la mejor oferta al instante.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link
              href="/ofertas-destacadas"
              className="bg-white text-[#1D4ED8] font-bold px-7 py-3 rounded-xl hover:bg-[#EFF6FF] active:scale-95 transition-all text-sm shadow-lg"
            >
              Ver ofertas →
            </Link>
            <Link
              href="/register"
              className="text-white font-semibold px-7 py-3 rounded-xl border border-white/25 hover:bg-white/10 active:scale-95 transition-all text-sm"
            >
              Crear cuenta gratis
            </Link>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-white/55 text-sm mt-10">
            <div className="flex items-center gap-2">
              <span className="text-[#34D399] font-bold text-lg">{stats.productCount}</span>
              <span>productos</span>
            </div>
            <span className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-[#34D399] font-bold text-lg">{stats.withDiscount}</span>
              <span>con descuento</span>
            </div>
            <span className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-[#34D399] font-bold text-lg">{stats.storeCount}</span>
              <span>tiendas</span>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-14">
            <path
              d="M0 56L480 12L960 40L1440 0V56H0Z"
              fill="#F8FAFC"
            />
          </svg>
        </div>
      </section>

      {/* ── REGISTRO VISUAL ─────────────────────────────────────────── */}
      <section className="relative px-6 -mt-10 mb-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-white border border-[#E2E8F0] shadow-[0_24px_64px_-32px_rgba(15,23,42,0.3)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-16 -left-10 w-40 h-40 rounded-full bg-[#2563EB]/5 blur-3xl" />
              <div className="absolute -bottom-10 right-0 w-52 h-52 rounded-full bg-[#7C3AED]/5 blur-3xl" />
            </div>
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 p-10 lg:p-14 items-center">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.15em] bg-[#EFF6FF] px-3 py-1 rounded-full">
                  Todo lo que obtienes al registrarte
                </span>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#0F172A] leading-tight">
                  Crea tu cuenta gratis y desbloquea un panel pensado para ahorrar.
                </h2>
                <p className="text-sm text-[#475569] leading-relaxed max-w-xl">
                  Te damos herramientas claras: seguimiento, alertas y comparativas privadas para comprar en el momento exacto y al mejor precio.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    href="/register"
                    className="bg-[#2563EB] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1D4ED8] active:scale-95 transition-all text-sm shadow-lg"
                  >
                    Crear cuenta gratis
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-[#2563EB] font-semibold px-6 py-3 rounded-xl border border-[#2563EB]/20 hover:bg-[#EFF6FF] active:scale-95 transition-all text-sm"
                  >
                    Ver el panel en vivo
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {REGISTER_PERKS.map((perk) => (
                  <div
                    key={perk.title}
                    className="p-4 rounded-2xl border border-[#E2E8F0] bg-white/80 backdrop-blur"
                    style={{ boxShadow: `0 18px 36px -24px ${perk.color}aa` }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: perk.bg, color: perk.color }}
                    >
                      {perk.icon}
                    </div>
                    <h3 className="text-sm font-bold text-[#0F172A] mb-1">{perk.title}</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">{perk.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ─────────────────────────────────────────────────── */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-1 h-10 rounded-full" style={{ backgroundImage: "linear-gradient(180deg, #2563EB, #7C3AED)" }} />
            <div>
              <span className="inline-block text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.15em] mb-0.5">Por tipo</span>
              <h2 className="text-2xl font-bold text-[#0F172A] leading-tight">Categorías</h2>
            </div>
          </div>
          <Link href="/categorias" className="flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] group bg-[#EFF6FF] hover:bg-[#DBEAFE] px-4 py-2 rounded-full transition-all duration-150">
            Ver todas
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              href={`/categorias?cat=${cat.key}`}
              className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border border-[#E2E8F0] hover:border-transparent hover:shadow-lg transition-all duration-200"
              style={{ "--tw-shadow-color": cat.color + "33" } as React.CSSProperties}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200"
                style={{ backgroundColor: cat.bg }}
              >
                {cat.icon}
              </div>
              <span className="text-[11px] font-semibold text-center text-[#64748B] group-hover:text-[#0F172A] leading-tight transition-colors">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TOP DEALS ──────────────────────────────────────────────────── */}
      <section className="py-6 pb-16 px-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-1 h-10 rounded-full" style={{ backgroundImage: "linear-gradient(180deg, #F97316, #EF4444)" }} />
            <div>
              <span className="inline-block text-[10px] font-bold text-[#F97316] uppercase tracking-[0.15em] mb-0.5">Mejor precio</span>
              <h2 className="text-2xl font-bold text-[#0F172A] leading-tight">Ofertas destacadas</h2>
            </div>
          </div>
          <Link href="/ofertas-destacadas" className="flex items-center gap-1.5 text-sm font-semibold text-[#F97316] hover:text-[#EA6B00] group bg-[#FFF7ED] hover:bg-[#FFEDD5] px-4 py-2 rounded-full transition-all duration-150">
            Ver todas
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {topDeals.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-[#E2E8F0]">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-[#94A3B8] text-sm font-medium">Todavía no hay productos. Vuelve pronto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {topDeals.map((producto, i) => (
              <ProductCard key={producto.id} product={producto} priority={i === 0} />
            ))}
          </div>
        )}
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-[10px] font-bold text-[#7C3AED] uppercase tracking-[0.15em] mb-3">
              <span className="w-6 h-px bg-[#7C3AED] opacity-50 rounded-full" />
              Simple y rápido
              <span className="w-6 h-px bg-[#7C3AED] opacity-50 rounded-full" />
            </span>
            <h2 className="text-2xl font-bold text-[#0F172A]">¿Cómo funciona?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) — spans between centers of col 1 and col 3 */}
            <div className="hidden sm:block absolute top-8 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#10B981] opacity-25" />
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="flex flex-col items-center text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-5 shadow-lg relative z-10"
                  style={{ backgroundImage: `linear-gradient(135deg, ${step.color}dd, ${step.color})` }}
                >
                  {step.step}
                </div>
                <h3 className="text-base font-bold text-[#0F172A] mb-2">{step.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ────────────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              svg: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              ),
              color: "#2563EB",
              bg: "#EFF6FF",
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
              color: "#7C3AED",
              bg: "#F5F3FF",
              title: "Múltiples tiendas",
              desc: "Comparamos Amazon, MediaMarkt, PC Componentes y más para darte siempre el mejor precio.",
            },
            {
              svg: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
                </svg>
              ),
              color: "#10B981",
              bg: "#ECFDF5",
              title: "Alertas de bajada",
              desc: "Próximamente: te avisamos cuando baje el precio de tu producto favorito. Nunca te pierdas una oferta.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-[#E2E8F0] hover:shadow-sm transition-shadow"
            >
              <div
                className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: item.bg, color: item.color }}
              >
                {item.svg}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] mb-1">{item.title}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#2563EB] p-12 text-center shadow-[0_24px_64px_-16px_rgba(15,23,42,0.4)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-[-60px] right-[-60px] w-64 h-64 rounded-full bg-[#3B82F6] opacity-10 blur-2xl" />
              <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 rounded-full bg-[#10B981] opacity-10 blur-2xl" />
            </div>
            <div className="relative">
              <p className="text-xs font-bold text-[#34D399] uppercase tracking-widest mb-3">Empieza gratis</p>
              <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
                Compra más inteligente
              </h2>
              <p className="text-[#93C5FD] text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Crea tu cuenta gratis y guarda tus productos favoritos para nunca perderte una bajada de precio.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/register"
                  className="bg-white text-[#1D4ED8] font-bold px-7 py-3 rounded-xl hover:bg-[#EFF6FF] active:scale-95 transition-all text-sm shadow-lg"
                >
                  Crear cuenta gratis
                </Link>
                <Link
                  href="/ofertas-destacadas"
                  className="text-white font-semibold px-7 py-3 rounded-xl border border-white/25 hover:bg-white/10 active:scale-95 transition-all text-sm"
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
