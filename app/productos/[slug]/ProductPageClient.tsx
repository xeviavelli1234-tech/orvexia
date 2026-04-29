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

  // Ordenar por fecha y asegurar que el último punto es el precio actual real
  const data = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  data[data.length - 1] = { ...data[data.length - 1], price: currentPrice };

  const prices  = data.map((h) => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const range    = maxPrice - minPrice || 1;
  const minIdx   = prices.indexOf(minPrice);
  const maxIdx   = prices.indexOf(maxPrice);

  // SVG viewport
  const W = 900, H = 260;
  const padL = 72, padR = 24, padT = 24, padB = 46;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const toX = (i: number) => padL + (i / (data.length - 1)) * cW;
  const toY = (p: number) => padT + (1 - (p - minPrice) / range) * cH;

  const pts = data.map((h, i) => ({ x: toX(i), y: toY(h.price), price: h.price, date: h.date }));

  // Smooth cubic bezier
  const linePath = pts.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const cpx = ((pts[i - 1].x + p.x) / 2).toFixed(1);
    return `${d} C ${cpx} ${pts[i - 1].y.toFixed(1)} ${cpx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, "");
  const fillPath = `${linePath} L ${pts[pts.length - 1].x} ${padT + cH} L ${padL} ${padT + cH} Z`;

  // Y-axis ticks (4 levels)
  const yTicks = [0, 1 / 3, 2 / 3, 1].map((t) => minPrice + t * range);

  // X-axis: show up to 7 labels
  const xStep = Math.max(1, Math.floor(data.length / 6));

  const hov = hoveredIdx !== null ? pts[hoveredIdx] : null;

  return (
    <section className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-[#0F172A]">Historial de precios</h2>
        <span className="text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-3 py-1 rounded-full">
          Últimos 90 días
        </span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { label: "Mínimo",  value: minPrice,     color: "#059669", bg: "#F0FDF4", border: "#BBF7D0" },
          { label: "Máximo",  value: maxPrice,     color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
          { label: "Media",   value: avgPrice,     color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
          { label: "Actual",  value: currentPrice, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
        ] as const).map(({ label, value, color, bg, border }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center border"
            style={{ backgroundColor: bg, borderColor: border }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color }}>
              {label}
            </p>
            <p className="text-sm font-black" style={{ color }}>
              {formatPrice(value)}
            </p>
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <div
        className="relative rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#E2E8F0]"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[300px] sm:h-[260px] md:h-[220px]">
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2563EB" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines + Y labels */}
          {yTicks.map((v, i) => (
            <g key={i}>
              <line
                x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)}
                stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4"
              />
              <text x={padL - 6} y={toY(v)} textAnchor="end" dominantBaseline="middle" fill="#94A3B8" fontSize="10" fontFamily="inherit">
                {v.toFixed(0)}€
              </text>
            </g>
          ))}

          {/* X axis date labels */}
          {pts.map((pt, i) => {
            if (i % xStep !== 0 && i !== pts.length - 1) return null;
            const d = new Date(pt.date);
            const lbl = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
            return (
              <text key={i} x={pt.x} y={H - padB + 14} textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="inherit">
                {lbl}
              </text>
            );
          })}

          {/* Fill gradient */}
          <path d={fillPath} fill="url(#chartFill)" />

          {/* Main line */}
          <path
            d={linePath} fill="none"
            stroke="#2563EB" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          />

          {/* Min dot */}
          <circle cx={pts[minIdx].x} cy={pts[minIdx].y} r="12" fill="#059669" fillOpacity="0.12" />
          <circle cx={pts[minIdx].x} cy={pts[minIdx].y} r="6" fill="#059669" stroke="white" strokeWidth="2.5" />

          {/* Max dot */}
          <circle cx={pts[maxIdx].x} cy={pts[maxIdx].y} r="6" fill="#DC2626" stroke="white" strokeWidth="2.5" />

          {/* Last / current dot */}
          <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="6" fill="#2563EB" stroke="white" strokeWidth="2.5" />

          {/* Hover hit areas */}
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

          {/* Tooltip */}
          {hov && (() => {
            const tipW = 90, tipH = 28;
            const tipX = hov.x > W * 0.75 ? hov.x - tipW - 8 : hov.x + 10;
            const tipY = Math.max(padT + 4, hov.y - tipH / 2);
            const dateStr = new Date(hov.date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" });
            return (
              <g>
                {/* Vertical line */}
                <line x1={hov.x} y1={padT} x2={hov.x} y2={padT + cH} stroke="#0F172A" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.25" />
                {/* Dot */}
                <circle cx={hov.x} cy={hov.y} r="4.5" fill="white" stroke="#2563EB" strokeWidth="2.5" />
                {/* Bubble */}
                <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="7" fill="#0F172A" />
                <text x={tipX + tipW / 2} y={tipY + 11} textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="inherit">
                  {formatPrice(hov.price)}
                </text>
                <text x={tipX + tipW / 2} y={tipY + 22} textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="inherit">
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
        <svg key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? "text-[#F59E0B]" : "text-[#E2E8F0]"}`} fill="currentColor" viewBox="0 0 20 20">
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
  const minPrice = product.priceHistory.length > 0 ? Math.min(...product.priceHistory.map(h => h.price)) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-8 sm:space-y-10">

      {/* BLOQUE PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* GALERÍA */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden aspect-square flex items-center justify-center relative">
            {images[activeImage] ? (
              <Image
                src={images[activeImage]}
                alt={product.name}
                fill
                className="object-contain p-6"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <span className="text-8xl opacity-20">📦</span>
            )}
            {bestOffer?.discountPercent && (
              <span className="absolute top-4 left-4 bg-[#EF4444] text-white text-sm font-bold px-3 py-1 rounded-xl shadow">
                -{bestOffer.discountPercent}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 flex-shrink-0 rounded-xl border-2 overflow-hidden relative transition-all ${i === activeImage ? "border-[#2563EB]" : "border-[#E2E8F0] hover:border-[#93C5FD]"}`}
                >
                  <Image src={img} alt="" fill className="object-contain p-1" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="flex flex-col gap-5">
          <div>
            <Link href={`/categorias/${catSlug}`} className="text-xs font-bold text-[#2563EB] uppercase tracking-widest hover:underline">
              {catLabel}
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-1 leading-snug">{product.name}</h1>
            <p className="text-sm text-[#64748B] mt-1">por <span className="font-semibold text-[#334155]">{product.brand}</span></p>
          </div>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-2">
              <StarRating rating={product.rating} />
              <span className="text-sm font-bold text-[#0F172A]">{product.rating}</span>
              {product.reviewCount && (
                <span className="text-xs text-[#94A3B8]">({product.reviewCount.toLocaleString("es-ES")} valoraciones)</span>
              )}
            </div>
          )}

          {/* Specs */}
          {specs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {specs.map((s, i) => (
                <span key={i} className="flex items-center gap-1 bg-[#F1F5F9] text-[#334155] text-xs font-medium px-2.5 py-1 rounded-lg">
                  {s.icon} {s.text}
                </span>
              ))}
            </div>
          )}

          {/* Precio */}
          {bestOffer && (
            <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
              <div className="flex items-end gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">{formatPrice(bestOffer.priceCurrent)}</span>
                {bestOffer.priceOld && (
                  <span className="text-lg text-[#94A3B8] line-through mb-1">{formatPrice(bestOffer.priceOld)}</span>
                )}
                {bestOffer.discountPercent && (
                  <span className="text-sm font-bold text-[#EF4444] mb-1">-{bestOffer.discountPercent}%</span>
                )}
              </div>
              {minPrice && minPrice < bestOffer.priceCurrent * 0.95 && (
                <p className="text-xs text-[#64748B]">
                  💡 Precio mínimo histórico: <span className="font-bold text-[#059669]">{formatPrice(minPrice)}</span>
                </p>
              )}
              <StockBadge inStock={bestOffer.inStock ?? true} productId={product.id} store={bestOffer.store} category={product.category} productName={product.name} />
              <a
                href={bestOffer.externalUrl}
                target="_blank"
                rel="nofollow noopener noreferrer sponsored"
                className="flex items-center justify-center gap-2 w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-extrabold py-4 rounded-2xl text-base transition-colors shadow-lg shadow-[#F59E0B]/30"
              >
                Ver en {bestOffer.store}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <p className="text-center text-xs text-[#94A3B8]">
                {product.offers.length > 1 ? `Disponible en ${product.offers.length} tiendas · ` : ""}Precios actualizados en tiempo real · Enlace de afiliado
              </p>
            </div>
          )}

          {/* Otras tiendas */}
          {product.offers.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#475569] uppercase tracking-wider">Comparar precios</p>
              {product.offers.map((o, i) => (
                <a
                  key={i}
                  href={o.externalUrl}
                  target="_blank"
                  rel="nofollow noopener noreferrer sponsored"
                  className="flex items-center justify-between gap-2 bg-white border border-[#E2E8F0] hover:border-[#2563EB]/30 rounded-xl px-3 sm:px-4 py-3 transition-colors group"
                >
                  <span className="text-sm font-semibold text-[#334155] truncate pr-1">{o.store}</span>
                  <div className="flex items-center gap-2">
                    {o.discountPercent && (
                      <span className="text-[11px] font-bold text-[#EF4444] bg-[#FEF2F2] px-2 py-0.5 rounded-full">-{o.discountPercent}%</span>
                    )}
                    <span className="font-extrabold text-[#0F172A]">{formatPrice(o.priceCurrent)}</span>
                    <svg className="w-4 h-4 text-[#94A3B8] group-hover:text-[#2563EB] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ANÁLISIS Y DESCRIPCIÓN */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-extrabold text-[#0F172A]">Análisis y descripción</h2>
          {/* Score badge */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-baseline gap-1 px-3 py-1.5 rounded-xl font-black"
              style={{
                background: analysis.verdict.tone === "great" ? "#ECFDF5"
                  : analysis.verdict.tone === "good" ? "#EFF6FF"
                  : analysis.verdict.tone === "ok" ? "#FFFBEB"
                  : "#FEF2F2",
                color: analysis.verdict.tone === "great" ? "#059669"
                  : analysis.verdict.tone === "good" ? "#2563EB"
                  : analysis.verdict.tone === "ok" ? "#B45309"
                  : "#DC2626",
                border: `1px solid ${analysis.verdict.tone === "great" ? "#A7F3D0"
                  : analysis.verdict.tone === "good" ? "#BFDBFE"
                  : analysis.verdict.tone === "ok" ? "#FDE68A"
                  : "#FECACA"}`,
              }}
            >
              <span className="text-xl tabular-nums">{analysis.score.toFixed(1)}</span>
              <span className="text-xs opacity-70">/ 10</span>
            </div>
            <span
              className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{
                background: analysis.verdict.tone === "great" ? "#ECFDF5"
                  : analysis.verdict.tone === "good" ? "#EFF6FF"
                  : analysis.verdict.tone === "ok" ? "#FFFBEB"
                  : "#FEF2F2",
                color: analysis.verdict.tone === "great" ? "#059669"
                  : analysis.verdict.tone === "good" ? "#2563EB"
                  : analysis.verdict.tone === "ok" ? "#B45309"
                  : "#DC2626",
              }}
            >
              {analysis.verdict.label}
            </span>
          </div>
        </div>

        {/* One-liner */}
        <p className="text-[#334155] text-[15px] leading-relaxed font-medium">{analysis.oneLiner}</p>

        {/* Highlights chips */}
        {analysis.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {analysis.highlights.map((h) => (
              <div
                key={h.label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
              >
                <span className="text-base leading-none">{h.icon}</span>
                <span className="font-bold text-[#0F172A]">{h.label}:</span>
                <span className="text-[#475569]">{h.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Comparativa con la categoría */}
        {(analysis.comparison.priceVsAvg !== null || analysis.comparison.ratingVsAvg !== null || analysis.comparison.pricePercentile !== null) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {analysis.comparison.priceVsAvg !== null && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Precio vs media</p>
                <p
                  className="text-base font-black tabular-nums"
                  style={{ color: analysis.comparison.priceVsAvg <= 0 ? "#059669" : "#DC2626" }}
                >
                  {analysis.comparison.priceVsAvg > 0 ? "+" : ""}{analysis.comparison.priceVsAvg}%
                </p>
                <p className="text-[11px] text-[#94A3B8]">
                  {analysis.comparison.priceVsAvg <= 0 ? "más barato que la media" : "por encima de la media"}
                </p>
              </div>
            )}
            {analysis.comparison.ratingVsAvg !== null && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Rating vs media</p>
                <p
                  className="text-base font-black tabular-nums"
                  style={{ color: analysis.comparison.ratingVsAvg >= 0 ? "#059669" : "#DC2626" }}
                >
                  {analysis.comparison.ratingVsAvg >= 0 ? "+" : ""}{analysis.comparison.ratingVsAvg.toFixed(1)}
                </p>
                <p className="text-[11px] text-[#94A3B8]">
                  {analysis.comparison.ratingVsAvg >= 0 ? "puntos sobre la media" : "puntos bajo la media"}
                </p>
              </div>
            )}
            {analysis.comparison.pricePercentile !== null && (
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Posición de precio</p>
                <p className="text-base font-black tabular-nums text-[#0F172A]">
                  Top {analysis.comparison.pricePercentile <= 50 ? `${100 - analysis.comparison.pricePercentile}%` : `${analysis.comparison.pricePercentile}%`}
                </p>
                <p className="text-[11px] text-[#94A3B8]">
                  {analysis.comparison.pricePercentile <= 25
                    ? "entre los más baratos"
                    : analysis.comparison.pricePercentile <= 50
                    ? "en la mitad económica"
                    : analysis.comparison.pricePercentile >= 75
                    ? "en gama alta"
                    : "en la mitad alta"}{" "} de su categoría
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pros / Contras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="rounded-2xl border border-[#A7F3D0] bg-[#F0FDF4] p-4">
            <p className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider mb-3">✓ Lo bueno</p>
            <ul className="space-y-2">
              {analysis.pros.map((p) => (
                <li key={p} className="flex gap-2 text-[13px] text-[#0F172A] leading-relaxed">
                  <span className="text-emerald-600 mt-0.5">●</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
            <p className="text-xs font-extrabold text-red-600 uppercase tracking-wider mb-3">✗ Lo no tan bueno</p>
            <ul className="space-y-2">
              {analysis.cons.map((c) => (
                <li key={c} className="flex gap-2 text-[13px] text-[#0F172A] leading-relaxed">
                  <span className="text-red-400 mt-0.5">●</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ¿Buen momento? */}
        {analysis.bestMoment && (
          <div
            className="rounded-2xl p-4 flex gap-3 items-start"
            style={{
              background: analysis.bestMoment.isGood ? "#ECFDF5" : "#FFFBEB",
              border: `1px solid ${analysis.bestMoment.isGood ? "#A7F3D0" : "#FDE68A"}`,
            }}
          >
            <span className="text-xl shrink-0">{analysis.bestMoment.isGood ? "✅" : "⏳"}</span>
            <div>
              <p
                className="text-sm font-extrabold mb-1"
                style={{ color: analysis.bestMoment.isGood ? "#059669" : "#B45309" }}
              >
                {analysis.bestMoment.isGood ? "Buen momento para comprarlo" : "Quizá quieras esperar"}
              </p>
              <p className="text-[13px] text-[#475569] leading-relaxed">{analysis.bestMoment.reason}</p>
            </div>
          </div>
        )}

        {/* Especificaciones detectadas */}
        {specs.length > 0 && (
          <div>
            <p className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider mb-3">Especificaciones detectadas</p>
            <div className="flex flex-wrap gap-2">
              {specs.map((s) => (
                <span key={s.text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-[13px] font-semibold text-[#475569] border border-[#E2E8F0]">
                  <span>{s.icon}</span>
                  {s.text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Descripción narrativa generada */}
        <div className="pt-2 border-t border-[#F1F5F9]">
          <p className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider mb-2">Descripción</p>
          <p className="text-[#475569] text-[14px] leading-relaxed">{description}</p>
        </div>

        {/* Descripción del fabricante (collapsible) */}
        {product.description && product.description !== product.name && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-[#2563EB] hover:underline select-none list-none">
              Ver descripción completa del fabricante ▾
            </summary>
            <p className="mt-3 text-sm text-[#64748B] leading-relaxed border-t border-[#F1F5F9] pt-3">
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
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-8">
        <h2 className="text-xl font-extrabold text-[#0F172A] mb-6">Opiniones de la comunidad</h2>
        <ReviewSection productId={product.id} />
      </section>

      {/* PRODUCTOS RELACIONADOS */}
      {related.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-[#0F172A]">También te puede interesar</h2>
            <Link href={`/categorias/${catSlug}`} className="text-sm font-bold text-[#2563EB] hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {related.map((p) => {
              const thumb = p.images?.[0] ?? p.image;
              return (
                <Link
                  key={p.id}
                  href={`/productos/${p.slug}`}
                  className="group bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="aspect-square relative bg-[#F8FAFC]">
                    {thumb ? (
                      <Image src={thumb} alt={p.name} fill className="object-contain p-3" sizes="200px" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-20">📦</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-[#64748B] mb-1">{p.brand}</p>
                    <p className="text-xs font-bold text-[#0F172A] line-clamp-2 leading-snug group-hover:text-[#2563EB] transition-colors">
                      {p.name}
                    </p>
                    {p.offer && (
                      <p className="text-sm font-extrabold text-[#0F172A] mt-2">{formatPrice(p.offer.priceCurrent)}</p>
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
