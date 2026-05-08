"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StockBadge } from "@/components/StockBadge";
import ReviewSection from "@/components/ReviewSection";
import type { ProductAnalysis } from "@/lib/productAnalysis";

interface Offer {
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
  inStock?: boolean;
}

interface Product {
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
  priceHistory: { price: number; date: string }[];
}

interface RelatedProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  images: string[];
  offer: { priceCurrent: number; priceOld: number | null; discountPercent: number | null } | null;
  rating: number | null;
}

interface Props {
  product: Product;
  specs: { icon: string; text: string }[];
  description: string;
  catLabel: string;
  catSlug: string;
  related: RelatedProduct[];
  analysis: ProductAnalysis;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

const VERDICT_TONE: Record<string, { bg: string; fg: string; border: string }> = {
  great: { bg: "var(--accent-50)",  fg: "var(--accent-700)", border: "var(--accent-100)" },
  good:  { bg: "var(--brand-50)",   fg: "var(--brand-700)",  border: "var(--brand-100)" },
  ok:    { bg: "#FFFBEB",            fg: "#B45309",           border: "#FDE68A" },
  bad:   { bg: "var(--danger-50)",   fg: "var(--danger-600)", border: "#FECACA" },
};

// ── Gráfico de historial de precios ──────────────────────────────────────────
function PriceHistoryChart({
  history,
  currentPrice,
}: {
  history: { price: number; date: string }[];
  currentPrice: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (history.length < 2) return null;

  const data = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  data[data.length - 1] = { ...data[data.length - 1], price: currentPrice };

  const prices = data.map((h) => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const range = maxPrice - minPrice || 1;
  const minIdx = prices.indexOf(minPrice);
  const maxIdx = prices.indexOf(maxPrice);

  const W = 900, H = 260;
  const padL = 72, padR = 24, padT = 24, padB = 46;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const toX = (i: number) => padL + (i / (data.length - 1)) * cW;
  const toY = (p: number) => padT + (1 - (p - minPrice) / range) * cH;

  const pts = data.map((h, i) => ({ x: toX(i), y: toY(h.price), price: h.price, date: h.date }));

  const linePath = pts.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const cpx = ((pts[i - 1].x + p.x) / 2).toFixed(1);
    return `${d} C ${cpx} ${pts[i - 1].y.toFixed(1)} ${cpx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, "");
  const fillPath = `${linePath} L ${pts[pts.length - 1].x} ${padT + cH} L ${padL} ${padT + cH} Z`;

  const yTicks = [0, 1 / 3, 2 / 3, 1].map((t) => minPrice + t * range);
  const xStep = Math.max(1, Math.floor(data.length / 6));

  const hov = hoveredIdx !== null ? pts[hoveredIdx] : null;

  const stats = [
    { label: "Mínimo", value: minPrice,    fg: "var(--accent-700)", bg: "var(--accent-50)",  border: "var(--accent-100)" },
    { label: "Máximo", value: maxPrice,    fg: "var(--danger-600)", bg: "var(--danger-50)",  border: "#FECACA" },
    { label: "Media",  value: avgPrice,    fg: "#7C3AED",           bg: "#F5F3FF",           border: "#DDD6FE" },
    { label: "Actual", value: currentPrice, fg: "var(--brand-700)",  bg: "var(--brand-50)",   border: "var(--brand-100)" },
  ];

  return (
    <section className="bg-bg-elevated rounded-2xl border border-border p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 text-brand-600">Evolución</p>
          <h2 className="text-lg sm:text-xl font-extrabold text-fg tracking-tight">Historial de precios</h2>
        </div>
        <span className="text-[11px] font-bold text-fg-muted bg-bg-subtle border border-border-subtle px-3 h-7 inline-flex items-center rounded-full">
          Últimos 90 días
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {stats.map(({ label, value, fg, bg, border }) => (
          <div
            key={label}
            className="rounded-xl p-3 border"
            style={{ backgroundColor: bg, borderColor: border }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: fg }}>
              {label}
            </p>
            <p className="text-base font-extrabold tabular" style={{ color: fg }}>
              {formatPrice(value)}
            </p>
          </div>
        ))}
      </div>

      <div
        className="relative rounded-xl overflow-hidden bg-bg-subtle border border-border-subtle"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[300px] sm:h-[260px] md:h-[220px]">
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {yTicks.map((v, i) => (
            <g key={i}>
              <line
                x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)}
                stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4"
              />
              <text x={padL - 6} y={toY(v)} textAnchor="end" dominantBaseline="middle" fill="var(--fg-subtle)" fontSize="10" fontFamily="inherit">
                {v.toFixed(0)}€
              </text>
            </g>
          ))}

          {pts.map((pt, i) => {
            if (i % xStep !== 0 && i !== pts.length - 1) return null;
            const d = new Date(pt.date);
            const lbl = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
            return (
              <text key={i} x={pt.x} y={H - padB + 14} textAnchor="middle" fill="var(--fg-subtle)" fontSize="10" fontFamily="inherit">
                {lbl}
              </text>
            );
          })}

          <path d={fillPath} fill="url(#chartFill)" />

          <path
            d={linePath} fill="none"
            stroke="#4F46E5" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          />

          <circle cx={pts[minIdx].x} cy={pts[minIdx].y} r="12" fill="var(--accent-500)" fillOpacity="0.12" />
          <circle cx={pts[minIdx].x} cy={pts[minIdx].y} r="6" fill="var(--accent-500)" stroke="white" strokeWidth="2.5" />

          <circle cx={pts[maxIdx].x} cy={pts[maxIdx].y} r="6" fill="var(--danger-600)" stroke="white" strokeWidth="2.5" />

          <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="6" fill="#4F46E5" stroke="white" strokeWidth="2.5" />

          {pts.map((pt, i) => {
            const x0 = i === 0 ? padL : (pts[i - 1].x + pt.x) / 2;
            const x1 = i === pts.length - 1 ? W - padR : (pt.x + pts[i + 1].x) / 2;
            return (
              <rect
                key={i}
                x={x0} y={padT} width={x1 - x0} height={cH}
                fill="transparent"
                style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHoveredIdx(i)}
              />
            );
          })}

          {hov && (() => {
            const tipW = 96, tipH = 30;
            const tipX = hov.x > W * 0.75 ? hov.x - tipW - 8 : hov.x + 10;
            const tipY = Math.max(padT + 4, hov.y - tipH / 2);
            const dateStr = new Date(hov.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" });
            return (
              <g>
                <line x1={hov.x} y1={padT} x2={hov.x} y2={padT + cH} stroke="var(--fg-strong)" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.25" />
                <circle cx={hov.x} cy={hov.y} r="4.5" fill="white" stroke="#4F46E5" strokeWidth="2.5" />
                <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="8" fill="var(--fg-strong)" />
                <text x={tipX + tipW / 2} y={tipY + 12} textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="inherit">
                  {formatPrice(hov.price)}
                </text>
                <text x={tipX + tipW / 2} y={tipY + 23} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="inherit">
                  {dateStr}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </section>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className="w-4 h-4"
          fill={i <= Math.round(rating) ? "var(--warn-500)" : "var(--border)"}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductPageClient({ product, specs, description, catLabel, catSlug, related, analysis }: Props) {
  const [activeImage, setActiveImage] = useState(0);
  const images = product.images?.length > 0 ? product.images : (product.image ? [product.image] : []);
  const bestOffer = product.offers[0];
  const minHistoryPrice = product.priceHistory.length > 0 ? Math.min(...product.priceHistory.map(h => h.price)) : null;

  const verdictTone = VERDICT_TONE[analysis.verdict.tone] ?? VERDICT_TONE.good;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">

      {/* BLOQUE PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-6 lg:gap-10">

        {/* GALERÍA */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-border overflow-hidden aspect-square flex items-center justify-center relative group">
            {images[activeImage] ? (
              <Image
                src={images[activeImage]}
                alt={product.name}
                fill
                className="object-contain p-6 sm:p-8 transition-transform duration-300 group-hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <span className="text-7xl opacity-20">📦</span>
            )}
            {bestOffer?.discountPercent && (
              <div className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 h-7 rounded-md bg-fg-strong text-bg text-xs font-bold shadow-md">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="19 12 12 19 5 12" />
                  <line x1="12" y1="19" x2="12" y2="5" />
                </svg>
                {bestOffer.discountPercent}%
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Imagen ${i + 1}`}
                  className={`w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl border-2 overflow-hidden relative bg-bg-elevated transition-all ${
                    i === activeImage ? "border-brand-500 ring-2 ring-brand-500/15" : "border-border hover:border-border-strong"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-contain p-1.5" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="flex flex-col gap-5">
          <div>
            <Link
              href={`/categorias/${catSlug}`}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 hover:text-brand-700 transition-colors"
            >
              <span aria-hidden>←</span> {catLabel}
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold text-fg mt-2 leading-tight tracking-tight">{product.name}</h1>
            <p className="text-sm text-fg-muted mt-1.5">
              por <span className="font-semibold text-fg">{product.brand}</span>
            </p>
          </div>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-2">
              <StarRating rating={product.rating} />
              <span className="text-sm font-bold text-fg tabular">{product.rating}</span>
              {product.reviewCount && (
                <span className="text-xs text-fg-subtle">
                  ({product.reviewCount.toLocaleString("es-ES")} valoraciones)
                </span>
              )}
            </div>
          )}

          {/* Specs chips */}
          {specs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {specs.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-bg-subtle text-fg-muted text-xs font-medium px-2.5 h-7 rounded-md border border-border-subtle">
                  <span>{s.icon}</span> {s.text}
                </span>
              ))}
            </div>
          )}

          {/* Tarjeta de precio + CTA */}
          {bestOffer && (
            <div className="bg-bg-elevated rounded-2xl border-2 border-border-strong p-5 space-y-4 shadow-sm">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-extrabold text-fg tabular tracking-tight leading-none">
                  {formatPrice(bestOffer.priceCurrent)}
                </span>
                {bestOffer.priceOld && bestOffer.priceOld > bestOffer.priceCurrent && (
                  <span className="text-base text-fg-faint line-through tabular">
                    {formatPrice(bestOffer.priceOld)}
                  </span>
                )}
                {bestOffer.discountPercent && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-accent-700 bg-accent-50 border border-accent-100 px-2.5 h-6 rounded-md">
                    Ahorras {bestOffer.discountPercent}%
                  </span>
                )}
              </div>
              {minHistoryPrice && minHistoryPrice < bestOffer.priceCurrent * 0.95 && (
                <p className="text-xs text-fg-muted leading-relaxed">
                  <span aria-hidden>💡</span> Mínimo histórico:{" "}
                  <span className="font-bold text-accent-700 tabular">{formatPrice(minHistoryPrice)}</span>
                </p>
              )}
              <StockBadge
                inStock={bestOffer.inStock ?? true}
                productId={product.id}
                store={bestOffer.store}
                category={product.category}
                productName={product.name}
              />
              <a
                href={bestOffer.externalUrl}
                target="_blank"
                rel="nofollow noopener noreferrer sponsored"
                className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-extrabold h-14 rounded-xl text-base transition-all shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/35"
              >
                Ver en {bestOffer.store}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
              <p className="text-center text-[11px] text-fg-subtle leading-relaxed">
                {product.offers.length > 1 ? `Disponible en ${product.offers.length} tiendas · ` : ""}
                Precios actualizados en tiempo real · Enlace de afiliado
              </p>
            </div>
          )}

          {/* Comparativa de tiendas */}
          {product.offers.length > 1 && (
            <div>
              <div className="flex items-baseline justify-between mb-2.5">
                <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.2em]">
                  Comparar precios
                </p>
                <p className="text-[11px] text-fg-subtle">
                  {product.offers.length} tiendas
                </p>
              </div>
              <div className="space-y-2">
                {product.offers.map((o, i) => {
                  const isBest = i === 0;
                  return (
                    <a
                      key={i}
                      href={o.externalUrl}
                      target="_blank"
                      rel="nofollow noopener noreferrer sponsored"
                      className={`flex items-center justify-between gap-2 rounded-xl px-4 h-12 transition-all group border ${
                        isBest
                          ? "bg-brand-50 border-brand-200 hover:border-brand-300 hover:bg-brand-100"
                          : "bg-bg-elevated border-border hover:border-border-strong hover:bg-bg-subtle"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isBest && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white" aria-hidden>
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                        <span className={`text-sm font-bold truncate ${isBest ? "text-brand-700" : "text-fg"}`}>
                          {o.store}
                        </span>
                        {isBest && (
                          <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider text-brand-600">
                            Mejor precio
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {o.discountPercent && (
                          <span className="text-[11px] font-bold text-accent-700 bg-accent-50 border border-accent-100 px-2 py-0.5 rounded-md">
                            -{o.discountPercent}%
                          </span>
                        )}
                        <span className={`font-extrabold tabular ${isBest ? "text-brand-700" : "text-fg"}`}>
                          {formatPrice(o.priceCurrent)}
                        </span>
                        <svg className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isBest ? "text-brand-500" : "text-fg-faint group-hover:text-fg-muted"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ANÁLISIS Y DESCRIPCIÓN */}
      <section className="bg-bg-elevated rounded-2xl border border-border p-5 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 text-brand-600">Análisis</p>
            <h2 className="text-lg sm:text-xl font-extrabold text-fg tracking-tight">Análisis y descripción</h2>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="flex items-baseline gap-1 px-3 h-10 rounded-xl font-black border tabular"
              style={{ background: verdictTone.bg, color: verdictTone.fg, borderColor: verdictTone.border }}
            >
              <span className="text-xl">{analysis.score.toFixed(1)}</span>
              <span className="text-xs opacity-70">/ 10</span>
            </div>
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 h-6 inline-flex items-center rounded-md border"
              style={{ background: verdictTone.bg, color: verdictTone.fg, borderColor: verdictTone.border }}
            >
              {analysis.verdict.label}
            </span>
          </div>
        </div>

        <p className="text-[15px] leading-relaxed font-medium text-fg">{analysis.oneLiner}</p>

        {analysis.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {analysis.highlights.map((h) => (
              <div
                key={h.label}
                className="flex items-center gap-2 px-3 h-8 rounded-full bg-bg-subtle border border-border-subtle text-xs"
              >
                <span className="text-base leading-none">{h.icon}</span>
                <span className="font-bold text-fg">{h.label}:</span>
                <span className="text-fg-muted">{h.value}</span>
              </div>
            ))}
          </div>
        )}

        {(analysis.comparison.priceVsAvg !== null || analysis.comparison.ratingVsAvg !== null || analysis.comparison.pricePercentile !== null) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {analysis.comparison.priceVsAvg !== null && (
              <div className="rounded-xl border border-border bg-bg-subtle p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-subtle mb-1.5">Precio vs media</p>
                <p
                  className="text-base font-extrabold tabular"
                  style={{ color: analysis.comparison.priceVsAvg <= 0 ? "var(--accent-700)" : "var(--danger-600)" }}
                >
                  {analysis.comparison.priceVsAvg > 0 ? "+" : ""}{analysis.comparison.priceVsAvg}%
                </p>
                <p className="text-[11px] text-fg-subtle mt-0.5">
                  {analysis.comparison.priceVsAvg <= 0 ? "más barato que la media" : "por encima de la media"}
                </p>
              </div>
            )}
            {analysis.comparison.ratingVsAvg !== null && (
              <div className="rounded-xl border border-border bg-bg-subtle p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-subtle mb-1.5">Rating vs media</p>
                <p
                  className="text-base font-extrabold tabular"
                  style={{ color: analysis.comparison.ratingVsAvg >= 0 ? "var(--accent-700)" : "var(--danger-600)" }}
                >
                  {analysis.comparison.ratingVsAvg >= 0 ? "+" : ""}{analysis.comparison.ratingVsAvg.toFixed(1)}
                </p>
                <p className="text-[11px] text-fg-subtle mt-0.5">
                  {analysis.comparison.ratingVsAvg >= 0 ? "puntos sobre la media" : "puntos bajo la media"}
                </p>
              </div>
            )}
            {analysis.comparison.pricePercentile !== null && (
              <div className="rounded-xl border border-border bg-bg-subtle p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fg-subtle mb-1.5">Posición de precio</p>
                <p className="text-base font-extrabold tabular text-fg">
                  Top {analysis.comparison.pricePercentile <= 50 ? `${100 - analysis.comparison.pricePercentile}%` : `${analysis.comparison.pricePercentile}%`}
                </p>
                <p className="text-[11px] text-fg-subtle mt-0.5">
                  {analysis.comparison.pricePercentile <= 25
                    ? "entre los más baratos"
                    : analysis.comparison.pricePercentile <= 50
                    ? "en la mitad económica"
                    : analysis.comparison.pricePercentile >= 75
                    ? "en gama alta"
                    : "en la mitad alta"}{" "}
                  de su categoría
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pros / Contras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="rounded-2xl border border-accent-100 bg-accent-50 p-5">
            <p className="text-[10px] font-extrabold text-accent-700 uppercase tracking-[0.18em] mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Lo bueno
            </p>
            <ul className="space-y-2">
              {analysis.pros.map((p) => (
                <li key={p} className="flex gap-2 text-[13px] text-fg leading-relaxed">
                  <span className="text-accent-600 mt-1.5 leading-none">●</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#FECACA] bg-danger-50 p-5">
            <p className="text-[10px] font-extrabold text-danger-600 uppercase tracking-[0.18em] mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Lo no tan bueno
            </p>
            <ul className="space-y-2">
              {analysis.cons.map((c) => (
                <li key={c} className="flex gap-2 text-[13px] text-fg leading-relaxed">
                  <span className="text-danger-500 mt-1.5 leading-none">●</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ¿Buen momento? */}
        {analysis.bestMoment && (
          <div
            className="rounded-2xl p-4 flex gap-3 items-start border"
            style={{
              background: analysis.bestMoment.isGood ? "var(--accent-50)" : "#FFFBEB",
              borderColor: analysis.bestMoment.isGood ? "var(--accent-100)" : "#FDE68A",
            }}
          >
            <span className="text-xl shrink-0" aria-hidden>{analysis.bestMoment.isGood ? "✅" : "⏳"}</span>
            <div>
              <p
                className="text-sm font-extrabold mb-1"
                style={{ color: analysis.bestMoment.isGood ? "var(--accent-700)" : "#B45309" }}
              >
                {analysis.bestMoment.isGood ? "Buen momento para comprarlo" : "Quizá quieras esperar"}
              </p>
              <p className="text-[13px] text-fg-muted leading-relaxed">{analysis.bestMoment.reason}</p>
            </div>
          </div>
        )}

        {/* Specs detectadas */}
        {specs.length > 0 && (
          <div>
            <p className="text-[10px] font-extrabold text-fg-subtle uppercase tracking-[0.18em] mb-3">
              Especificaciones detectadas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {specs.map((s) => (
                <span
                  key={s.text}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-bg-subtle text-[13px] font-semibold text-fg-muted border border-border-subtle"
                >
                  <span>{s.icon}</span>
                  {s.text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Descripción */}
        <div className="pt-2 border-t border-border-subtle">
          <p className="text-[10px] font-extrabold text-fg-subtle uppercase tracking-[0.18em] mb-2">Descripción</p>
          <p className="text-fg-muted text-sm leading-relaxed">{description}</p>
        </div>

        {product.description && product.description !== product.name && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors select-none list-none flex items-center gap-1">
              Ver descripción completa del fabricante
              <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-3 text-sm text-fg-muted leading-relaxed border-t border-border-subtle pt-3">
              {product.description}
            </p>
          </details>
        )}
      </section>

      {/* HISTORIAL DE PRECIOS */}
      {product.priceHistory.length > 1 && (
        <PriceHistoryChart
          history={product.priceHistory}
          currentPrice={bestOffer?.priceCurrent ?? 0}
        />
      )}

      {/* RESEÑAS */}
      <section className="bg-bg-elevated rounded-2xl border border-border p-5 sm:p-8">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 text-brand-600">Comunidad</p>
          <h2 className="text-lg sm:text-xl font-extrabold text-fg tracking-tight">Opiniones</h2>
        </div>
        <ReviewSection productId={product.id} />
      </section>

      {/* PRODUCTOS RELACIONADOS */}
      {related.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 text-brand-600">Más opciones</p>
              <h2 className="text-lg sm:text-xl font-extrabold text-fg tracking-tight">También te puede interesar</h2>
            </div>
            <Link
              href={`/categorias/${catSlug}`}
              className="inline-flex items-center gap-1 text-xs font-bold px-4 h-9 rounded-full text-brand-700 border border-brand-100 bg-brand-50 hover:bg-brand-100 transition-all"
            >
              Ver todos
              <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {related.map((p) => {
              const thumb = p.images?.[0] ?? p.image;
              return (
                <Link
                  key={p.id}
                  href={`/productos/${p.slug}`}
                  className="group bg-bg-elevated rounded-2xl border border-border overflow-hidden hover:border-border-strong hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="aspect-square relative bg-white">
                    {thumb ? (
                      <Image src={thumb} alt={p.name} fill className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]" sizes="200px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-20">📦</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-bold text-brand-600 mb-1">{p.brand}</p>
                    <p className="text-xs font-bold text-fg line-clamp-2 leading-snug group-hover:text-brand-600 transition-colors min-h-[2.4em]">
                      {p.name}
                    </p>
                    {p.offer && (
                      <p className="text-sm font-extrabold text-fg mt-2 tabular">{formatPrice(p.offer.priceCurrent)}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
