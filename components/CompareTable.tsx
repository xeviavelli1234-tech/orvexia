"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { trackAffiliateClick } from "@/lib/affiliate-track";

interface Offer {
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
  inStock?: boolean;
}

export interface CompareProduct {
  id: string;
  productId?: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image: string | null;
  images: string[];
  rating: number | null;
  reviewCount: number | null;
  description: string | null;
  offers: Offer[];
}

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aire acondicionado", OTROS: "Otros",
};

const SPEC_PATTERNS: { regex: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { regex: /(\d+)\s*pulgadas/i,    label: (m) => `${m[1]}"` },
  { regex: /OLED/i,                 label: () => "OLED" },
  { regex: /QLED/i,                 label: () => "QLED" },
  { regex: /4K\s*UHD/i,             label: () => "4K UHD" },
  { regex: /Full\s*HD/i,            label: () => "Full HD" },
  { regex: /8K/i,                   label: () => "8K" },
  { regex: /HDR\s*10\+?/i,          label: () => "HDR10" },
  { regex: /Dolby\s*Vision/i,       label: () => "Dolby Vision" },
  { regex: /(\d+)\s*Hz/i,           label: (m) => `${m[1]} Hz` },
  { regex: /(\d+)\s*kg/i,           label: (m) => `${m[1]} kg` },
  { regex: /(\d+)\s*rpm/i,          label: (m) => `${m[1]} rpm` },
  { regex: /Inverter/i,             label: () => "Inverter" },
  { regex: /No\s*Frost/i,           label: () => "No Frost" },
  { regex: /Clase\s*([A-D][+]*)/i,  label: (m) => `Clase ${m[1]}` },
  { regex: /WiFi/i,                 label: () => "WiFi" },
  { regex: /Bomba\s*de\s*calor/i,   label: () => "Bomba calor" },
  { regex: /(\d+)\s*cubiertos/i,    label: (m) => `${m[1]} cubiertos` },
  { regex: /(\d+)\s*l(?:itros)?\b/i,label: (m) => `${m[1]} L` },
  { regex: /Google\s*TV/i,          label: () => "Google TV" },
  { regex: /Android\s*TV/i,         label: () => "Android TV" },
  { regex: /webOS/i,                label: () => "webOS" },
  { regex: /Tizen/i,                label: () => "Tizen" },
];

function extractSpecs(p: CompareProduct): string[] {
  const haystack = `${p.name} ${p.description ?? ""}`;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const { regex, label } of SPEC_PATTERNS) {
    const m = haystack.match(regex);
    if (m) {
      const v = label(m);
      if (!seen.has(v)) { seen.add(v); out.push(v); }
    }
  }
  return out;
}

function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function bestOffer(p: CompareProduct): Offer | null {
  if (p.offers.length === 0) return null;
  const inStock = p.offers.filter((o) => o.inStock !== false);
  const pool = inStock.length > 0 ? inStock : p.offers;
  return [...pool].sort((a, b) => a.priceCurrent - b.priceCurrent)[0];
}

function productKey(p: CompareProduct): string {
  return p.productId ?? p.id;
}

interface RowCellHighlight {
  a?: boolean;
  b?: boolean;
}

