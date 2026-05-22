export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { CategoryTabs } from "./CategoryTabs";
import { FuturisticFX } from "@/components/FuturisticFX";
import type { Product, Offer } from "@/app/generated/prisma/client";

type ProductWithOffers = Product & { offers: Offer[] };

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aires A/C", OTROS: "Otros",
};

async function getBajadas(categoria: string): Promise<ProductWithOffers[]> {
  return prisma.product.findMany({
    where: {
      ...(categoria ? { category: categoria as never } : {}),
      offers: { some: { priceOld: { not: null } } },
    },
    include: { offers: { orderBy: { updatedAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });
}

async function getAvailableCategories(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    select: { category: true },
    distinct: ["category"],
    where: { offers: { some: { priceOld: { not: null } } } },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category as string);
}

async function getStats() {
  const recent = await prisma.offer.count({ where: { priceOld: { not: null } } });
  const best = await prisma.offer.findFirst({
    where: { discountPercent: { gt: 0 } },
    orderBy: { discountPercent: "desc" },
    select: { discountPercent: true },
  });
  return { recent, bestDiscount: best?.discountPercent ?? 0 };
}

export default async function BajadasRecientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp        = await searchParams;
  const categoria = String(sp.categoria ?? "");

  const [products, categories, stats] = await Promise.all([
    getBajadas(categoria),
    getAvailableCategories(),
    getStats(),
  ]);

  return (
    <main className="min-h-screen">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid-cyber opacity-50 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <FuturisticFX particleCount={6} streamCount={3} beam seed={7} />
        </div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full halo-breathe pointer-events-none"
             style={{ background: "radial-gradient(ellipse at center, rgba(16,185,129,0.25), transparent 65%)" }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-50 pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(94,234,212,0.20), transparent 65%)" }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 h-7 rounded-full bg-white/[0.04] border border-white/[0.10] font-mono-ui">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/65">
              ▸ /price_drops · stream
            </span>
          </div>

          <h1 className="font-extrabold tracking-tight text-white mb-5"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)", lineHeight: 1, letterSpacing: "-0.045em" }}>
            Bajadas <span className="text-gradient-neon">recientes</span>
          </h1>
          <p className="text-white/55 text-base max-w-xl mx-auto mb-9 leading-relaxed">
            Productos cuyo precio acaba de bajar. Monitorizamos cada cambio en tiempo real para que no te pierdas ninguna oportunidad.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto">
            {stats.bestDiscount > 0 && (
              <div className="rounded-xl bg-white/[0.025] border border-white/[0.10] p-3 sm:p-4 backdrop-blur-sm">
                <p className="font-mono-ui text-[9px] uppercase text-lime-300 mb-1">▸ max.drop</p>
                <p className="tabular font-extrabold text-xl sm:text-2xl text-white">-{stats.bestDiscount}%</p>
                <p className="text-[10px] sm:text-xs text-white/45 mt-0.5">mayor bajada</p>
              </div>
            )}
            <div className="rounded-xl bg-white/[0.025] border border-white/[0.10] p-3 sm:p-4 backdrop-blur-sm">
              <p className="font-mono-ui text-[9px] uppercase text-emerald-300 mb-1">▸ db.detected</p>
              <p className="tabular font-extrabold text-xl sm:text-2xl text-white">{stats.recent}</p>
              <p className="text-[10px] sm:text-xs text-white/45 mt-0.5">bajadas activas</p>
            </div>
            <div className="rounded-xl bg-white/[0.025] border border-white/[0.10] p-3 sm:p-4 backdrop-blur-sm col-span-2 sm:col-span-1">
              <p className="font-mono-ui text-[9px] uppercase text-cyan-300 mb-1">▸ sync.nodes</p>
              <p className="tabular font-extrabold text-xl sm:text-2xl text-white">4</p>
              <p className="text-[10px] sm:text-xs text-white/45 mt-0.5">tiendas conectadas</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        <div className="relative z-10 -mt-8 mb-8 bg-bg-elevated rounded-2xl border border-white/[0.10] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] p-4">
          <Suspense>
            <CategoryTabs categories={categories} />
          </Suspense>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-wider text-emerald-300 mb-1">
              ▸ /stream/{(categoria || "all").toLowerCase()}
            </p>
            <h2 className="text-2xl font-bold text-white leading-tight">
              {categoria ? CATEGORY_LABELS[categoria] ?? categoria : "Todas las bajadas"}
            </h2>
          </div>
          <span className="font-mono-ui text-[11px] uppercase tracking-wider text-white/45 hidden sm:block">
            {products.length.toString().padStart(2, "0")} item{products.length !== 1 ? "s" : ""}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 bg-bg-elevated rounded-3xl border border-white/[0.08]">
            <span className="text-5xl block mb-4">📉</span>
            <p className="font-mono-ui text-[11px] uppercase tracking-wider text-white/45">
              no_drops · stand_by
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-5 pb-16">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i === 0} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
