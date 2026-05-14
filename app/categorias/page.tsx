export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Category } from "@/app/generated/prisma/client";
import { CategoryProductCard } from "@/components/CategoryProductCard";
import { FuturisticFX } from "@/components/FuturisticFX";

const MIN_REASONABLE_PRICE = 20;
const MAX_REASONABLE_PRICE = 5000;

const CATEGORIES: {
  key: Category;
  label: string;
  icon: string;
  color: string;
  code: string;
  desc: string;
}[] = [
  { key: "TELEVISORES",          label: "Televisores",         icon: "📺", color: "#818CF8", code: "TV-01", desc: "Smart TV, QLED, OLED y más" },
  { key: "LAVADORAS",            label: "Lavadoras",           icon: "🫧", color: "#A78BFA", code: "WS-02", desc: "Carga frontal, superior y secadora-lavadora" },
  { key: "FRIGORIFICOS",         label: "Frigoríficos",        icon: "🧊", color: "#22D3EE", code: "FR-03", desc: "Combi, americano, bajo encimera" },
  { key: "LAVAVAJILLAS",         label: "Lavavajillas",        icon: "🍽️", color: "#5EEAD4", code: "DW-04", desc: "Integrado, libre instalación y compacto" },
  { key: "SECADORAS",            label: "Secadoras",           icon: "💨", color: "#FBBF24", code: "DR-05", desc: "Bomba de calor, condensación y evacuación" },
  { key: "HORNOS",               label: "Hornos",              icon: "🔥", color: "#F87171", code: "OV-06", desc: "Integrable, sobremesa y microondas-horno" },
  { key: "MICROONDAS",           label: "Microondas",          icon: "📡", color: "#C084FC", code: "MW-07", desc: "Grill, convección y libre instalación" },
  { key: "ASPIRADORAS",          label: "Aspiradoras",         icon: "🌀", color: "#60A5FA", code: "VC-08", desc: "Robot, sin cable y con bolsa" },
  { key: "CAFETERAS",            label: "Cafeteras",           icon: "☕", color: "#FB923C", code: "CF-09", desc: "Espresso, cápsulas y de goteo" },
  { key: "AIRES_ACONDICIONADOS", label: "Aire acondicionado",  icon: "❄️", color: "#38BDF8", code: "AC-10", desc: "Split, portátil y multisplit" },
];

