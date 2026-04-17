"use client";

import Image from "next/image";
import { useState } from "react";
import ProductModal from "@/components/ProductModal";

const CATEGORY_EMOJI: Record<string, string> = {
  TELEVISORES: "📺", LAVADORAS: "🫧", FRIGORIFICOS: "🧊", LAVAVAJILLAS: "🍽️",
  SECADORAS: "🌀", HORNOS: "🔥", MICROONDAS: "📻", ASPIRADORAS: "🌪️",
  CAFETERAS: "☕", AIRES_ACONDICIONADOS: "❄️", OTROS: "📦",
};

interface Offer {
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
}

interface Product {
  id: string;
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

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled  = rating >= i;
        const partial = !filled && rating >= i - 0.5;
        return (
          <svg key={i} className="w-3 h-3" viewBox="0 0 20 20">
            {partial ? (
              <>
                <defs><clipPath id={`ch-half-${i}-${rating}`}><rect x="0" y="0" width="10" height="20" /></clipPath></defs>
                <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.62l5.34-.78z" fill="#E2E8F0" />
                <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.62l5.34-.78z" fill="#F59E0B" clipPath={`url(#ch-half-${i}-${rating})`} />
              </>
            ) : (
              <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.62l5.34-.78z" fill={filled ? "#F59E0B" : "#E2E8F0"} />
            )}
          </svg>
        );
      })}
    </div>
  );
}

export function CholloCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const best = product.offers[0];
  const savings  = best?.priceOld && best.priceCurrent < best.priceOld ? best.priceOld - best.priceCurrent : null;
  const realDiscount = best?.priceOld != null &&
    best.priceCurrent < best.priceOld &&
    best.priceOld / best.priceCurrent <= 1.40
    ? Math.round((1 - best.priceCurrent / best.priceOld) * 100)
    : 0;
  const catEmoji = CATEGORY_EMOJI[product.category] ?? "📦";
  const cardImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images : product.image ? [product.image] : [];

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="group flex flex-col bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden
                   hover:shadow-xl hover:border-[#D97706]/30 transition-all duration-200 cursor-pointer"
      >
        {/* Image */}
        <div className="relative h-48 bg-[#FFFBEB] flex items-center justify-center">
          {cardImages.length > 0 ? (
            <Image src={cardImages[0]} alt={product.name} fill className="object-contain p-5"
              sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw" />
          ) : (
            <span className="text-5xl">{catEmoji}</span>
          )}
          {/* Discount badge — solo si hay rebaja real */}
          {realDiscount > 0 && (
            <span className="absolute top-3 right-3 bg-[#D97706] text-white text-sm font-black px-2.5 py-1 rounded-xl shadow-md">
              -{realDiscount}%
            </span>
          )}
          {/* Savings pill */}
          {savings && savings > 0 && (
            <span className="absolute bottom-3 left-3 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow">
              Ahorras {savings.toFixed(2)} €
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-5">
          <p className="text-xs mb-1">
            <span className="font-semibold text-[#D97706]">{product.brand}</span>
          </p>
          <h3 className="text-sm font-bold text-[#0F172A] leading-snug line-clamp-2 mb-3 flex-1
                         group-hover:text-[#D97706] transition-colors">
            {product.name}
          </h3>

          {product.rating != null && (
            <div className="flex items-center gap-2 mb-3">
              <Stars rating={product.rating} />
              <span className="text-xs font-bold text-[#0F172A]">{product.rating.toFixed(1)}</span>
              {product.reviewCount != null && (
                <span className="text-xs text-[#94A3B8]">({product.reviewCount.toLocaleString("es-ES")})</span>
              )}
            </div>
          )}

          {best && (
            <>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-xl font-extrabold text-[#0F172A]">{best.priceCurrent.toFixed(2)} €</span>
                {best.priceOld && (
                  <span className="text-sm text-[#94A3B8] line-through mb-0.5">{best.priceOld.toFixed(2)} €</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#F1F5F9]">
                <span className="text-xs text-[#94A3B8]">en {best.store}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); window.open(best.externalUrl, "_blank", "noopener,noreferrer"); }}
                  className="text-xs font-bold text-white bg-[#D97706] hover:bg-[#B45309] px-4 py-2 rounded-xl transition-colors"
                >
                  Ver en {best.store} →
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {open && <ProductModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
}
