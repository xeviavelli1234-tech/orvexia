export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { CategoryTabs } from "./CategoryTabs";
import type { Product, Offer } from "@/app/generated/prisma/client";
import { safeData } from "@/lib/safe-data";
import { SectionChip } from "@/app/_components/SectionPrimitives";

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
    safeData<ProductWithOffers[]>(() => getBajadas(categoria), [], "bajadas-products"),
    safeData<string[]>(() => getAvailableCategories(), [], "bajadas-categories"),
    safeData(() => getStats(), { recent: 0, bestDiscount: 0 }, "bajadas-stats"),
  ]);

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
            <SectionChip label="Detección en tiempo real" />
            <h1
              className="mb-5 mt-5 font-extrabold tracking-tight text-white"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)", lineHeight: 1.02, letterSpacing: "-0.04em", textWrap: "balance" }}
            >
              Bajadas <span className="text-shimmer-violet">recientes</span>
            </h1>
            <p className="mx-auto mb-9 max-w-xl text-base leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
              Productos cuyo precio acaba de bajar. Monitorizamos cada cambio en tiempo real para que no te pierdas ninguna oportunidad.
            </p>
          </div>

          <div className="reveal mx-auto grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {stats.bestDiscount > 0 && (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-sm transition-colors hover:border-brand-400/30 sm:p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Mayor bajada</p>
                <p className="text-xl font-extrabold tabular text-white sm:text-2xl">−{stats.bestDiscount}%</p>
                <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">frente al precio anterior</p>
              </div>
            )}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-sm transition-colors hover:border-brand-400/30 sm:p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">Bajadas activas</p>
              <p className="text-xl font-extrabold tabular text-white sm:text-2xl">{stats.recent}</p>
              <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">detectadas ahora</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-sm transition-colors hover:border-brand-400/30 sm:col-span-1 sm:p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">Tiendas</p>
              <p className="text-xl font-extrabold tabular text-white sm:text-2xl">4</p>
              <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">conectadas</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        <div className="relative z-10 -mt-8 mb-8 rounded-2xl border border-white/[0.07] bg-[#0a0818]/95 p-4 shadow-[0_24px_60px_-24px_rgba(3,2,12,0.9)] backdrop-blur-md">
          <Suspense>
            <CategoryTabs categories={categories} />
          </Suspense>
        </div>

        <div className="reveal mb-6 flex items-center justify-between">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Últimos cambios de precio</p>
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-white">
              {categoria ? CATEGORY_LABELS[categoria] ?? categoria : "Todas las bajadas"}
            </h2>
          </div>
          <span className="hidden text-[12px] text-white/45 sm:block">
            <span className="font-bold tabular text-white/70">{products.length}</span> producto{products.length !== 1 ? "s" : ""}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] py-24 text-center">
            <span className="mb-4 block text-5xl">📉</span>
            <p className="text-sm text-white/45">Sin bajadas recientes en esta categoría. Vuelve en un rato.</p>
          </div>
        ) : (
          <div className="reveal grid grid-cols-3 gap-2 pb-16 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i === 0} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