export function CompareTable({ products }: { products: CompareProduct[] }) {
  const pool = useMemo(() => {
    // Dedupe by productId/id
    const seen = new Set<string>();
    const out: CompareProduct[] = [];
    for (const p of products) {
      const k = productKey(p);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out;
  }, [products]);

  const [aKey, setAKey] = useState<string | null>(() => (pool[0] ? productKey(pool[0]) : null));
  const [bKey, setBKey] = useState<string | null>(() => (pool[1] ? productKey(pool[1]) : null));

  const a = useMemo(() => pool.find((p) => productKey(p) === aKey) ?? null, [pool, aKey]);
  const b = useMemo(() => pool.find((p) => productKey(p) === bKey) ?? null, [pool, bKey]);

  // ── Empty states ──────────────────────────────────────────────────────────
  if (pool.length < 2) {
    return (
      <section className="bg-bg-elevated rounded-2xl border border-white/[0.08] overflow-hidden">
        <header className="px-5 py-4 border-b border-border-subtle">
          <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300 mb-0.5">
            ▸ /compare · side-by-side
          </p>
          <h2 className="text-[15px] font-bold text-fg leading-tight">Comparar productos</h2>
        </header>
        <div className="py-10 px-6 flex flex-col items-center text-center gap-3">
          <span className="text-4xl" aria-hidden>⚖️</span>
          <div>
            <p className="text-[15px] font-semibold text-fg">
              Necesitas al menos 2 productos para comparar
            </p>
            <p className="text-[13px] text-fg-subtle mt-1 max-w-sm">
              Guarda productos que te interesen desde cualquier ficha y vuelve aquí
              para enfrentarlos lado a lado.
            </p>
          </div>
          <Link
            href="/categorias"
            className="mt-1 text-sm font-semibold text-white px-5 py-2 rounded-full"
            style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}
          >
            Explorar categorías
          </Link>
        </div>
      </section>
    );
  }

  if (!a || !b) return null;

  const offerA = bestOffer(a);
  const offerB = bestOffer(b);
  const specsA = extractSpecs(a);
  const specsB = extractSpecs(b);

  // ── Winners por fila ──────────────────────────────────────────────────────
  const priceA = offerA?.priceCurrent ?? null;
  const priceB = offerB?.priceCurrent ?? null;
  const priceWinner: RowCellHighlight =
    priceA !== null && priceB !== null
      ? priceA < priceB ? { a: true } : priceA > priceB ? { b: true } : {}
      : {};

  const discA = offerA?.discountPercent ?? 0;
  const discB = offerB?.discountPercent ?? 0;
  const discWinner: RowCellHighlight =
    discA > discB ? { a: true } : discB > discA ? { b: true } : {};

  const ratingWinner: RowCellHighlight =
    a.rating !== null && b.rating !== null
      ? a.rating > b.rating ? { a: true } : a.rating < b.rating ? { b: true } : {}
      : a.rating !== null ? { a: true } : b.rating !== null ? { b: true } : {};

  const storesA = a.offers.length;
  const storesB = b.offers.length;
  const storesWinner: RowCellHighlight =
    storesA > storesB ? { a: true } : storesB > storesA ? { b: true } : {};

  const stockA = offerA?.inStock !== false;
  const stockB = offerB?.inStock !== false;
  const stockWinner: RowCellHighlight =
    stockA && !stockB ? { a: true } : !stockA && stockB ? { b: true } : {};

  // ── Veredicto ────────────────────────────────────────────────────────────
  const winsA: string[] = [];
  const winsB: string[] = [];
  if (priceWinner.a) winsA.push("precio");
  if (priceWinner.b) winsB.push("precio");
  if (discWinner.a) winsA.push("descuento");
  if (discWinner.b) winsB.push("descuento");
  if (ratingWinner.a) winsA.push("valoración");
  if (ratingWinner.b) winsB.push("valoración");
  if (storesWinner.a) winsA.push("tiendas");
  if (storesWinner.b) winsB.push("tiendas");

  function verdictText(): { lead: string; detail: string; tone: "a" | "b" | "tie" } {
    if (winsA.length > winsB.length) {
      return {
        lead: a!.name,
        detail: `Gana en ${winsA.join(", ")}.${winsB.length > 0 ? ` ${b!.brand} destaca en ${winsB.join(", ")}.` : ""}`,
        tone: "a",
      };
    }
    if (winsB.length > winsA.length) {
      return {
        lead: b!.name,
        detail: `Gana en ${winsB.join(", ")}.${winsA.length > 0 ? ` ${a!.brand} destaca en ${winsA.join(", ")}.` : ""}`,
        tone: "b",
      };
    }
    return {
      lead: "Empate técnico",
      detail: "Ambos productos van parejos. Decide por la marca o por las specs que más te importen.",
      tone: "tie",
    };
  }
  const verdict = verdictText();

  const sameCategory = a.category === b.category;

  function swap() {
    setAKey(bKey);
    setBKey(aKey);
  }

  function handleCtaClick(p: CompareProduct, offer: Offer, position: number) {
    trackAffiliateClick({
      productId: productKey(p),
      selectedRetailer: offer.store,
      retailerPosition: position,
      isPrimary: position === 0,
      placement: "dashboard-compare",
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="bg-bg-elevated rounded-2xl border border-white/[0.08] overflow-hidden">
      <header className="px-5 py-4 border-b border-border-subtle flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-1 h-8 rounded-full shrink-0" style={{ background: "linear-gradient(180deg,#5EEAD4,#818CF8)" }} />
          <div className="min-w-0">
            <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300 leading-none mb-0.5">
              ▸ /compare · side-by-side
            </p>
            <h2 className="text-[15px] font-bold text-fg leading-tight">Comparar productos</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={swap}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fg-muted hover:text-fg px-3 h-8 rounded-full border border-border-subtle hover:border-border-strong transition-colors"
          aria-label="Intercambiar A y B"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
          </svg>
          Intercambiar
        </button>
      </header>

      {/* Selectores */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-border-subtle bg-bg-subtle/40">
        <Picker
          label="Producto A"
          value={aKey ?? ""}
          options={pool}
          disabledKey={bKey}
          onChange={setAKey}
        />
        <Picker
          label="Producto B"
          value={bKey ?? ""}
          options={pool}
          disabledKey={aKey}
          onChange={setBKey}
        />
      </div>

      {!sameCategory && (
        <p className="px-5 py-2.5 text-[12px] text-[#B45309] bg-[#FFFBEB] border-b border-[#FDE68A] flex items-center gap-2">
          <span aria-hidden>⚠️</span>
          Comparas dos categorías distintas ({CATEGORY_LABELS[a.category] ?? a.category} vs {CATEGORY_LABELS[b.category] ?? b.category}). Las specs no son directamente comparables.
        </p>
      )}

      {/* Cabecera con imágenes */}
      <div className="grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] gap-0 border-b border-border-subtle">
        <div className="px-3 py-4 sm:px-5 sm:py-5 flex items-end">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">Producto</p>
        </div>
        {[a, b].map((p, i) => {
          const offer = i === 0 ? offerA : offerB;
          return (
            <div key={i} className="px-3 py-4 sm:px-5 sm:py-5 border-l border-border-subtle">
              <Link
                href={`/productos/${p.slug}`}
                className="block group"
              >
                <div className="aspect-square w-full max-w-[160px] mx-auto bg-white rounded-xl border border-border overflow-hidden relative mb-3">
                  {p.image || p.images?.[0] ? (
                    <Image
                      src={p.images?.[0] ?? p.image ?? ""}
                      alt={p.name}
                      fill
                      className="object-contain p-2 sm:p-3 transition-transform group-hover:scale-[1.04]"
                      sizes="160px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-25">📦</div>
                  )}
                  {offer?.discountPercent ? (
                    <span className="absolute top-2 left-2 inline-flex items-center px-2 h-6 rounded-md bg-fg-strong text-bg text-[11px] font-bold">
                      −{offer.discountPercent}%
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] font-bold text-cyan-300 mb-0.5">{p.brand}</p>
                <p className="text-[13px] font-bold text-fg line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
                  {p.name}
                </p>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Filas de la tabla */}
      <div className="text-[13px]">
        <Row label="Mejor precio">
          <CellPrice value={priceA !== null ? formatPrice(priceA) : "—"} oldValue={offerA?.priceOld ?? null} highlight={priceWinner.a} />
          <CellPrice value={priceB !== null ? formatPrice(priceB) : "—"} oldValue={offerB?.priceOld ?? null} highlight={priceWinner.b} />
        </Row>

        <Row label="Descuento">
          <Cell highlight={discWinner.a}>
            {offerA?.discountPercent ? (
              <span className="inline-flex items-center px-2 h-6 rounded-md bg-lime-400/15 text-lime-300 border border-lime-400/30 font-bold tabular text-[12px]">
                −{offerA.discountPercent}%
              </span>
            ) : <span className="text-fg-subtle">Sin descuento</span>}
          </Cell>
          <Cell highlight={discWinner.b}>
            {offerB?.discountPercent ? (
              <span className="inline-flex items-center px-2 h-6 rounded-md bg-lime-400/15 text-lime-300 border border-lime-400/30 font-bold tabular text-[12px]">
                −{offerB.discountPercent}%
              </span>
            ) : <span className="text-fg-subtle">Sin descuento</span>}
          </Cell>
        </Row>

        <Row label="Valoración">
          <Cell highlight={ratingWinner.a}>
            {a.rating !== null ? (
              <span className="inline-flex items-center gap-1.5 font-semibold tabular">
                <span aria-hidden>⭐</span>{a.rating.toFixed(1)}
                {a.reviewCount ? <span className="text-fg-subtle font-normal text-[11px]">({a.reviewCount})</span> : null}
              </span>
            ) : <span className="text-fg-subtle">Sin reseñas</span>}
          </Cell>
          <Cell highlight={ratingWinner.b}>
            {b.rating !== null ? (
              <span className="inline-flex items-center gap-1.5 font-semibold tabular">
                <span aria-hidden>⭐</span>{b.rating.toFixed(1)}
                {b.reviewCount ? <span className="text-fg-subtle font-normal text-[11px]">({b.reviewCount})</span> : null}
              </span>
            ) : <span className="text-fg-subtle">Sin reseñas</span>}
          </Cell>
        </Row>

        <Row label="Tiendas">
          <Cell highlight={storesWinner.a}>
            <span className="font-semibold tabular">{storesA}</span>
            <span className="text-fg-subtle text-[11px] ml-1">disponible{storesA !== 1 ? "s" : ""}</span>
          </Cell>
          <Cell highlight={storesWinner.b}>
            <span className="font-semibold tabular">{storesB}</span>
            <span className="text-fg-subtle text-[11px] ml-1">disponible{storesB !== 1 ? "s" : ""}</span>
          </Cell>
        </Row>

        <Row label="Stock">
          <Cell highlight={stockWinner.a}>
            {stockA
              ? <span className="inline-flex items-center gap-1 text-accent-700 font-semibold"><span aria-hidden>✓</span> En stock</span>
              : <span className="text-danger-600 font-semibold">Agotado</span>}
          </Cell>
          <Cell highlight={stockWinner.b}>
            {stockB
              ? <span className="inline-flex items-center gap-1 text-accent-700 font-semibold"><span aria-hidden>✓</span> En stock</span>
              : <span className="text-danger-600 font-semibold">Agotado</span>}
          </Cell>
        </Row>

        <Row label="Categoría">
          <Cell>{CATEGORY_LABELS[a.category] ?? a.category}</Cell>
          <Cell>{CATEGORY_LABELS[b.category] ?? b.category}</Cell>
        </Row>

        <Row label="Specs">
          <Cell>
            {specsA.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {specsA.map((s) => (
                  <span key={s} className="inline-flex items-center px-2 h-6 rounded-md bg-bg-subtle border border-border-subtle text-[11px] font-medium text-fg-muted">
                    {s}
                  </span>
                ))}
              </div>
            ) : <span className="text-fg-subtle text-[12px]">—</span>}
          </Cell>
          <Cell>
            {specsB.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {specsB.map((s) => (
                  <span key={s} className="inline-flex items-center px-2 h-6 rounded-md bg-bg-subtle border border-border-subtle text-[11px] font-medium text-fg-muted">
                    {s}
                  </span>
                ))}
              </div>
            ) : <span className="text-fg-subtle text-[12px]">—</span>}
          </Cell>
        </Row>

        {/* CTA row */}
        <div className="grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] border-t border-border-subtle">
          <div className="px-3 py-4 sm:px-5 sm:py-4 flex items-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">Ir a la tienda</p>
          </div>
          {[{ p: a, offer: offerA }, { p: b, offer: offerB }].map(({ p, offer }, i) => (
            <div key={i} className="px-3 py-4 sm:px-5 sm:py-4 border-l border-border-subtle">
              {offer ? (
                <a
                  href={offer.externalUrl}
                  target="_blank"
                  rel="nofollow noopener noreferrer sponsored"
                  onClick={() => handleCtaClick(p, offer, 0)}
                  className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-extrabold h-10 sm:h-11 rounded-xl text-[13px] transition-all shadow-md shadow-brand-600/25"
                >
                  Ver en {offer.store}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              ) : (
                <div className="text-center text-[12px] text-fg-subtle py-2">Sin oferta disponible</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Veredicto */}
      <div
        className="px-5 py-4 border-t border-border-subtle flex items-start gap-3"
        style={{
          background: verdict.tone === "tie"
            ? "var(--bg-subtle)"
            : "linear-gradient(135deg, rgba(94,234,212,0.08), rgba(129,140,248,0.08))",
        }}
      >
        <span className="text-xl shrink-0" aria-hidden>
          {verdict.tone === "tie" ? "🤝" : "🏆"}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle mb-0.5">Veredicto</p>
          <p className="text-[14px] font-extrabold text-fg leading-snug">
            {verdict.lead}
          </p>
          <p className="text-[12px] text-fg-muted leading-relaxed mt-0.5">
            {verdict.detail}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function Picker({
  label, value, options, disabledKey, onChange,
}: {
  label: string;
  value: string;
  options: CompareProduct[];
  disabledKey: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-elevated border border-border rounded-xl px-3 h-10 text-[13px] font-semibold text-fg focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none transition"
      >
        {options.map((p) => {
          const key = productKey(p);
          return (
            <option key={key} value={key} disabled={key === disabledKey}>
              {p.brand} — {p.name.length > 60 ? p.name.slice(0, 60) + "…" : p.name}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] border-t border-border-subtle">
      <div className="px-3 py-3 sm:px-5 sm:py-3.5 flex items-center bg-bg-subtle/40">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">{label}</p>
      </div>
      {children}
    </div>
  );
}

function Cell({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`px-3 py-3 sm:px-5 sm:py-3.5 border-l border-border-subtle flex items-center ${
        highlight ? "bg-accent-50/50" : ""
      }`}
    >
      <div className={highlight ? "text-accent-700 font-bold" : "text-fg"}>
        {children}
      </div>
    </div>
  );
}

function CellPrice({
  value, oldValue, highlight,
}: {
  value: string; oldValue: number | null; highlight?: boolean;
}) {
  return (
    <div
      className={`px-3 py-3 sm:px-5 sm:py-3.5 border-l border-border-subtle flex flex-col justify-center ${
        highlight ? "bg-accent-50/50" : ""
      }`}
    >
      <span className={`text-base sm:text-lg font-extrabold tabular ${highlight ? "text-accent-700" : "text-fg"}`}>
        {value}
        {highlight && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider align-middle">↓ mejor</span>}
      </span>
      {oldValue !== null && (
        <span className="text-[11px] text-fg-subtle line-through tabular mt-0.5">
          {formatPrice(oldValue)}
        </span>
      )}
    </div>
  );
}
