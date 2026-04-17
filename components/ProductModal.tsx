"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { BuySignalPanel } from "./BuySignalBadge";
import { SaveButton } from "./SaveButton";
import { StockBadge } from "./StockBadge";
import { PriceAlertButton } from "./PriceAlertButton";
import ReviewSection from "./ReviewSection";

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
    slug?: string;
    name: string;
    brand: string;
    category: string;
    description: string | null;
    images: string[];
    image: string | null;
    rating: number | null;
    reviewCount: number | null;
    offers: Offer[];
  };
  onClose: () => void;
}

const SPEC_PATTERNS: { regex: RegExp; icon: string; label: (m: RegExpMatchArray) => string }[] = [
  { regex: /(\d+)\s*pulgadas/i,           icon: "📐", label: (m) => `${m[1]}"` },
  { regex: /4K UHD/i,                     icon: "🖥️", label: () => "4K UHD" },
  { regex: /8K/i,                         icon: "🖥️", label: () => "8K" },
  { regex: /Full HD/i,                    icon: "🖥️", label: () => "Full HD" },
  { regex: /HDR\s*10\+?/i,               icon: "✨", label: () => "HDR10" },
  { regex: /Dolby Vision/i,               icon: "✨", label: () => "Dolby Vision" },
  { regex: /(\d+)\s*Hz/i,                icon: "⚡", label: (m) => `${m[1]} Hz` },
  { regex: /(\d+)GB\s*\+\s*(\d+)GB/i,   icon: "💾", label: (m) => `${m[1]}GB+${m[2]}GB` },
  { regex: /AirPlay/i,                    icon: "🍎", label: () => "AirPlay" },
  { regex: /Alexa/i,                      icon: "🎙️", label: () => "Alexa" },
  { regex: /Google Assistant/i,           icon: "🎙️", label: () => "Google Assistant" },
  { regex: /Fire\s*OS/i,                  icon: "🔥", label: () => "Fire OS" },
  { regex: /Android\s*TV/i,              icon: "🤖", label: () => "Android TV" },
  { regex: /Dolby Atmos/i,               icon: "🔊", label: () => "Dolby Atmos" },
  { regex: /OLED/i,                       icon: "💡", label: () => "OLED" },
  { regex: /QLED/i,                       icon: "💡", label: () => "QLED" },
  { regex: /MEMC/i,                       icon: "🎬", label: () => "MEMC" },
];

