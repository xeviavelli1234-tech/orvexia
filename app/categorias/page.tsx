export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Category } from "@/app/generated/prisma/client";
import { CategoryProductCard } from "@/components/CategoryProductCard";

const MIN_REASONABLE_PRICE = 20;
const MAX_REASONABLE_PRICE = 5000;

const CATEGORIES: {
  key: Category;
  label: string;
  icon: string;
  color: string;
  bg: string;
  gradient: string;
  desc: string;
}[] = [
  {
    key: "TELEVISORES",
    label: "Televisores",
    icon: "📺",
    color: "#2563EB",
    bg: "#EFF6FF",
    gradient: "from-[#EFF6FF] to-[#DBEAFE]",
    desc: "Smart TV, QLED, OLED y más",
  },
  {
    key: "LAVADORAS",
    label: "Lavadoras",
    icon: "🫧",
    color: "#7C3AED",
    bg: "#F5F3FF",
    gradient: "from-[#F5F3FF] to-[#EDE9FE]",
    desc: "Carga frontal, superior y secadora-lavadora",
  },
  {
    key: "FRIGORIFICOS",
    label: "Frigoríficos",
    icon: "🧊",
    color: "#0891B2",
    bg: "#ECFEFF",
    gradient: "from-[#ECFEFF] to-[#CFFAFE]",
    desc: "Combi, americano, bajo encimera",
  },
  {
    key: "LAVAVAJILLAS",
    label: "Lavavajillas",
    icon: "🍽️",
    color: "#059669",
    bg: "#ECFDF5",
    gradient: "from-[#ECFDF5] to-[#D1FAE5]",
    desc: "Integrado, libre instalación y compacto",
  },
  {
    key: "SECADORAS",
    label: "Secadoras",
    icon: "💨",
    color: "#D97706",
    bg: "#FFFBEB",
    gradient: "from-[#FFFBEB] to-[#FEF3C7]",
    desc: "Bomba de calor, condensación y evacuación",
  },
  {
    key: "HORNOS",
    label: "Hornos",
    icon: "🔥",
    color: "#DC2626",
    bg: "#FEF2F2",
    gradient: "from-[#FEF2F2] to-[#FEE2E2]",
    desc: "Integrable, sobremesa y microondas-horno",
  },
  {
    key: "MICROONDAS",
    label: "Microondas",
    icon: "📡",
    color: "#9333EA",
    bg: "#FAF5FF",
    gradient: "from-[#FAF5FF] to-[#F3E8FF]",
    desc: "Grill, convección y libre instalación",
  },
  {
    key: "ASPIRADORAS",
    label: "Aspiradoras",
    icon: "🌀",
    color: "#0369A1",
    bg: "#F0F9FF",
    gradient: "from-[#F0F9FF] to-[#E0F2FE]",
    desc: "Robot, sin cable y con bolsa",
  },
  {
    key: "CAFETERAS",
    label: "Cafeteras",
    icon: "☕",
    color: "#92400E",
    bg: "#FEF3C7",
    gradient: "from-[#FEF3C7] to-[#FDE68A]",
    desc: "Espresso, cápsulas y de goteo",
  },
  {
    key: "AIRES_ACONDICIONADOS",
    label: "Aire acondicionado",
    icon: "❄️",
    color: "#0284C7",
    bg: "#F0F9FF",
    gradient: "from-[#F0F9FF] to-[#BAE6FD]",
    desc: "Split, portátil y multisplit",
  },
];

async function getCategoriasData() {
  const counts = await prisma.product.groupBy({
    by: ["category"],
    _count: { id: true },
  });

  // Fetch 3 most recent products per category (not a global top-40)
  const topProductsPerCat = await Promise.all(
    counts.map((c) =>
      prisma.product.findMany({
        where: {
          category: c.category,
          offers: {
            some: {
              priceCurrent: { gte: MIN_REASONABLE_PRICE, lte: MAX_REASONABLE_PRICE },
            },
          },
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
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#2563EB] pt-14 pb-20 px-6 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#3B82F6] opacity-10 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 rounded-full bg-[#10B981] opacity-10 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-[#34D399] uppercase tracking-widest mb-3">Explorar</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Todas las categorías
          </h1>
          <p className="text-white/60 text-base mb-8 max-w-xl mx-auto">
            {totalProductos} producto{totalProductos !== 1 ? "s" : ""} en {categoriasConProductos} categoría{categoriasConProductos !== 1 ? "s" : ""}. Encuentra siempre el mejor precio.
          </p>

          {/* Búsqueda rápida por categoría */}
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.filter((c) => countMap[c.key]).map((cat) => (
              <a
                key={cat.key}
                href={`#${cat.key}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/80 border border-white/20 hover:bg-white/10 transition-colors"
              >
                <span>{cat.icon}</span>
                {cat.label}
                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {countMap[cat.key]}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 leading-none">
          <svg viewBox="0 0 1440 40" fill="none" className="w-full h-10">
            <path d="M0 40L720 0L1440 40V40H0V40Z" fill="#F8FAFC" />
          </svg>
        </div>
      </section>

      {/* GRID DE CATEGORIAS */}
      <section className="max-w-7xl mx-auto px-6 py-14 space-y-16">
        {CATEGORIES.map((cat) => {
          const productos = productsByCategory[cat.key] ?? [];
          const count = countMap[cat.key] ?? 0;

          return (
            <div key={cat.key} id={cat.key} className="scroll-mt-20">
              {/* Cabecera de categoría */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br ${cat.gradient} shadow-sm`}
                  >
                    {cat.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">{cat.label}</h2>
                    <p className="text-sm text-[#64748B]">
                      {count > 0 ? `${count} producto${count !== 1 ? "s" : ""}` : "Próximamente"} · {cat.desc}
                    </p>
                  </div>
                </div>
                {count > 0 && (
                  <Link
                    href={`/categorias/${cat.key.toLowerCase()}`}
                    className="hidden sm:flex items-center gap-1 text-sm font-semibold transition-colors group"
                    style={{ color: cat.color }}
                  >
                    Ver todos
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>

              {/* Productos o estado vacío */}
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

                  {/* Card "Ver todos" si hay más */}
                  {count > 3 && (
                    <Link
                      href={`/categorias/${cat.key.toLowerCase()}`}
                      className={`group bg-gradient-to-br ${cat.gradient} rounded-2xl border border-current/10 hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center gap-3 p-8 min-h-[120px]`}
                      style={{ color: cat.color }}
                    >
                      <span className="text-4xl">{cat.icon}</span>
                      <div className="text-center">
                        <p className="text-sm font-bold">{count - 3} más en {cat.label}</p>
                        <p className="text-xs opacity-70 mt-0.5">Ver todos →</p>
                      </div>
                    </Link>
                  )}
                </div>
              ) : (
                /* Categoría vacía */
                <div className={`bg-gradient-to-br ${cat.gradient} rounded-2xl border border-dashed border-current/20 p-10 flex flex-col items-center gap-3 text-center`} style={{ color: cat.color }}>
                  <span className="text-5xl opacity-40">{cat.icon}</span>
                  <div>
                    <p className="font-semibold text-sm opacity-70">Próximamente</p>
                    <p className="text-xs opacity-50 mt-0.5">Estamos añadiendo productos en esta categoría</p>
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
