export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { CategoryTabs } from "./CategoryTabs";
import { PopularCard } from "./PopularCard";
import type { Product, Offer } from "@/app/generated/prisma/client";

type ProductWithOffers = Product & { offers: Offer[] };

// ─── Labels ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aires A/C", OTROS: "Otros",
};

const CATEGORY_EMOJI: Record<string, string> = {
  TELEVISORES: "📺", LAVADORAS: "🫧", FRIGORIFICOS: "🧊", LAVAVAJILLAS: "🍽️",
  SECADORAS: "🌀", HORNOS: "🔥", MICROONDAS: "📻", ASPIRADORAS: "🌪️",
  CAFETERAS: "☕", AIRES_ACONDICIONADOS: "❄️", OTROS: "📦",
};

// ─── Queries ──────────────────────────────────────────────────────────────────

async function getProducts(categoria: string): Promise<ProductWithOffers[]> {
  const products = await prisma.product.findMany({
    where: {
      ...(categoria ? { category: categoria as never } : {}),
      offers: { some: {} },
    },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
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

// ─── Stars ────────────────────────────────────────────────────────────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PopularidadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp        = await searchParams;
  const categoria = String(sp.categoria ?? "");

  const [products, categories, stats] = await Promise.all([
    getProducts(categoria),
    getAvailableCategories(),
    getStats(),
  ]);

  const totalReviews = products.reduce((s, p) => s + (p.reviewCount ?? 0), 0);
  const avgRating = products.filter((p) => p.rating != null).length > 0
    ? (products.reduce((s, p) => s + (p.rating ?? 0), 0) /
       products.filter((p) => p.rating != null).length).toFixed(1)
    : null;

  return (
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6 text-center"
        style={{ background: "linear-gradient(150deg,#1E1B4B 0%,#4C1D95 50%,#7C3AED 100%)" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-purple-400 opacity-10 blur-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-violet-300 opacity-10 blur-3xl" />
          <div className="absolute -bottom-16 left-0 right-0 h-24 bg-[#F8FAFC] rounded-t-[32px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white/90">
            <span className="text-base">🏆</span>
            Ranking basado en valoraciones reales
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Popularidad
          </h1>
          <p className="text-purple-200 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Los electrodomésticos más valorados por compradores reales. Ordenados por reseñas y puntuación.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-3 text-sm text-white/80">
            <span className="px-3 py-2 rounded-full bg-white/10 border border-white/15">
              🏅 {stats.total} productos monitorizados
            </span>
            {avgRating && (
              <span className="px-3 py-2 rounded-full bg-white/10 border border-white/15">
                ⭐ Media {avgRating} estrellas
              </span>
            )}
            {totalReviews > 0 && (
              <span className="px-3 py-2 rounded-full bg-white/10 border border-white/15">
                💬 {totalReviews.toLocaleString("es-ES")} reseñas analizadas
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Category tabs + grid ──────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6">

        {/* Tabs */}
        <div className="relative z-10 -mt-12 mb-8 bg-white rounded-2xl border border-[#E2E8F0]
                        shadow-[0_18px_48px_-24px_rgba(15,23,42,0.2)] p-4">
          <Suspense>
            <CategoryTabs categories={categories} />
          </Suspense>
        </div>

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-1">
              Ranking de popularidad
            </p>
            <h2 className="text-2xl font-bold text-[#0F172A]">
              {categoria ? `${CATEGORY_LABELS[categoria] ?? categoria} más valorados` : "Los más valorados"}
            </h2>
          </div>
          <span className="text-sm text-[#94A3B8] hidden sm:block">
            {products.length} producto{products.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-[#E2E8F0]">
            <span className="text-5xl block mb-4">📭</span>
            <p className="text-[#94A3B8] text-sm font-medium">
              No hay productos con valoraciones en esta categoría todavía.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
            {products.map((p, i) => (
              <PopularCard key={p.id} product={p} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
