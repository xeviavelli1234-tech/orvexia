export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { SortBar } from "./SortBar";
import { getRealDeals, type DealOrder, type DealProduct } from "@/lib/deals";
import { safeData } from "@/lib/safe-data";
import { SectionChip } from "@/app/_components/SectionPrimitives";

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

  const [deals, stats] = await Promise.all([
    safeData<DealProduct[]>(() => getFeaturedDeals(orden), [], "ofertas-deals"),
    safeData(() => getStats(), { productCount: 0, offerCount: 0 }, "ofertas-stats"),
  ]);

  const bestDiscount = deals.length
    ? Math.max(...deals.map((p) => realDiscountPercent(p)))
    : 0;
  const avgDiscount = deals.length
    ? Math.round(deals.reduce((s, p) => s + realDiscountPercent(p), 0) / deals.length)
    : 0;

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
            <SectionChip label="Selección curada" />
            <h1
              className="mb-5 mt-5 font-extrabold tracking-tight text-white"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)", lineHeight: 1.02, letterSpacing: "-0.04em", textWrap: "balance" }}
            >
              Ofertas <span className="text-shimmer-violet">destacadas</span>
            </h1>
            <p className="mx-auto mb-9 max-w-xl text-base leading-relaxed text-white/50" style={{ textWrap: "pretty" }}>
              Los mejores descuentos de electrodomésticos. Verificamos precios contra el histórico de 90 días para que compres con confianza.
            </p>
          </div>

          <div className="reveal mx-auto grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-sm transition-colors hover:border-brand-400/30 sm:p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">Descuento top</p>
              <p className="text-xl font-extrabold tabular text-white sm:text-2xl">−{bestDiscount}%</p>
              <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">verificado hoy</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-sm transition-colors hover:border-brand-400/30 sm:p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">Media</p>
              <p className="text-xl font-extrabold tabular text-white sm:text-2xl">{avgDiscount}%</p>
              <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">de descuento</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 backdrop-blur-sm transition-colors hover:border-brand-400/30 sm:p-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">Ofertas activas</p>
              <p className="text-xl font-extrabold tabular text-white sm:text-2xl">{stats.offerCount}</p>
              <p className="mt-0.5 text-[10px] text-white/45 sm:text-xs">en seguimiento</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sort bar + grid */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        <div className="relative z-10 -mt-8 mb-8 rounded-2xl border border-white/[0.07] bg-[#0a0818]/95 p-4 shadow-[0_24px_60px_-24px_rgba(3,2,12,0.9)] backdrop-blur-md">
          <Suspense>
            <SortBar />
          </Suspense>
        </div>

        <div className="reveal mb-6 flex items-end justify-between">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Verificadas contra histórico</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Ofertas verificadas</h2>
          </div>
          <span className="hidden text-[12px] text-white/45 sm:block">
            <span className="font-bold tabular text-white/70">{deals.length}</span> ofertas · {SORT_LABEL[orden] ?? "mayor descuento"}
          </span>
        </div>

        {deals.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] py-24 text-center">
            <p className="mb-4 text-5xl">⌛</p>
            <p className="text-sm text-white/45">Ahora mismo no hay ofertas verificadas. Vuelve en un rato.</p>
          </div>
        ) : (
          <div className="reveal grid grid-cols-3 gap-2 pb-16 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3">
            {deals.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i === 0} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
