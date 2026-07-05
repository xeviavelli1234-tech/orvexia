export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { CategoryTabs } from "./CategoryTabs";
import { PopularCard } from "./PopularCard";
import type { Product, Offer } from "@/app/generated/prisma/client";
import { safeData } from "@/lib/safe-data";
import { SectionChip } from "@/app/_components/SectionPrimitives";

type ProductWithOffers = Product & { offers: Offer[] };

// ─── Labels ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aires A/C", OTROS: "Otros",
};

// ─── Queries ──────────────────────────────────────────────────────────────────

async function getProducts(categoria: string): Promise<ProductWithOffers[]> {
  const products = await prisma.product.findMany({
    where: {
      ...(categoria ? { category: categoria as never } : {}),
      offers: { some: {} },
    },
    include: { offers: { orderBy: [{ inStock: "desc" }, { priceCurrent: "asc" }] } },
    orderBy: [{ reviewCount: "desc" }, { rating: "desc" }],
    take: 9,
  });
  return products;
}

async function getAvailableCategories(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    select: { category: true },
    distinct: ["category"],
    where: { offers: { some: {} } },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category as string);
}

async function getStats() {
  const [total, withRating] = await Promise.all([
    prisma.product.count({ where: { offers: { some: {} } } }),
    prisma.product.findFirst({
      where: { reviewCount: { gt: 0 } },
      orderBy: { reviewCount: "desc" },
      select: { name: true, reviewCount: true, rating: true },
    }),
  ]);
  return { total, topProduct: withRating };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PopularidadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp        = await searchParams;
  const categoria = String(sp.categoria ?? "");

  const [products, categories, stats] = await Promise.all([
    safeData<ProductWithOffers[]>(() => getProducts(categoria), [], "popularidad-products"),
    safeData<string[]>(() => getAvailableCategories(), [], "popularidad-categories"),
    safeData(() => getStats(), { total: 0, topProduct: null }, "popularidad-stats"),
  ]);

  const totalReviews = products.reduce((s, p) => s + (p.reviewCount ?? 0), 0);
  const avgRating = products.filter((p) => p.rating != null).length > 0
    ? (products.reduce((s, p) => s + (p.rating ?? 0), 0) /
       products.filter((p) => p.rating != null).length).toFixed(1)
    : null;

  return (
    <main className="min-h-screen bg-[#050310] text-white/90">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.05]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full halo-breathe"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.20), transparent 65%)" }}
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
          <div className="reveal">
            <SectionChip label="Valoraciones reales" />
            <h1
              className="mb-5 mt-5 font-extrabold tracking-tight text-white"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)", lineHeight: 1.02, letterSpacing: "-0.04em", textWrap: "balance" }}
            >
              <span className="text-shimmer-violet">Popularidad</span>
            </h1>
            <p className="mx-auto mb-9 max-w-xl text-base leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
              Los electrodomésticos más valorados por compradores reales. Ordenados por reseñas y puntuación.
            </p>
          </div>

          <div className="reveal mx-auto grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-sm transition-colors hover:border-brand-400/30 sm:p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">Productos</p>
              <p className="text-xl font-extrabold tabular text-white sm:text-2xl">{stats.total.toLocaleString("es-ES")}</p>
              <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">en seguimiento</p>
            </div>
            {avgRating && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-sm transition-colors hover:border-brand-400/30 sm:p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">Nota media</p>
                <p className="text-xl font-extrabold tabular text-white sm:text-2xl">{avgRating}<span className="ml-1 text-amber-300">★</span></p>
                <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">del top actual</p>
              </div>
            )}
            {totalReviews > 0 && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-sm transition-colors hover:border-brand-400/30 sm:p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">Reseñas</p>
                <p className="text-xl font-extrabold tabular text-white sm:text-2xl">{(totalReviews / 1000).toFixed(1)}k</p>
                <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">analizadas</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        <div className="relative z-10 -mt-8 mb-8 rounded-2xl border border-white/[0.07] bg-[#0a0818]/95 p-4 shadow-[0_24px_60px_-24px_rgba(3,2,12,0.9)] backdrop-blur-md">
          <Suspense>
            <CategoryTabs categories={categories} />
          </Suspense>
        </div>

        <div className="reveal mb-6 flex items-end justify-between">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Ranking por valoraciones</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              {categoria ? `${CATEGORY_LABELS[categoria] ?? categoria} más valorados` : "Los más valorados"}
            </h2>
          </div>
          <span className="hidden text-[12px] text-white/45 sm:block">
            top <span className="font-bold tabular text-white/70">{products.length}</span>
          </span>
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] py-24 text-center">
            <span className="mb-4 block text-5xl">📭</span>
            <p className="text-sm text-white/45">Aún no hay valoraciones suficientes en esta categoría.</p>
          </div>
        ) : (
          <div className="reveal grid grid-cols-1 gap-5 pb-16 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <PopularCard key={p.id} product={p} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
