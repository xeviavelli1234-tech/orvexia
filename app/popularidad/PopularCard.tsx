"use client";

import Image from "next/image";
import { useState } from "react";
import ProductModal from "@/components/ProductModal";

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aires A/C", OTROS: "Otros",
};

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
          <svg key={i} className="w-3.5 h-3.5" viewBox="0 0 20 20">
            {partial ? (
              <>
                <defs>
                  <clipPath id={`half-${i}-${rating}`}><rect x="0" y="0" width="10" height="20" /></clipPath>
                </defs>
                <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.62l5.34-.78z" fill="var(--border)" />
                <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.62l5.34-.78z" fill="var(--warn-500)" clipPath={`url(#half-${i}-${rating})`} />
              </>
            ) : (
              <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.62l5.34-.78z" fill={filled ? "var(--warn-500)" : "var(--border)"} />
            )}
          </svg>
        );
      })}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="absolute top-3 left-3 w-8 h-8 rounded-full bg-yellow-400 text-xs font-black flex items-center justify-center shadow-md">🥇</span>;
  if (rank === 2) return <span className="absolute top-3 left-3 w-8 h-8 rounded-full bg-slate-300 text-xs font-black flex items-center justify-center shadow-md">🥈</span>;
  if (rank === 3) return <span className="absolute top-3 left-3 w-8 h-8 rounded-full bg-orange-400 text-xs font-black flex items-center justify-center shadow-md">🥉</span>;
  return <span className="absolute top-3 left-3 w-7 h-7 rounded-full bg-bg-elevated border border-border text-fg-muted text-xs font-bold flex items-center justify-center shadow-sm">{rank}</span>;
}

export function PopularCard({ product, rank }: { product: Product; rank: number }) {
  const [open, setOpen] = useState(false);
  const best = product.offers[0];
  const savings  = best?.priceOld && best.priceCurrent < best.priceOld ? best.priceOld - best.priceCurrent : null;
  const realDiscount = best?.priceOld != null &&
    best.priceCurrent < best.priceOld &&
    best.priceOld / best.priceCurrent <= 1.40
    ? Math.round((1 - best.priceCurrent / best.priceOld) * 100)
    : 0;
  const catLabel = CATEGORY_LABELS[product.category] ?? product.category;
  const catEmoji = CATEGORY_EMOJI[product.category] ?? "📦";
  const cardImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images : product.image ? [product.image] : [];

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="group flex flex-col bg-bg-elevated rounded-2xl border border-border overflow-hidden
                   hover:shadow-xl hover:border-[#7C3AED]/20 transition-all duration-200 cursor-pointer"
      >
        {/* Image */}
        <div className="relative h-52 bg-white flex items-center justify-center">
          {cardImages.length > 0 ? (
            <Image src={cardImages[0]} alt={product.name} fill className="object-contain p-5"
              sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw" />
          ) : (
            <span className="text-5xl">{catEmoji}</span>
          )}
          <RankBadge rank={rank} />
          {realDiscount > 0 && (
            <span className="absolute top-3 right-3 bg-danger-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
              -{realDiscount}%
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-5">
          <p className="text-xs mb-1">
            <span className="font-semibold text-[#7C3AED]">{product.brand}</span>
            <span className="text-fg-subtle"> · {catLabel}</span>
          </p>
          <h3 className="text-sm font-bold text-fg leading-snug line-clamp-2 mb-3 flex-1
                         group-hover:text-[#7C3AED] transition-colors">
            {product.name}
          </h3>

          {product.rating != null ? (
            <div className="flex items-center gap-2 mb-3">
              <Stars rating={product.rating} />
              <span className="text-sm font-bold text-fg">{product.rating.toFixed(1)}</span>
              {product.reviewCount != null && (
                <span className="text-xs text-fg-subtle">({product.reviewCount.toLocaleString("es-ES")} reseñas)</span>
              )}
            </div>
          ) : (
            <p className="text-xs text-fg-subtle mb-3">Sin valoraciones</p>
          )}

          {best ? (
            <>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-xl font-extrabold text-fg">{best.priceCurrent.toFixed(2)} €</span>
                {best.priceOld && (
                  <span className="text-sm text-fg-subtle line-through mb-0.5">{best.priceOld.toFixed(2)} €</span>
                )}
              </div>
              {savings && savings > 0 && (
                <p className="text-xs font-semibold text-emerald-600 mb-3">Ahorras {savings.toFixed(2)} €</p>
              )}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-subtle">
                <span className="text-xs text-fg-subtle">en {best.store}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); window.open(best.externalUrl, "_blank", "noopener,noreferrer"); }}
                  className="text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] px-4 py-2 rounded-xl transition-colors"
                >
                  Ver en {best.store} →
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-fg-subtle mt-auto">Sin precio disponible</p>
          )}
        </div>
      </div>

      {open && <ProductModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
}