async function getCategoriasData() {
  const counts = await prisma.product.groupBy({
    by: ["category"],
    where: {
      offers: { some: { priceCurrent: { gte: MIN_REASONABLE_PRICE, lte: MAX_REASONABLE_PRICE } } },
    },
    _count: { id: true },
  });

  const topProductsPerCat = await Promise.all(
    counts.map((c) =>
      prisma.product.findMany({
        where: {
          category: c.category,
          offers: { some: { priceCurrent: { gte: MIN_REASONABLE_PRICE, lte: MAX_REASONABLE_PRICE } } },
        },
        include: {
          offers: {
            where: { priceCurrent: { gte: MIN_REASONABLE_PRICE, lte: MAX_REASONABLE_PRICE } },
            orderBy: { priceCurrent: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      })
    )
  );

  const topProducts = topProductsPerCat.flat();
  return { counts, topProducts };
}

export default async function CategoriasPage() {
  const { counts, topProducts } = await getCategoriasData();

  const countMap = Object.fromEntries(counts.map((c) => [c.category, c._count.id]));

  const productsByCategory = topProducts.reduce<Record<string, typeof topProducts>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    if (acc[p.category].length < 3) acc[p.category].push(p);
    return acc;
  }, {});

  const totalProductos = counts.reduce((s, c) => s + c._count.id, 0);
  const categoriasConProductos = counts.length;

  return (
    <main className="min-h-screen">

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid-cyber opacity-50 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <FuturisticFX particleCount={5} streamCount={2} beam seed={3} />
        </div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full halo-breathe pointer-events-none"
             style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.25), transparent 65%)" }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-14 sm:pb-20 text-center">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] mb-4 text-cyan-300/80">
            ▸ /catalog · index
          </p>
          <h1 className="font-extrabold tracking-tight text-white mb-5"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)", lineHeight: 1, letterSpacing: "-0.045em" }}>
            Todas las <span className="text-gradient-neon">categorías</span>
          </h1>
          <p className="text-white/55 text-base mb-9 max-w-xl mx-auto">
            <span className="font-mono-ui tabular text-white/85">{totalProductos.toLocaleString("es-ES")}</span> producto{totalProductos !== 1 ? "s" : ""} en{" "}
            <span className="font-mono-ui tabular text-white/85">{categoriasConProductos}</span> categoría{categoriasConProductos !== 1 ? "s" : ""}.
            Encuentra siempre el mejor precio.
          </p>

          {/* Categoría pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.filter((c) => countMap[c.key]).map((cat) => (
              <a
                key={cat.key}
                href={`#${cat.key}`}
                className="group flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold text-white/75 border border-white/[0.10] bg-white/[0.025] hover:bg-white/[0.06] hover:border-white/25 transition-colors"
              >
                <span>{cat.icon}</span>
                {cat.label}
                <span className="font-mono-ui text-[10px] px-1.5 rounded-md tabular"
                      style={{ background: `${cat.color}1A`, color: cat.color, border: `1px solid ${cat.color}35` }}>
                  {countMap[cat.key]}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* GRID DE CATEGORIAS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-20">
        {CATEGORIES.map((cat) => {
          const productos = productsByCategory[cat.key] ?? [];
          const count = countMap[cat.key] ?? 0;

          return (
            <div key={cat.key} id={cat.key} className="scroll-mt-20">
              {/* Cabecera de categoría */}
              <div className="flex items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 relative overflow-hidden"
                    style={{
                      background: `color-mix(in srgb, ${cat.color} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${cat.color} 45%, transparent)`,
                      boxShadow: `0 0 32px -6px ${cat.color}55`,
                    }}
                  >
                    {cat.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono-ui text-[10px] uppercase tracking-wider text-white/40">▸ {cat.code}</span>
                      <span className="font-mono-ui text-[10px] tabular px-1.5 rounded-md"
                            style={{ background: `${cat.color}1A`, color: cat.color, border: `1px solid ${cat.color}35` }}>
                        {count} item{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">{cat.label}</h2>
                    <p className="text-sm text-white/55 mt-0.5">{cat.desc}</p>
                  </div>
                </div>
                {count > 0 && (
                  <Link
                    href={`/categorias/${cat.key.toLowerCase()}`}
                    className="hidden sm:inline-flex items-center gap-2 font-mono-ui text-[11px] uppercase font-bold px-4 h-10 rounded-full transition-all hover:scale-[1.02]"
                    style={{
                      color: cat.color,
                      background: `${cat.color}12`,
                      border: `1px solid ${cat.color}40`,
                      boxShadow: `0 0 16px -6px ${cat.color}60`,
                    }}
                  >
                    Ver todos
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                )}
              </div>

              {/* Productos */}
              {productos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {productos.map((p) => (
                    <CategoryProductCard
                      key={p.id}
                      product={p}
                      catColor={cat.color}
                      catIcon={cat.icon}
                    />
                  ))}

                  {count > 3 && (
                    <Link
                      href={`/categorias/${cat.key.toLowerCase()}`}
                      className="group rounded-2xl border border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 p-8 min-h-[120px] hover:-translate-y-0.5"
                      style={{
                        background: `color-mix(in srgb, ${cat.color} 5%, transparent)`,
                        borderColor: `${cat.color}40`,
                        color: cat.color,
                      }}
                    >
                      <span className="text-4xl" style={{ filter: `drop-shadow(0 0 12px ${cat.color}80)` }}>{cat.icon}</span>
                      <div className="text-center">
                        <p className="text-sm font-bold">{count - 3} más en {cat.label}</p>
                        <p className="font-mono-ui text-[10px] uppercase opacity-70 mt-1">load_more →</p>
                      </div>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed p-10 flex flex-col items-center gap-3 text-center"
                     style={{
                       background: `color-mix(in srgb, ${cat.color} 4%, transparent)`,
                       borderColor: `${cat.color}30`,
                       color: cat.color,
                     }}>
                  <span className="text-5xl opacity-40" style={{ filter: `drop-shadow(0 0 12px ${cat.color}80)` }}>{cat.icon}</span>
                  <div>
                    <p className="font-mono-ui text-[11px] uppercase tracking-wider opacity-80">stand_by</p>
                    <p className="text-xs opacity-60 mt-1">Estamos añadiendo productos en esta categoría</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
