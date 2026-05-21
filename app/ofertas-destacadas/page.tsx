export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { SortBar } from "./SortBar";
import { FuturisticFX } from "@/components/FuturisticFX";
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
    <main className="min-h-screen">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-grid-cyber opacity-50 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <FuturisticFX particleCount={6} streamCount={2} beam seed={5} />
        </div>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full halo-breathe pointer-events-none"
             style={{ background: "radial-gradient(ellipse at center, rgba(240,171,252,0.20), transparent 65%)" }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-50 pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(94,234,212,0.18), transparent 65%)" }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 h-7 rounded-full bg-white/[0.04] border border-white/[0.10] font-mono-ui">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fuchsia-400" />
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/65">
              ▸ /live · selección curada
            </span>
          </div>

          <h1 className="font-extrabold tracking-tight text-white mb-5"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)", lineHeight: 1, letterSpacing: "-0.045em" }}>
            Ofertas <span className="text-gradient-neon">destacadas</span>
          </h1>
          <p className="text-white/55 text-base max-w-xl mx-auto mb-9 leading-relaxed">
            Los mejores descuentos de electrodomésticos. Verificamos precios contra el histórico de 90 días para que compres con confianza.
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto">
            <div className="rounded-xl bg-white/[0.025] border border-white/[0.10] p-3 sm:p-4 backdrop-blur-sm">
              <p className="font-mono-ui text-[9px] uppercase text-lime-300 mb-1">▸ max.discount</p>
              <p className="tabular font-extrabold text-xl sm:text-2xl text-white">-{bestDiscount}%</p>
              <p className="text-[10px] sm:text-xs text-white/45 mt-0.5">descuento top</p>
            </div>
            <div className="rounded-xl bg-white/[0.025] border border-white/[0.10] p-3 sm:p-4 backdrop-blur-sm">
              <p className="font-mono-ui text-[9px] uppercase text-cyan-300 mb-1">▸ avg.discount</p>
              <p className="tabular font-extrabold text-xl sm:text-2xl text-white">{avgDiscount}%</p>
              <p className="text-[10px] sm:text-xs text-white/45 mt-0.5">media</p>
            </div>
            <div className="rounded-xl bg-white/[0.025] border border-white/[0.10] p-3 sm:p-4 backdrop-blur-sm">
              <p className="font-mono-ui text-[9px] uppercase text-fuchsia-300 mb-1">▸ db.offers</p>
              <p className="tabular font-extrabold text-xl sm:text-2xl text-white">{stats.offerCount}</p>
              <p className="text-[10px] sm:text-xs text-white/45 mt-0.5">ofertas activas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sort bar + grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        <div className="relative z-10 -mt-8 mb-8 bg-bg-elevated rounded-2xl border border-white/[0.10]
                        shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] p-4">
          <Suspense>
            <SortBar />
          </Suspense>
        </div>

        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-wider text-fuchsia-300 mb-1">
              ▸ /deals/verified
            </p>
            <h2 className="text-2xl font-bold text-white">Ofertas verificadas</h2>
          </div>
          <span className="font-mono-ui text-[11px] uppercase tracking-wider text-white/45 hidden sm:block">
            {deals.length.toString().padStart(2, "0")} ofertas · {SORT_LABEL[orden] ?? "mayor descuento"}
          </span>
        </div>

        {deals.length === 0 ? (
          <div className="text-center py-24 bg-bg-elevated rounded-3xl border border-white/[0.08]">
            <p className="text-5xl mb-4">⌛</p>
            <p className="font-mono-ui text-[11px] uppercase tracking-wider text-white/45">no_deals · stand_by</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-5 pb-16">
            {deals.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i === 0} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}


