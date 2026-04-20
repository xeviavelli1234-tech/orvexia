"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import type React from "react";
import ProductModal from "./ProductModal";
import { BuySignalBadge } from "./BuySignalBadge";
import { SaveButton } from "./SaveButton";
import { StockBadge } from "./StockBadge";

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aire acondicionado", OTROS: "Otros",
};

interface Offer {
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
  inStock?: boolean;
}

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    brand: string;
    category: string;
    description: string | null;
    image: string | null;
    images: string[];
    rating: number | null;
    reviewCount: number | null;
    offers: Offer[];
  };
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: Props) {
  const formatEuro = (value: number) =>
    new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Imágenes para el modal — se cargan frescas desde la API al abrir
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalRating, setModalRating] = useState<number | null>(product.rating);
  const [modalReviews, setModalReviews] = useState<number | null>(product.reviewCount);

  // Imágenes para la tarjeta (puede ser 1 si images no llega aún)
  const cardImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : [];
  const activeCardImage = cardImages[active];
  const [failedCardImages, setFailedCardImages] = useState<Set<string>>(new Set());
  const cardImageErrored = !!activeCardImage && failedCardImages.has(activeCardImage);

  const mejorOferta = product.offers[0];
  const ctaStoreName =
    mejorOferta?.store?.toLowerCase().includes("pccomponente")
      ? "PcComp."
      : mejorOferta?.store ?? "tienda";
  // Descuento real: calculado desde los precios actuales y con cap de ratio para
  // descartar MSRPs inflados de Amazon (ratio > 1.40 = descuento irreal)
  const realDiscount =
    mejorOferta?.priceOld != null &&
    mejorOferta.priceCurrent < mejorOferta.priceOld &&
    mejorOferta.priceOld / mejorOferta.priceCurrent <= 2.1
      ? Math.round((1 - mejorOferta.priceCurrent / mejorOferta.priceOld) * 100)
      : 0;

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setActive((i) => (i - 1 + cardImages.length) % cardImages.length);
    },
    [cardImages.length],
  );

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setActive((i) => (i + 1) % cardImages.length);
    },
    [cardImages.length],
  );

  async function handleOpen() {
    setOpen(true);
    // Carga fresca de imágenes desde la API
    try {
      const res = await fetch(`/api/products?slug=${product.slug}`);
      const data = await res.json();
      if (Array.isArray(data.images) && data.images.length > 0) {
        setModalImages(data.images);
      }
      if (data.rating != null) setModalRating(data.rating);
      if (data.reviewCount != null) setModalReviews(data.reviewCount);
    } catch {
      // fallback: usar lo que tengamos
    }
  }

  const allModalImages = modalImages.length > 0 ? modalImages : cardImages;

  return (
    <>
      <div
        className="group h-full rounded-xl overflow-hidden bg-white border border-[#E5F0FF] hover:shadow-md hover:border-[#2563EB]/30 transition-all duration-200 cursor-pointer flex flex-col"
        onClick={handleOpen}
      >
        <div className="relative h-48 bg-[#F8FBFF]">
          {cardImages.length > 0 && !cardImageErrored ? (
            <img
              key={cardImages[active]}
              src={activeCardImage}
              alt={product.name}
              loading={priority ? "eager" : "lazy"}
              className="absolute inset-0 w-full h-full object-contain p-4 transition-opacity duration-200"
              referrerPolicy="no-referrer"
              onError={() => {
                if (!activeCardImage) return;
                setFailedCardImages((prev) => {
                  if (prev.has(activeCardImage)) return prev;
                  const nextSet = new Set(prev);
                  nextSet.add(activeCardImage);
                  return nextSet;
                });
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-3xl text-[#CBD5E1]">📦</div>
          )}

          {/* Descuento — solo si hay rebaja real */}
          {realDiscount > 0 && (
            <span className="absolute top-2 left-2 bg-[#EF4444] text-white text-xs font-bold px-2 py-1 rounded-lg shadow">
              -{realDiscount}%
            </span>
          )}
          {/* Guardar */}
          <SaveButton productId={product.id} className="absolute top-2 right-2 w-7 h-7" />

          {/* Flechas */}
          {cardImages.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white rounded-full p-1 shadow z-10"
              >
                <svg className="w-3.5 h-3.5 text-[#0F172A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={next}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white rounded-full p-1 shadow z-10"
              >
                <svg className="w-3.5 h-3.5 text-[#0F172A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Puntos */}
          {cardImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {cardImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(i);
                  }}
                  className={`rounded-full transition-all duration-300 ${active === i ? "bg-[#2563EB] w-3.5 h-1.5" : "bg-white/60 w-1.5 h-1.5"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[#64748B]">
              <span className="font-semibold text-[#2563EB]">{product.brand}</span>
              <span className="mx-1">·</span>
              {CATEGORY_LABELS[product.category] ?? product.category}
            </p>
            {product.rating != null && (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#F59E0B]">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                {product.rating.toFixed(1)}
                {product.reviewCount != null && (
                  <span className="text-[#94A3B8] font-normal ml-0.5">({product.reviewCount >= 1000 ? `${(product.reviewCount / 1000).toFixed(1)}k` : product.reviewCount})</span>
                )}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-[#0F172A] leading-snug mb-3 line-clamp-2 group-hover:text-[#2563EB] transition-colors">
            {product.name}
          </h3>

          {mejorOferta ? (
            <>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-xl font-bold text-[#0F172A]">{formatEuro(mejorOferta.priceCurrent)} €</span>
                {mejorOferta.priceOld && (
                  <span className="text-sm text-[#94A3B8] line-through mb-0.5">{formatEuro(mejorOferta.priceOld)} €</span>
                )}
              </div>
              {mejorOferta.priceOld && mejorOferta.priceOld > mejorOferta.priceCurrent && (
                <p className="text-[11px] font-semibold text-[#16A34A] mb-2">
                  Ahorras {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(mejorOferta.priceOld - mejorOferta.priceCurrent)} €
                </p>
              )}
              <div className="mb-2">
                <BuySignalBadge productId={product.id} store={mejorOferta.store} />
              </div>
              <div className="mb-3">
                <StockBadge
                  inStock={mejorOferta.inStock ?? true}
                  productId={product.id}
                  store={mejorOferta.store}
                  category={product.category}
                  discountPercent={realDiscount}
                />
              </div>
              <div className="mt-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Link
                  href={`/productos/${product.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-semibold text-[#64748B] hover:text-[#2563EB] transition-colors underline underline-offset-2 self-start"
                >
                  Ver análisis
                </Link>
                <a
                  href={mejorOferta.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-blue-200 w-full sm:w-auto"
                >
                  Ver en {ctaStoreName} →
                </a>
              </div>
            </>
          ) : (
            <p className="text-xs text-[#94A3B8]">Sin ofertas disponibles</p>
          )}
        </div>
      </div>

      {open && (
        <ProductModal
          product={{ ...product, images: allModalImages, rating: modalRating, reviewCount: modalReviews, slug: product.slug }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
