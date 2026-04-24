export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { SortBar } from "./SortBar";
import type { Product, Offer } from "@/app/generated/prisma/client";

type ProductWithOffers = Product & { offers: Offer[] };

function realDiscountPercent(p: ProductWithOffers): number {
  const o = p.offers[0];
  if (!o?.priceOld || o.priceCurrent >= o.priceOld) return 0;
  return Math.round((1 - o.priceCurrent / o.priceOld) * 100);
}

function isRealDeal(p: ProductWithOffers): boolean {
  const o = p.offers[0];
  if (!o?.priceOld) return false;
  const savings = o.priceOld - o.priceCurrent;
  const ratio   = o.priceOld / o.priceCurrent;
  return (
    o.priceCurrent < o.priceOld &&
    ratio <= 2.5 &&
    savings >= 3 &&
    savings / o.priceOld >= 0.03
  );
}

async function getFeaturedDeals(orden: string): Promise<ProductWithOffers[]> {
  const products = await prisma.product.findMany({
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    where: { offers: { some: {} } },
    orderBy: { createdAt: "desc" },
  });

  // Solo mostrar productos con descuento verificado (ratio <= 2.5)
  const realDeals = products.filter(isRealDeal);
  const realDealIds = new Set(realDeals.map((p) => p.id));

  const recentPcTv = products.filter(
    (p) =>
      !realDealIds.has(p.id) &&
      p.category === "TELEVISORES" &&
      p.offers.some((o) => o.store.toLowerCase().includes("pccomponente"))
  );

  const list = [...realDeals, ...recentPcTv];

  switch (orden) {
    case "price_asc":
      list.sort((a, b) => (a.offers[0]?.priceCurrent ?? 0) - (b.offers[0]?.priceCurrent ?? 0));
      break;
    case "price_desc":
      list.sort((a, b) => (b.offers[0]?.priceCurrent ?? 0) - (a.offers[0]?.priceCurrent ?? 0));
      break;
    case "savings_desc":
      list.sort((a, b) => {
        const sav = (p: ProductWithOffers) => {
          const o = p.offers[0];
          return o?.priceOld && o.priceCurrent < o.priceOld ? o.priceOld - o.priceCurrent : 0;
        };
        return sav(b) - sav(a);
      });
      break;
    case "most_stores":
      list.sort((a, b) => b.offers.length - a.offers.length);
      break;
    default: // discount_desc
      list.sort((a, b) => realDiscountPercent(b) - realDiscountPercent(a));
  }

  return list;
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
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6 text-center"
        style={{ background: "linear-gradient(150deg,#0F172A 0%,#1E3A8A 55%,#2563EB 100%)" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-400 opacity-10 blur-3xl" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-300 opacity-10 blur-3xl" />
          <div className="absolute -bottom-16 left-0 right-0 h-24 bg-[#F8FAFC] rounded-t-[32px]" />
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
        <div className="relative z-10 -mt-12 mb-8 bg-white rounded-2xl border border-[#E2E8F0]
                        shadow-[0_18px_48px_-24px_rgba(15,23,42,0.2)] p-4">
          <Suspense>
            <SortBar />
          </Suspense>
        </div>

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-1">
              Selección premium
            </p>
            <h2 className="text-2xl font-bold text-[#0F172A]">Ofertas verificadas</h2>
          </div>
          <span className="text-sm text-[#94A3B8] hidden sm:block">
            Mostrando {deals.length} oferta{deals.length !== 1 ? "s" : ""} con {SORT_LABEL[orden] ?? "mayor descuento"}
          </span>
        </div>

        {/* Grid */}
        {deals.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-[#E2E8F0]">
            <p className="text-5xl mb-4">⌛</p>
            <p className="text-[#94A3B8] text-sm font-medium">No hay ofertas disponibles ahora mismo.</p>
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


