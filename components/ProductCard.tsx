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

  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalRating, setModalRating] = useState<number | null>(product.rating);
  const [modalReviews, setModalReviews] = useState<number | null>(product.reviewCount);

  const [failedCardImages, setFailedCardImages] = useState<Set<string>>(new Set());
  const rawCardImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : [];
  // Igual que ProductModal: descarta URLs muertas (onError) y placeholders
  // proxy diminutos (onLoad) para no quedarse clavado en un images[0] roto.
  const cardImages = rawCardImages.filter((s) => s && !failedCardImages.has(s));
  const safeActive = active < cardImages.length ? active : 0;
  const activeCardImage = cardImages[safeActive];

  const markCardImageFailed = useCallback((src: string) => {
    setFailedCardImages((prev) => {
      if (prev.has(src)) return prev;
      const nextSet = new Set(prev);
      nextSet.add(src);
      return nextSet;
    });
  }, []);

  // Evalúa la <img> también vía ref: si está cacheada/precargada, onLoad y
  // onError no disparan tras la hidratación (a diferencia del modal, que
  // monta tras el click). Cubre 404 cacheado (naturalWidth 0) y placeholder
  // proxy "No image available" de productserve (<250px), igual que el modal.
  const evaluateCardImg = useCallback(
    (img: HTMLImageElement | null, src: string | undefined) => {
      if (!img || !src || !img.complete) return;
      if (img.naturalWidth === 0) {
        markCardImageFailed(src);
        return;
      }
      if (img.naturalWidth < 250 && img.naturalHeight < 250) {
        markCardImageFailed(src);
      }
    },
    [markCardImageFailed],
  );

  const mejorOferta = product.offers[0];
  const ctaStoreName =
    mejorOferta?.store?.toLowerCase().includes("pccomponente")
      ? "PcComp."
      : mejorOferta?.store ?? "tienda";

  const trustedStore = mejorOferta?.store
    ? /^(LG|El Corte Inglés|Fnac)$/i.test(mejorOferta.store) ||
      mejorOferta.store.toLowerCase().includes("corte ingl")
    : false;
  const realDiscount =
    mejorOferta?.priceOld != null && mejorOferta.priceCurrent < mejorOferta.priceOld
      ? trustedStore
        ? Math.round((1 - mejorOferta.priceCurrent / mejorOferta.priceOld) * 100)
        : mejorOferta.priceOld / mejorOferta.priceCurrent <= 2.5
        ? Math.round((1 - mejorOferta.priceCurrent / mejorOferta.priceOld) * 100)
        : 0
      : 0;
  const savingsAmount = mejorOferta?.priceOld && mejorOferta.priceOld > mejorOferta.priceCurrent
    ? mejorOferta.priceOld - mejorOferta.priceCurrent
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
    try {
      const res = await fetch(`/api/products?slug=${product.slug}`);
      const data = await res.json();
      if (Array.isArray(data.images) && data.images.length > 0) {
        setModalImages(data.images);
      }
      if (data.rating != null) setModalRating(data.rating);
      if (data.reviewCount != null) setModalReviews(data.reviewCount);
    } catch {
      /* noop */
    }
  }

  const allModalImages = modalImages.length > 0 ? modalImages : cardImages;

  return (
    <>
      <div
        className="group shine-on-hover h-full rounded-lg sm:rounded-2xl overflow-hidden bg-bg-elevated border border-white/[0.08] hover:border-cyan-400/30 hover:shadow-[0_0_24px_-6px_rgba(94,234,212,0.35)] hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer flex flex-col"
        onClick={handleOpen}
      >
        {/* Image area */}
        <div className="relative aspect-[4/3] bg-white">
          {cardImages.length > 0 ? (
            <img
              key={activeCardImage}
              ref={(node) => evaluateCardImg(node, activeCardImage)}
              src={activeCardImage}
              alt={product.name}
              loading={priority ? "eager" : "lazy"}
              className="absolute inset-0 w-full h-full object-contain p-2 sm:p-5 transition-all duration-300 group-hover:scale-[1.04]"
              referrerPolicy="no-referrer"
              onError={() => activeCardImage && markCardImageFailed(activeCardImage)}
              onLoad={(e) => evaluateCardImg(e.currentTarget, activeCardImage)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-3xl text-fg-faint">📦</div>
          )}

          {/* Discount pill */}
          {realDiscount > 0 && (
            <div
              className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 h-5 sm:h-6 rounded sm:rounded-md text-[9px] sm:text-[11px] font-bold shadow-lg backdrop-blur-sm font-mono-ui"
              style={{
                background: "linear-gradient(135deg, rgba(5,6,15,0.95), rgba(15,18,28,0.9))",
                color: "#A3E635",
                border: "1px solid rgba(163,230,53,0.35)",
                boxShadow: "0 0 14px -2px rgba(163,230,53,0.4)",
              }}
            >
              <svg className="hidden sm:inline-block w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="19 12 12 19 5 12" />
                <line x1="12" y1="19" x2="12" y2="5" />
              </svg>
              -{realDiscount}%
            </div>
          )}

          <SaveButton productId={product.id} className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8" />

          {cardImages.length > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Imagen anterior"
                className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-elevated/90 hover:bg-bg-elevated rounded-full w-7 h-7 items-center justify-center shadow-md z-10"
              >
                <svg className="w-3.5 h-3.5 text-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={next}
                aria-label="Imagen siguiente"
                className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-elevated/90 hover:bg-bg-elevated rounded-full w-7 h-7 items-center justify-center shadow-md z-10"
              >
                <svg className="w-3.5 h-3.5 text-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {cardImages.length > 1 && (
            <div className="hidden sm:flex absolute bottom-3 left-1/2 -translate-x-1/2 gap-1 z-10">
              {cardImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(i);
                  }}
                  aria-label={`Imagen ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    safeActive === i ? "bg-fg-strong w-4 h-1.5" : "bg-fg-strong/30 hover:bg-fg-strong/50 w-1.5 h-1.5"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-2 sm:p-4 flex flex-col flex-1">
          <div className="flex items-center justify-between gap-1 sm:gap-2 mb-1 sm:mb-1.5">
            <p className="text-[9px] sm:text-[11px] text-fg-subtle min-w-0 truncate">
              <span className="font-semibold text-brand-600">{product.brand}</span>
              <span className="hidden sm:inline mx-1.5 text-border-strong">·</span>
              <span className="hidden sm:inline">{CATEGORY_LABELS[product.category] ?? product.category}</span>
            </p>
            {product.rating != null && (
              <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[9px] sm:text-[11px] font-bold text-fg">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-warn-500 text-warn-500" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                {product.rating.toFixed(1)}
                {product.reviewCount != null && (
                  <span className="hidden sm:inline text-fg-subtle font-medium ml-0.5">
                    ({product.reviewCount >= 1000 ? `${(product.reviewCount / 1000).toFixed(1)}k` : product.reviewCount})
                  </span>
                )}
              </span>
            )}
          </div>

          <h3 className="text-[11px] sm:text-[14px] font-bold text-fg leading-snug mb-1.5 sm:mb-3 line-clamp-2 group-hover:text-brand-600 transition-colors sm:min-h-[2.5em]">
            {product.name}
          </h3>

          {mejorOferta ? (
            <>
              <div className="flex items-baseline gap-1 sm:gap-2 mb-1 tabular flex-wrap">
                <span className="text-base sm:text-2xl font-extrabold text-fg leading-none tracking-tight">
                  {formatEuro(mejorOferta.priceCurrent)}
                  <span className="text-xs sm:text-base font-bold text-fg-muted ml-0.5">€</span>
                </span>
                {mejorOferta.priceOld && mejorOferta.priceOld > mejorOferta.priceCurrent && (
                  <span className="hidden sm:inline text-sm text-fg-faint line-through">{formatEuro(mejorOferta.priceOld)} €</span>
                )}
              </div>
              {savingsAmount > 0 && (
                <p className="hidden sm:block text-[11px] font-bold text-accent-600 mb-2 tabular">
                  Ahorras {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(savingsAmount)} €
                </p>
              )}
              <div className="hidden sm:block mb-2">
                <BuySignalBadge productId={product.id} store={mejorOferta.store} />
              </div>
              <div className="hidden sm:block mb-3">
                <StockBadge
                  inStock={mejorOferta.inStock ?? true}
                  productId={product.id}
                  store={mejorOferta.store}
                  category={product.category}
                  discountPercent={realDiscount}
                  productName={product.name}
                />
              </div>
              <div className="mt-auto flex items-center gap-2 pt-1.5 sm:pt-2 sm:border-t sm:border-border-subtle">
                <Link
                  href={`/productos/${product.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden sm:inline text-[11px] font-semibold text-fg-subtle hover:text-fg transition-colors whitespace-nowrap"
                >
                  Análisis →
                </Link>
                <a
                  href={mejorOferta.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="sm:ml-auto inline-flex items-center justify-center gap-1 w-full sm:w-auto text-[10px] sm:text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-[0.97] px-2 sm:px-3.5 h-7 sm:h-9 rounded-md sm:rounded-lg transition-all shadow-sm shadow-brand-600/20"
                >
                  <span className="sm:hidden">Ver oferta</span>
                  <span className="hidden sm:inline">Ver en {ctaStoreName}</span>
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              </div>
            </>
          ) : (
            <p className="text-[10px] sm:text-xs text-fg-faint">Sin ofertas</p>
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
