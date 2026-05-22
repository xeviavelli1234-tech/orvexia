export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { SortBar } from "./SortBar";
import { getRealDeals, type DealOrder, type DealProduct } from "@/lib/deals";

function realDiscountPercent(p: DealProduct): number {
  const o = p.offers[0];
  if (!o?.priceOld || o.priceCurrent >= o.priceOld) return 0;
  return Math.round((1 - o.priceCurrent / o.priceOld) * 100);
}

const VALID_ORDERS: Record<string, DealOrder> = {
  price_asc:     "price_asc",
  price_desc:    "price_desc",
  savings_desc:  "savings_desc",
  most_stores:   "most_stores",
  discount_desc: "discount_desc",
};

async function getFeaturedDeals(orden: string): Promise<DealProduct[]> {
  const order = VALID_ORDERS[orden] ?? "discount_desc";
  return getRealDeals({ order, limit: 60 });
}

async function getStats() {
  const [productCount, offerCount] = await Promise.all([
    prisma.product.count(),
    prisma.offer.count(),
  ]);
  return { productCount, offerCount };
}

const SORT_LABEL: Record<string, string> = {
  discount_desc: "mayor descuento",
  price_asc:     "precio más bajo",
  price_desc:    "precio más alto",
  savings_desc:  "mayor ahorro",
  most_stores:   "más tiendas",
};

export default async function OfertasDestacadasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp    = await searchParams;
  const orden = String(sp.orden ?? "discount_desc");

  const [deals, stats] = await Promise.all([getFeaturedDeals(orden), getStats()]);

  const bestDiscount = deals.length
    ? Math.max(...deals.map((p) => realDiscountPercent(p)))
    : 0;
  const avgDiscount = deals.length
    ? Math.round(deals.reduce((s, p) => s + realDiscountPercent(p), 0) / deals.length)
    : 0;

  return (
    <main className="min-h-screen bg-bg-subtle">

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6 text-center"
        style={{ background: "linear-gradient(150deg,#0F172A 0%,#1E3A8A 55%,#2563EB 100%)" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-400 opacity-10 blur-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-300 opacity-10 blur-3xl" />
          <div className="absolute -bottom-16 left-0 right-0 h-24 bg-bg-subtle rounded-t-[32px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs font-semibold text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            Selección curada con descuentos reales
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Ofertas destacadas
          </h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Los mejores descuentos de electrodomésticos en un solo lugar.
            Verificamos precios en tiempo real para que compres con confianza.
          </p>

          <div className="flex flex-wrap justify-center gap-3 text-sm text-white/80">
            {bestDiscount > 0 && (
              <span className="px-3 py-2 rounded-full bg-white/10 border border-white/15">
                Hasta -{bestDiscount}% hoy
              </span>
            )}
            {avgDiscount > 0 && (
              <span className="px-3 py-2 rounded-full bg-white/10 border border-white/15">
                Descuento medio {avgDiscount}%
              </span>
            )}
            <span className="px-3 py-2 rounded-full bg-white/10 border border-white/15">
              {stats.offerCount} ofertas · {stats.productCount} productos
            </span>
          </div>
        </div>
      </section>

      {/* Sort bar + grid */}
      <div className="max-w-6xl mx-auto px-6">

        {/* Sort bar - overlapping card, same pattern that popularidad uses */}
        <div className="relative z-10 -mt-12 mb-8 bg-bg-elevated rounded-2xl border border-border
                        shadow-[0_18px_48px_-24px_rgba(15,23,42,0.2)] p-4">
          <Suspense>
            <SortBar />
          </Suspense>
        </div>

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">
              Selección premium
            </p>
            <h2 className="text-2xl font-bold text-fg">Ofertas verificadas</h2>
          </div>
          <span className="text-sm text-fg-subtle hidden sm:block">
            Mostrando {deals.length} oferta{deals.length !== 1 ? "s" : ""} con {SORT_LABEL[orden] ?? "mayor descuento"}
          </span>
        </div>

        {/* Grid */}
        {deals.length === 0 ? (
          <div className="text-center py-24 bg-bg-elevated rounded-3xl border border-border">
            <p className="text-5xl mb-4">⌛</p>
            <p className="text-fg-subtle text-sm font-medium">No hay ofertas disponibles ahora mismo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
            {deals.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i === 0} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}


