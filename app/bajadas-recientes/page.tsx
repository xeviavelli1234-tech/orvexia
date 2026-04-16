export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { CategoryTabs } from "./CategoryTabs";
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
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* Hero */}
      <section
        className="relative overflow-hidden pt-20 pb-24 px-6 text-center"
        style={{ background: "linear-gradient(150deg, #0F172A 0%, #064E3B 55%, #059669 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-emerald-400 opacity-10 blur-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-teal-300 opacity-10 blur-3xl" />
          <div className="absolute -bottom-16 left-0 right-0 h-24 bg-[#F8FAFC] rounded-t-[32px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
            Precios actualizados en tiempo real
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Bajadas recientes
          </h1>
          <p className="text-emerald-200 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Productos cuyo precio ha bajado recientemente. Detectamos cada cambio
            para que no te pierdas ninguna oportunidad.
          </p>

          <div className="flex flex-wrap justify-center gap-3 text-sm text-white/80">
            {stats.bestDiscount > 0 && (
              <span className="px-3 py-2 rounded-full bg-white/10 border border-white/15">
                📉 Hasta -{stats.bestDiscount}% de bajada
              </span>
            )}
            <span className="px-3 py-2 rounded-full bg-white/10 border border-white/15">
              🔄 {stats.recent} bajada{stats.recent !== 1 ? "s" : ""} detectada{stats.recent !== 1 ? "s" : ""}
            </span>
            <span className="px-3 py-2 rounded-full bg-white/10 border border-white/15">
              🏬 Amazon · MediaMarkt · PC Componentes
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6">

        {/* Category tabs */}
        <div className="relative z-10 -mt-12 mb-8 bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_18px_48px_-24px_rgba(15,23,42,0.2)] p-4">
          <Suspense>
            <CategoryTabs categories={categories} />
          </Suspense>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-1 h-10 rounded-full" style={{ backgroundImage: "linear-gradient(180deg, #059669, #34D399)" }} />
            <div>
              <span className="inline-block text-[10px] font-bold text-[#059669] uppercase tracking-[0.15em] mb-0.5">
                {categoria ? CATEGORY_LABELS[categoria] ?? categoria : "Todas las categorías"}
              </span>
              <h2 className="text-2xl font-bold text-[#0F172A] leading-tight">Bajadas recientes</h2>
            </div>
          </div>
          <span className="text-sm text-[#94A3B8] hidden sm:block">
            {products.length} producto{products.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-[#E2E8F0]">
            <span className="text-5xl block mb-4">📉</span>
            <p className="text-[#94A3B8] text-sm font-medium">
              No hay bajadas detectadas en esta categoría todavía.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i === 0} />
          ))}
        </div>
      )}
      </div>
    </main>
  );
}