function SpecBadges({ description }: { description: string | null }) {
  if (!description) return null;
  const found = SPEC_PATTERNS.filter(({ regex }) => regex.test(description));
  if (found.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {found.map(({ regex, icon, label }) => {
        const match = description.match(regex)!;
        return (
          <span
            key={regex.toString()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0F7FF] text-[#1E40AF] text-xs font-semibold rounded-xl border border-[#DBEAFE]"
          >
            <span>{icon}</span>
            {label(match)}
          </span>
        );
      })}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, rating - (star - 1)));
        return (
          <span key={star} className="relative w-4 h-4 inline-block">
            <svg className="w-4 h-4 text-[#E2E8F0]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <svg className="w-4 h-4 text-[#F59E0B]" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function ProductModal({ product, onClose }: Props) {
  // Construir array de imágenes de forma segura
  const rawImages = Array.isArray(product.images) ? product.images : [];
  const all = rawImages.length > 0 ? rawImages : product.image ? [product.image] : [];

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(() => setActive((i) => (i - 1 + all.length) % all.length), [all.length]);
  const next = useCallback(() => setActive((i) => (i + 1) % all.length), [all.length]);

  // Auto-slide
  useEffect(() => {
    if (all.length <= 1 || paused) return;
    const id = setInterval(next, 3500);
    return () => clearInterval(id);
  }, [all.length, paused, next]);

  // Teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  // Scroll miniatura activa a la vista
  useEffect(() => {
    const el = thumbsRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const mejorOferta = product.offers[0];

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="modal-card relative w-full bg-white rounded-3xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col md:flex-row"
        style={{ height: "58vh", maxHeight: "820px", maxWidth: "min(1100px, 95vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cerrar ── */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white text-[#64748B] hover:text-[#0F172A] rounded-full p-1.5 shadow transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ── Columna izquierda: carrusel ── */}
        <div
          className="md:w-1/2 bg-[#F0F7FF] flex flex-col"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Imagen principal con track deslizante */}
          <div className="relative flex-1 overflow-hidden">
            {all.length > 0 ? (
              <div
                className="flex h-full transition-transform duration-500 ease-in-out"
                style={{
                  width: `${all.length * 100}%`,
                  transform: `translateX(-${active * (100 / all.length)}%)`,
                }}
              >
                {all.map((src, i) => (
                  <div
                    key={i}
                    className="relative flex-shrink-0 h-full"
                    style={{ width: `${100 / all.length}%` }}
                  >
                    <Image
                      src={src}
                      alt={`${product.name} - ${i + 1}`}
                      fill
                      className="object-contain p-6"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority={i === 0}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">📺</div>
            )}

            {/* Flechas siempre visibles */}
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-[#0F172A]/70 hover:bg-[#0F172A] text-white rounded-full p-2.5 shadow-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-[#0F172A]/70 hover:bg-[#0F172A] text-white rounded-full p-2.5 shadow-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Contador */}
            {all.length > 0 && (
              <span className="absolute bottom-3 right-3 z-10 text-xs text-white bg-black/50 px-2 py-0.5 rounded-full">
                {active + 1} / {all.length}
              </span>
            )}
          </div>

          {/* Tira de miniaturas */}
          {all.length > 1 && (
            <div
              ref={thumbsRef}
              className="flex gap-2 p-3 overflow-x-auto border-t border-[#E5F0FF] bg-white/60"
              style={{ scrollbarWidth: "none" }}
            >
              {all.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 bg-white ${
                    active === i ? "border-[#2563EB] shadow-md scale-105" : "border-transparent opacity-50 hover:opacity-90"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`miniatura ${i + 1}`}
                    width={56}
                    height={56}
                    className="object-contain w-full h-full p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Columna derecha: info ── */}
        <div className="md:w-1/2 flex flex-col overflow-y-auto">
          <div className="p-6 flex flex-col gap-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest text-[#2563EB] uppercase">{product.brand}</span>
              <span className="text-[#CBD5E1]">·</span>
              <span className="text-xs text-[#64748B]">{{
                TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
                LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
                MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
                AIRES_ACONDICIONADOS: "Aire acondicionado", OTROS: "Otros",
              }[product.category] ?? product.category}</span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-[#0F172A] leading-snug">{product.name}</h2>
              <div className="flex items-center gap-2">
                {mejorOferta && (
                  <PriceAlertButton
                    productId={product.id}
                    store={mejorOferta.store}
                    currentPrice={mejorOferta.priceCurrent}
                    className="w-9 h-9 shrink-0"
                  />
                )}
                <SaveButton productId={product.id} className="w-9 h-9 shrink-0" />
              </div>
            </div>

            {product.rating != null && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#0F172A]">{product.rating.toFixed(1)}</span>
                <Stars rating={product.rating} />
                {product.reviewCount != null && (
                  <a
                    href={mejorOferta?.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#2563EB] hover:underline"
                  >
                    {product.reviewCount.toLocaleString("es-ES")} reseñas
                  </a>
                )}
              </div>
            )}

            {mejorOferta && (
              <div className="flex items-end gap-3 py-3 border-t border-b border-[#E5F0FF]">
                <span className="text-3xl font-bold text-[#0F172A]">{mejorOferta.priceCurrent.toFixed(2)} €</span>
                {mejorOferta.priceOld != null && mejorOferta.priceOld > mejorOferta.priceCurrent &&
                  mejorOferta.priceOld / mejorOferta.priceCurrent <= 1.40 && (
                  <span className="text-base text-[#94A3B8] line-through mb-0.5">{mejorOferta.priceOld.toFixed(2)} €</span>
                )}
                {(mejorOferta.discountPercent ?? 0) > 0 &&
                  mejorOferta.priceOld != null && mejorOferta.priceOld / mejorOferta.priceCurrent <= 1.40 && (
                  <span className="mb-0.5 px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-xs font-bold rounded-lg">
                    -{mejorOferta.discountPercent}%
                  </span>
                )}
              </div>
            )}

            {mejorOferta && (
              <StockBadge
                inStock={mejorOferta.inStock ?? true}
                productId={product.id}
                store={mejorOferta.store}
                category={product.category}
              />
            )}

            {product.description && (
              <p className="text-sm text-[#475569] leading-relaxed">{product.description}</p>
            )}

            {/* ── Specs destacadas ── */}
            <SpecBadges description={product.description} />

            {/* Señal de Compra */}
            {mejorOferta && (
              <BuySignalPanel productId={product.id} store={mejorOferta.store} />
            )}

            {/* Reseñas de la comunidad */}
            <ReviewSection productId={product.id} />

            {/* Enlace a página de reseñas completa */}
            {product.slug && (
              <a
                href={`/opiniones?producto=${product.slug}`}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#E2E8F0] text-[#475569] hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Ver todas las reseñas de este producto
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}

            <div className="flex-1" />

            {mejorOferta && (
              <div className="flex items-center justify-between pt-2 border-t border-[#E5F0FF]">
                <div className="flex items-center gap-2">
                  <img src="https://images.icon-icons.com/836/PNG/512/Amazon_icon-icons.com_66787.png" alt="Amazon" className="w-6 h-6 object-contain" />
                  <span className="text-sm font-medium text-[#0F172A]">{mejorOferta.store}</span>
                </div>
                <a
                  href={mejorOferta.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Ver en {mejorOferta.store} →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
