"use client";

import Image from "next/image";
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

export function CategoryProductCard({ product, catColor, catIcon }: Props) {
  const [open, setOpen] = useState(false);
  const saneOffers = product.offers.filter(
    (o) => o.priceCurrent >= MIN_REASONABLE_PRICE && o.priceCurrent <= MAX_REASONABLE_PRICE
  );
  const oferta = saneOffers[0] ?? product.offers[0];
  const thumb  = product.images?.[0] ?? product.image;

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="group bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#2563EB]/40
                   hover:shadow-[0_8px_32px_-8px_rgba(37,99,235,0.15)] transition-all duration-200
                   overflow-hidden flex cursor-pointer"
      >
        {/* Imagen */}
        <div className="relative w-28 flex-shrink-0 bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF]">
          {thumb ? (
            <Image
              src={thumb}
              alt={product.name}
              fill
              className="object-contain p-3"
              sizes="112px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-30">
              {catIcon}
            </div>
          )}
          {typeof oferta?.discountPercent === "number" && oferta.discountPercent > 0 && (
            <span className="absolute top-2 left-2 bg-[#EF4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              -{oferta.discountPercent}%
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 p-4 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: catColor }}>
            {product.brand}
          </p>
          <h3 className="text-sm font-semibold text-[#0F172A] leading-snug line-clamp-2
                         group-hover:text-[#2563EB] transition-colors mb-auto">
            {product.name}
          </h3>
          {oferta ? (
            <div className="mt-2 flex flex-col gap-1.5">
              <StockBadge
                inStock={oferta.inStock ?? true}
                productId={product.id}
                store={oferta.store}
                category={product.category}
                discountPercent={oferta.discountPercent}
                updatedAt={oferta.updatedAt}
                externalUrl={oferta.externalUrl}
              />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-extrabold text-[#0F172A]">
                    {formatPrice(oferta.priceCurrent)}
                  </span>
                  {oferta.priceOld && (
                    <span className="ml-1.5 text-xs text-[#94A3B8] line-through">
                      {formatPrice(oferta.priceOld)}
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
                          ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]"
                      }`}
                    >
                      {o.store} {formatPrice(o.priceCurrent)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#94A3B8]">Sin oferta</p>
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
