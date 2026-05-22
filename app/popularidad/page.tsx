export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { CategoryTabs } from "./CategoryTabs";
import { PopularCard } from "./PopularCard";
import { FuturisticFX } from "@/components/FuturisticFX";
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
    <main className="min-h-screen">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid-cyber opacity-50 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <FuturisticFX particleCount={6} streamCount={2} beam seed={11} />
        </div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full halo-breathe pointer-events-none"
             style={{ background: "radial-gradient(ellipse at center, rgba(168,85,247,0.22), transparent 65%)" }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-50 pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(251,191,36,0.16), transparent 65%)" }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 h-7 rounded-full bg-white/[0.04] border border-white/[0.10] font-mono-ui">
            <span className="text-sm" style={{ filter: "drop-shadow(0 0 6px rgba(251,191,36,0.6))" }}>🏆</span>
            <span className="text-[10px] uppercase tracking-wider text-white/65">
              ▸ /leaderboard · valoraciones reales
            </span>
          </div>

          <h1 className="font-extrabold tracking-tight text-white mb-5"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)", lineHeight: 1, letterSpacing: "-0.045em" }}>
            <span className="text-gradient-neon">Popularidad</span>
          </h1>
          <p className="text-white/55 text-base max-w-xl mx-auto mb-9 leading-relaxed">
            Los electrodomésticos más valorados por compradores reales. Ordenados por reseñas y puntuación.
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto">
            <div className="rounded-xl bg-white/[0.025] border border-white/[0.10] p-3 sm:p-4 backdrop-blur-sm">
              <p className="font-mono-ui text-[9px] uppercase text-fuchsia-300 mb-1">▸ db.tracked</p>
              <p className="tabular font-extrabold text-xl sm:text-2xl text-white">{stats.total.toLocaleString("es-ES")}</p>
              <p className="text-[10px] sm:text-xs text-white/45 mt-0.5">productos</p>
            </div>
            {avgRating && (
              <div className="rounded-xl bg-white/[0.025] border border-white/[0.10] p-3 sm:p-4 backdrop-blur-sm">
                <p className="font-mono-ui text-[9px] uppercase text-amber-300 mb-1">▸ avg.rating</p>
                <p className="tabular font-extrabold text-xl sm:text-2xl text-white">{avgRating}<span className="text-amber-300 ml-1">★</span></p>
                <p className="text-[10px] sm:text-xs text-white/45 mt-0.5">media</p>
              </div>
            )}
            {totalReviews > 0 && (
              <div className="rounded-xl bg-white/[0.025] border border-white/[0.10] p-3 sm:p-4 backdrop-blur-sm">
                <p className="font-mono-ui text-[9px] uppercase text-cyan-300 mb-1">▸ db.reviews</p>
                <p className="tabular font-extrabold text-xl sm:text-2xl text-white">{(totalReviews / 1000).toFixed(1)}k</p>
                <p className="text-[10px] sm:text-xs text-white/45 mt-0.5">analizadas</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        <div className="relative z-10 -mt-8 mb-8 bg-bg-elevated rounded-2xl border border-white/[0.10]
                        shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] p-4">
          <Suspense>
            <CategoryTabs categories={categories} />
          </Suspense>
        </div>

        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-wider text-fuchsia-300 mb-1">
              ▸ /ranking/{(categoria || "all").toLowerCase()}
            </p>
            <h2 className="text-2xl font-bold text-white">
              {categoria ? `${CATEGORY_LABELS[categoria] ?? categoria} más valorados` : "Los más valorados"}
            </h2>
          </div>
          <span className="font-mono-ui text-[11px] uppercase tracking-wider text-white/45 hidden sm:block">
            top {products.length.toString().padStart(2, "0")}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 bg-bg-elevated rounded-3xl border border-white/[0.08]">
            <span className="text-5xl block mb-4">📭</span>
            <p className="font-mono-ui text-[11px] uppercase tracking-wider text-white/45">
              no_data · stand_by
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
