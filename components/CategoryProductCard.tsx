"use client";

import { useState } from "react";
import ProductModal from "./ProductModal";
import { StockBadge } from "./StockBadge";

interface Offer {
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
  inStock?: boolean;
  updatedAt?: Date | string;
}

interface Product {
  id: string;
  slug?: string;
  name: string;
  brand: string;
  category: string;
  description: string | null;
  image: string | null;
  images: string[];
  rating: number | null;
  reviewCount: number | null;
  offers: Offer[];
}

interface Props {
  product: Product;
  catColor: string;
  catIcon: string;
}

const MIN_REASONABLE_PRICE = 20;
const MAX_REASONABLE_PRICE = 5000;

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function getRealDiscountPercent(offer: Offer | undefined): number {
  if (!offer?.priceOld) return 0;
  if (offer.priceCurrent >= offer.priceOld) return 0;
  // Tiendas de feed oficial Awin: confiamos en el descuento (ya verificado).
  // Outlets de LG / Reacondicionados ECI llegan legítimamente al 60-70%.
  const trustedStore =
    /^(LG|Fnac)$/i.test(offer.store) || offer.store.toLowerCase().includes("corte ingl");
  if (!trustedStore && offer.priceOld / offer.priceCurrent > 2.1) return 0; // descarta PVPR inflado
  return Math.round((1 - offer.priceCurrent / offer.priceOld) * 100);
}

export function CategoryProductCard({ product, catColor, catIcon }: Props) {
  const [open, setOpen] = useState(false);
  const saneOffers = product.offers.filter(
    (o) => o.priceCurrent >= MIN_REASONABLE_PRICE && o.priceCurrent <= MAX_REASONABLE_PRICE
  );
  const oferta = saneOffers[0] ?? product.offers[0];
  const thumb  = product.images?.[0] ?? product.image;
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());
  const thumbError = !!thumb && failedThumbs.has(thumb);
  const realDiscount = getRealDiscountPercent(oferta);
  const showOldPrice = !!oferta?.priceOld && realDiscount > 0;

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="group shine-on-hover bg-bg-elevated rounded-2xl border border-white/[0.08] hover:border-cyan-400/35
                   hover:shadow-[0_0_24px_-6px_rgba(94,234,212,0.35)] hover:-translate-y-0.5 transition-all duration-200
                   overflow-hidden flex cursor-pointer"
        style={{ ['--cat' as string]: catColor }}
      >
        {/* Imagen */}
        <div className="relative w-24 sm:w-28 flex-shrink-0 bg-white">
          {thumb && !thumbError ? (
            <img
              src={thumb}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-contain p-3"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => {
                if (!thumb) return;
                setFailedThumbs((prev) => {
                  if (prev.has(thumb)) return prev;
                  const nextSet = new Set(prev);
                  nextSet.add(thumb);
                  return nextSet;
                });
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-30">
              {catIcon}
            </div>
          )}
          {realDiscount > 0 && (
            <span
              className="absolute top-2 left-2 font-mono-ui text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm"
              style={{
                background: "rgba(5,6,15,0.92)",
                color: "#A3E635",
                border: "1px solid rgba(163,230,53,0.4)",
                boxShadow: "0 0 12px -2px rgba(163,230,53,0.4)",
              }}
            >
              -{realDiscount}%
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 p-3 sm:p-4 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: catColor }}>
            {product.brand}
          </p>
          <h3 className="text-sm font-semibold text-fg leading-snug line-clamp-2
                         group-hover:text-cyan-300 transition-colors mb-auto">
            {product.name}
          </h3>
          {oferta ? (
            <div className="mt-2 flex flex-col gap-1.5">
              <StockBadge
                inStock={oferta.inStock ?? true}
                productId={product.id}
                store={oferta.store}
                category={product.category}
                discountPercent={realDiscount}
                updatedAt={oferta.updatedAt}
                externalUrl={oferta.externalUrl}
                productName={product.name}
              />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-base sm:text-lg font-extrabold text-fg">
                    {formatPrice(oferta.priceCurrent)}
                  </span>
                  {showOldPrice && (
                    <span className="ml-1.5 text-xs text-fg-subtle line-through">
                      {formatPrice(oferta.priceOld!)}
                    </span>
                  )}
                </div>
                <span
                  className="text-xs font-bold text-white px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: catColor }}
                >
                  Ver →
                </span>
              </div>
              {saneOffers.length > 1 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {saneOffers.slice(0, 4).map((o) => (
                    <span
                      key={o.store}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        o.store === oferta.store
                          ? "border-cyan-400/45 bg-cyan-400/10 text-cyan-200"
                          : "border-white/10 bg-white/[0.025] text-white/55"
                      }`}
                    >
                      {o.store} {formatPrice(o.priceCurrent)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-fg-subtle">Sin oferta</p>
          )}
        </div>
      </div>

      {open && (
        <ProductModal
          product={product}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
