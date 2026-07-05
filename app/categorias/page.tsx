export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Category } from "@/app/generated/prisma/client";
import { CategoryProductCard } from "@/components/CategoryProductCard";
import { safeData } from "@/lib/safe-data";
import { SectionChip } from "@/app/_components/SectionPrimitives";

const MIN_REASONABLE_PRICE = 20;
const MAX_REASONABLE_PRICE = 5000;

// Acento único del diseño v4 (violeta) para las tarjetas de producto.
const BRAND = "#818CF8";

const CATEGORIES: {
  key: Category;
  label: string;
  icon: string;
  desc: string;
}[] = [
  { key: "TELEVISORES",          label: "Televisores",         icon: "📺", desc: "Smart TV, QLED, OLED y más" },
  { key: "LAVADORAS",            label: "Lavadoras",           icon: "🫧", desc: "Carga frontal, superior y secadora-lavadora" },
  { key: "FRIGORIFICOS",         label: "Frigoríficos",        icon: "🧊", desc: "Combi, americano, bajo encimera" },
  { key: "LAVAVAJILLAS",         label: "Lavavajillas",        icon: "🍽️", desc: "Integrado, libre instalación y compacto" },
  { key: "SECADORAS",            label: "Secadoras",           icon: "💨", desc: "Bomba de calor, condensación y evacuación" },
  { key: "HORNOS",               label: "Hornos",              icon: "🔥", desc: "Integrable, sobremesa y microondas-horno" },
  { key: "MICROONDAS",           label: "Microondas",          icon: "📡", desc: "Grill, convección y libre instalación" },
  { key: "ASPIRADORAS",          label: "Aspiradoras",         icon: "🌀", desc: "Robot, sin cable y con bolsa" },
  { key: "CAFETERAS",            label: "Cafeteras",           icon: "☕", desc: "Espresso, cápsulas y de goteo" },
  { key: "AIRES_ACONDICIONADOS", label: "Aire acondicionado",  icon: "❄️", desc: "Split, portátil y multisplit" },
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
            orderBy: [{ inStock: "desc" }, { priceCurrent: "asc" }],
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

type CategoriasData = Awaited<ReturnType<typeof getCategoriasData>>;

export default async function CategoriasPage() {
  const { counts, topProducts } = await safeData<CategoriasData>(
    () => getCategoriasData(),
    { counts: [], topProducts: [] },
    "categorias-data",
  );

  const countMap = Object.fromEntries(counts.map((c) => [c.category, c._count.id]));

  const productsByCategory = topProducts.reduce<Record<string, typeof topProducts>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    if (acc[p.category].length < 3) acc[p.category].push(p);
    return acc;
  }, {});

  const totalProductos = counts.reduce((s, c) => s + c._count.id, 0);
  const categoriasConProductos = counts.length;

  return (
    <main className="min-h-screen bg-[#050310] text-white/90">

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/[0.05]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full halo-breathe"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.20), transparent 65%)" }}
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
          <div className="reveal">
            <SectionChip label="Catálogo" />
            <h1
              className="mb-5 mt-5 font-extrabold tracking-tight text-white"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)", lineHeight: 1.02, letterSpacing: "-0.04em", textWrap: "balance" }}
            >
              Todas las <span className="text-shimmer-violet">categorías</span>
            </h1>
            <p className="mx-auto mb-9 max-w-xl text-base text-white/50" style={{ textWrap: "pretty" }}>
              <span className="font-bold tabular text-white/85">{totalProductos.toLocaleString("es-ES")}</span> producto{totalProductos !== 1 ? "s" : ""} en{" "}
              <span className="font-bold tabular text-white/85">{categoriasConProductos}</span> categoría{categoriasConProductos !== 1 ? "s" : ""}.
              Encuentra siempre el mejor precio.
            </p>
          </div>

          {/* Chips de categoría */}
          <div className="reveal flex flex-wrap justify-center gap-2">
            {CATEGORIES.filter((c) => countMap[c.key]).map((cat) => (
              <a
                key={cat.key}
                href={`#${cat.key}`}
                className="group flex h-8 items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.025] px-3 text-xs font-semibold text-white/75 transition-colors hover:border-brand-400/40 hover:bg-brand-400/[0.08] hover:text-brand-100"
              >
                <span>{cat.icon}</span>
                {cat.label}
                <span className="rounded-full border border-brand-400/25 bg-brand-400/10 px-1.5 text-[10px] font-bold tabular text-brand-200">
                  {countMap[cat.key]}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* GRID DE CATEGORIAS */}
      <section className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6">
        {CATEGORIES.map((cat, idx) => {
          const productos = productsByCategory[cat.key] ?? [];
          const count = countMap[cat.key] ?? 0;

          return (
            <div key={cat.key} id={cat.key} className="scroll-mt-20">
              {idx > 0 && <div aria-hidden className="divider-glow mx-auto mb-16 max-w-4xl" />}

              {/* Cabecera de categoría */}
              <div className="reveal mb-6 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-400/30 text-3xl"
                    style={{
                      background: "rgba(129,140,248,0.10)",
                      boxShadow: "0 0 32px -6px rgba(129,140,248,0.4)",
                    }}
                  >
                    {cat.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-5 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-2 text-[10px] font-semibold tabular text-brand-200">
                        {count} producto{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.03em" }}>{cat.label}</h2>
                    <p className="mt-0.5 text-sm text-white/50">{cat.desc}</p>
                  </div>
                </div>
                {count > 0 && (
                  <Link
                    href={`/categorias/${cat.key.toLowerCase()}`}
                    className="hidden h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-5 text-[13px] font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/[0.06] hover:text-white active:scale-[0.97] sm:inline-flex"
                  >
                    Ver todos
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </div>

              {/* Productos */}
              {productos.length > 0 ? (
                <div className="reveal grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {productos.map((p) => (
                    <CategoryProductCard
                      key={p.id}
                      product={p}
                      catColor={BRAND}
                      catIcon={cat.icon}
                    />
                  ))}

                  {count > 3 && (
                    <Link
                      href={`/categorias/${cat.key.toLowerCase()}`}
                      className="group flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-400/30 bg-brand-400/[0.04] p-8 text-brand-200 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/50 hover:shadow-[0_24px_60px_-24px_rgba(99,102,241,0.55)]"
                    >
                      <span className="text-4xl" style={{ filter: "drop-shadow(0 0 12px rgba(129,140,248,0.5))" }}>{cat.icon}</span>
                      <div className="text-center">
                        <p className="text-sm font-bold text-white/85">{count - 3} más en {cat.label}</p>
                        <p className="mt-1 text-[12px] font-semibold text-brand-300">Ver todos →</p>
                      </div>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="reveal flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.02] p-10 text-center">
                  <span className="text-5xl opacity-40">{cat.icon}</span>
                  <p className="text-xs text-white/40">Estamos añadiendo productos en esta categoría</p>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
