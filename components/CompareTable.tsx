"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { trackAffiliateClick } from "@/lib/affiliate-track";

// ─── Tipos ───────────────────────────────────────────────────────────────────

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

interface AnalysisHighlight { icon: string; label: string; value: string }
interface ProductAnalysis {
  score: number;
  verdict: { label: string; tone: "great" | "good" | "ok" | "warn" };
  oneLiner: string;
  comparison: {
    priceVsAvg: number | null;
    ratingVsAvg: number | null;
    pricePercentile: number | null;
  };
  pros: string[];
  cons: string[];
  bestMoment: { isGood: boolean; reason: string } | null;
  highlights: AnalysisHighlight[];
}

interface DetailedOffer extends Offer { inStock: boolean }

interface DetailedProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  image: string | null;
  images: string[];
  description: string | null;
  rating: number | null;
  reviewCount: number | null;
  offers: DetailedOffer[];
  priceHistory: { price: number; date: string }[];
  analysis: ProductAnalysis;
}

interface CompareApiResponse {
  a: DetailedProduct;
  b: DetailedProduct;
  category: string;
}

// ─── Metadatos de categorías ──────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  TELEVISORES:          { label: "Televisores",         icon: "📺" },
  LAVADORAS:            { label: "Lavadoras",           icon: "🫧" },
  FRIGORIFICOS:         { label: "Frigoríficos",        icon: "🧊" },
  LAVAVAJILLAS:         { label: "Lavavajillas",        icon: "🍽️" },
  SECADORAS:            { label: "Secadoras",           icon: "💨" },
  HORNOS:               { label: "Hornos",              icon: "🔥" },
  MICROONDAS:           { label: "Microondas",          icon: "📡" },
  ASPIRADORAS:          { label: "Aspiradoras",         icon: "🌀" },
  CAFETERAS:            { label: "Cafeteras",           icon: "☕" },
  AIRES_ACONDICIONADOS: { label: "Aire acondicionado",  icon: "❄️" },
  OTROS:                { label: "Otros",               icon: "📦" },
};

function categoryLabel(c: string): string { return CATEGORY_META[c]?.label ?? c; }
function categoryIcon(c: string): string  { return CATEGORY_META[c]?.icon ?? "📦"; }

// ─── Specs detectadas (regex sobre name+description) ──────────────────────────

const SPEC_PATTERNS: { regex: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { regex: /(\d+)\s*pulgadas/i,     label: (m) => `${m[1]}"` },
  { regex: /OLED/i,                  label: () => "OLED" },
  { regex: /QLED/i,                  label: () => "QLED" },
  { regex: /4K\s*UHD/i,              label: () => "4K UHD" },
  { regex: /Full\s*HD/i,             label: () => "Full HD" },
  { regex: /8K/i,                    label: () => "8K" },
  { regex: /HDR\s*10\+?/i,           label: () => "HDR10" },
  { regex: /Dolby\s*Vision/i,        label: () => "Dolby Vision" },
  { regex: /(\d+)\s*Hz/i,            label: (m) => `${m[1]} Hz` },
  { regex: /(\d+)\s*kg/i,            label: (m) => `${m[1]} kg` },
  { regex: /(\d+)\s*rpm/i,           label: (m) => `${m[1]} rpm` },
  { regex: /Inverter/i,              label: () => "Inverter" },
  { regex: /No\s*Frost/i,            label: () => "No Frost" },
  { regex: /Clase\s*([A-D][+]*)/i,   label: (m) => `Clase ${m[1]}` },
  { regex: /WiFi/i,                  label: () => "WiFi" },
  { regex: /Bluetooth/i,             label: () => "Bluetooth" },
  { regex: /Bomba\s*de\s*calor/i,    label: () => "Bomba calor" },
  { regex: /(\d+)\s*cubiertos/i,     label: (m) => `${m[1]} cubiertos` },
  { regex: /(\d+)\s*l(?:itros)?\b/i, label: (m) => `${m[1]} L` },
  { regex: /(\d+)\s*W\b/i,           label: (m) => `${m[1]} W` },
  { regex: /(\d+)\s*bar/i,           label: (m) => `${m[1]} bar` },
  { regex: /Google\s*TV/i,           label: () => "Google TV" },
  { regex: /Android\s*TV/i,          label: () => "Android TV" },
  { regex: /webOS/i,                 label: () => "webOS" },
  { regex: /Tizen/i,                 label: () => "Tizen" },
  { regex: /Alexa/i,                 label: () => "Alexa" },
  { regex: /HEPA/i,                  label: () => "HEPA" },
];

function extractSpecs(name: string, description: string | null): string[] {
  const hay = `${name} ${description ?? ""}`;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const { regex, label } of SPEC_PATTERNS) {
    const m = hay.match(regex);
    if (m) {
      const v = label(m);
      if (!seen.has(v)) { seen.add(v); out.push(v); }
    }
  }
  return out;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function bestOffer<T extends Offer>(offers: T[]): T | null {
  if (offers.length === 0) return null;
  const inStock = offers.filter((o) => o.inStock !== false);
  const pool = inStock.length > 0 ? inStock : offers;
  return [...pool].sort((a, b) => a.priceCurrent - b.priceCurrent)[0];
}

function productKey(p: CompareProduct): string {
  return p.productId ?? p.id;
}

// ─── Componente principal ────────────────────────────────────────────────────

// Todas las categorías disponibles, en el orden en que se muestran. Mantengo
// "OTROS" fuera porque no tiene sentido comparar un cajón de sastre.
const ALL_CATEGORIES: string[] = [
  "TELEVISORES", "FRIGORIFICOS", "LAVADORAS", "SECADORAS",
  "LAVAVAJILLAS", "HORNOS", "MICROONDAS", "ASPIRADORAS",
  "CAFETERAS", "AIRES_ACONDICIONADOS",
];

export function CompareTable({ products }: { products: CompareProduct[] }) {
  // Guardados agrupados por categoría — sirven como atajo dentro del picker.
  const savedByCategory = useMemo(() => {
    const seen = new Set<string>();
    const out: Record<string, CompareProduct[]> = {};
    for (const p of products) {
      const k = productKey(p);
      if (seen.has(k)) continue;
      seen.add(k);
      (out[p.category] ??= []).push(p);
    }
    return out;
  }, [products]);

  // Categoría inicial: la que más guardados tenga, o TELEVISORES si no hay.
  const [category, setCategory] = useState<string>(() => {
    const sorted = ALL_CATEGORIES
      .slice()
      .sort((a, b) => (savedByCategory[b]?.length ?? 0) - (savedByCategory[a]?.length ?? 0));
    return sorted[0] ?? "TELEVISORES";
  });
  const [query, setQuery] = useState("");
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);

  // Productos del catálogo en la categoría actual (con filtro de búsqueda).
  // Se refetchea con debounce al cambiar categoría o query.
  const [catalogPool, setCatalogPool] = useState<CompareProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoadingCatalog(true);
      const url = `/api/compare/picker?category=${encodeURIComponent(category)}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
      fetch(url)
        .then((r) => r.ok ? r.json() : { products: [] })
        .then((d: { products: CompareProduct[] }) => {
          if (!cancelled) setCatalogPool(d.products ?? []);
        })
        .catch(() => { if (!cancelled) setCatalogPool([]); })
        .finally(() => { if (!cancelled) setLoadingCatalog(false); });
    }, query ? 250 : 0); // pequeño debounce solo cuando se está tecleando
    return () => { cancelled = true; clearTimeout(handle); };
  }, [category, query]);

  // Pool combinado: guardados de la categoría primero, luego catálogo (dedupe por id).
  const currentPool = useMemo(() => {
    const saved = savedByCategory[category] ?? [];
    const ids = new Set(saved.map(productKey));
    const merged: CompareProduct[] = [...saved];
    for (const p of catalogPool) {
      const k = productKey(p);
      if (!ids.has(k)) { ids.add(k); merged.push(p); }
    }
    return merged;
  }, [savedByCategory, category, catalogPool]);

  // Conjunto de ids guardados (para marcar el chip ♥ en el picker).
  const savedIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of products) s.add(productKey(p));
    return s;
  }, [products]);

  // Al cambiar de categoría, deselecciona A y B (eran de otra categoría).
  // Si hay guardados en la nueva, autoescoge los 2 primeros como en la versión anterior.
  useEffect(() => {
    setQuery("");
    const list = savedByCategory[category] ?? [];
    setAId(list[0] ? productKey(list[0]) : null);
    setBId(list[1] ? productKey(list[1]) : null);
  }, [category, savedByCategory]);

  // Toggle FIFO: tap en uno seleccionado lo quita; en uno nuevo, llena el
  // hueco vacío o desplaza A si los dos están llenos.
  const toggleSelect = useCallback((key: string) => {
    setAId((prevA) => {
      if (key === prevA) return null;
      if (key === bId) { setBId(null); return prevA; }
      if (!prevA) return key;
      if (!bId) { setBId(key); return prevA; }
      // Ambos llenos → A se descarta, B pasa a A, key pasa a B.
      const newA = bId;
      setBId(key);
      return newA;
    });
  }, [bId]);

  // Detalle: fetch al /api/compare cuando hay A y B
  const [detail, setDetail] = useState<CompareApiResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!aId || !bId || aId === bId) { setDetail(null); return; }
    let cancelled = false;
    setLoadingDetail(true);
    setDetailError(null);
    fetch(`/api/compare?a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d: CompareApiResponse) => { if (!cancelled) setDetail(d); })
      .catch((e: unknown) => {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : "Error de red");
      })
      .finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [aId, bId]);

  const swap = useCallback(() => {
    setAId((prevA) => { setBId(prevA); return bId; });
  }, [bId]);

  const handleCtaClick = useCallback((p: DetailedProduct, offer: Offer) => {
    trackAffiliateClick({
      productId: p.id,
      selectedRetailer: offer.store,
      retailerPosition: 0,
      isPrimary: true,
      placement: "dashboard-compare",
    });
  }, []);

  return (
    <section className="bg-bg-elevated rounded-2xl border border-white/[0.08] overflow-hidden">
      <Header onSwap={aId && bId ? swap : undefined} />

      {/* ── Paso 1: categoría (todas, restringe el comparado a misma cat.) ── */}
      <div className="px-4 sm:px-5 py-3 border-b border-border-subtle bg-bg-subtle/40">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle mb-2">
          1 · Categoría <span className="text-fg-subtle/70 font-normal normal-case tracking-normal">— se compara sólo dentro de la misma</span>
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {ALL_CATEGORIES.map((c) => {
            const active = c === category;
            const savedCount = savedByCategory[c]?.length ?? 0;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 snap-start inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold border transition-all ${
                  active
                    ? "bg-cyan-400/15 border-cyan-400/50 text-cyan-200 shadow-[0_0_18px_-6px_rgba(94,234,212,0.5)]"
                    : "bg-bg-elevated border-border text-fg-muted hover:border-border-strong hover:text-fg"
                }`}
                aria-pressed={active}
              >
                <span aria-hidden>{categoryIcon(c)}</span>
                <span>{categoryLabel(c)}</span>
                {savedCount > 0 && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] tabular ${active ? "text-cyan-300" : "text-fg-subtle"}`}
                    title={`${savedCount} guardado${savedCount === 1 ? "" : "s"}`}
                  >
                    ♥{savedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Paso 2: buscar + tarjetas seleccionables ──────────────────────── */}
      <div className="px-4 sm:px-5 py-4 border-b border-border-subtle">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">
            2 · Toca 2 productos
          </p>
          <p className="text-[11px] text-fg-muted">
            {aId && bId
              ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1 align-middle" /><span className="font-semibold text-cyan-300">A</span> vs <span className="inline-block w-1.5 h-1.5 rounded-full bg-fuchsia-400 mr-1 ml-1 align-middle" /><span className="font-semibold text-fuchsia-300">B</span></>
              : aId
                ? "Falta el segundo (B)"
                : "Ninguno seleccionado"}
          </p>
        </div>

        <div className="relative mb-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar ${categoryLabel(category).toLowerCase()} por marca, modelo…`}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-bg-subtle border border-border text-[13px] text-fg placeholder:text-fg-subtle focus:outline-none focus:border-cyan-400/50 focus:bg-bg-elevated transition-colors"
            aria-label="Buscar producto del catálogo"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        <PickerGrid
          pool={currentPool}
          aId={aId}
          bId={bId}
          onToggle={toggleSelect}
          savedIds={savedIds}
          loading={loadingCatalog}
          query={query}
          categoryLabel={categoryLabel(category)}
        />
      </div>

      {/* ── Tabla comparativa ──────────────────────────────────────────────── */}
      {!aId || !bId ? (
        <div className="py-10 px-6 text-center text-[13px] text-fg-subtle">
          Elige dos productos para ver la comparativa detallada.
        </div>
      ) : loadingDetail && !detail ? (
        <TableSkeleton />
      ) : detailError ? (
        <div className="py-8 px-6 text-center">
          <p className="text-[14px] font-semibold text-danger-600 mb-1">No se pudo cargar la comparación</p>
          <p className="text-[12px] text-fg-subtle">{detailError}</p>
        </div>
      ) : detail ? (
        <DetailTable a={detail.a} b={detail.b} onCtaClick={handleCtaClick} />
      ) : null}
    </section>
  );
}

// ─── Subcomponentes UI ───────────────────────────────────────────────────────

function Header({ onSwap }: { onSwap?: () => void }) {
  return (
    <header className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-border-subtle flex items-center justify-between gap-2 sm:gap-3">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-1 h-7 sm:h-8 rounded-full shrink-0" style={{ background: "linear-gradient(180deg,#5EEAD4,#818CF8)" }} />
        <div className="min-w-0">
          <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300 leading-none mb-0.5">
            ▸ /compare · side-by-side
          </p>
          <h2 className="text-[14px] sm:text-[15px] font-bold text-fg leading-tight">Comparar productos</h2>
        </div>
      </div>
      {onSwap && (
        <button
          type="button"
          onClick={onSwap}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fg-muted hover:text-fg px-2.5 sm:px-3 h-8 rounded-full border border-border-subtle hover:border-border-strong transition-colors shrink-0"
          aria-label="Intercambiar A y B"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
          </svg>
          <span className="hidden sm:inline">Intercambiar</span>
        </button>
      )}
    </header>
  );
}

function PickerGrid({
  pool, aId, bId, onToggle, savedIds, loading, query, categoryLabel,
}: {
  pool: CompareProduct[];
  aId: string | null;
  bId: string | null;
  onToggle: (key: string) => void;
  savedIds: Set<string>;
  loading: boolean;
  query: string;
  categoryLabel: string;
}) {
  if (pool.length === 0) {
    if (loading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3" aria-busy>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border-2 border-border p-2 sm:p-2.5 animate-pulse">
              <div className="aspect-square w-full bg-bg-subtle rounded-lg mb-2" />
              <div className="h-3 bg-bg-subtle rounded w-1/3 mb-1" />
              <div className="h-3 bg-bg-subtle rounded w-4/5" />
            </div>
          ))}
        </div>
      );
    }
    return (
      <p className="py-6 text-center text-[12px] text-fg-subtle">
        {query
          ? `No hay ${categoryLabel.toLowerCase()} que coincidan con "${query}".`
          : `No hay ${categoryLabel.toLowerCase()} en el catálogo todavía.`}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
      {pool.map((p) => {
        const k = productKey(p);
        const isA = k === aId;
        const isB = k === bId;
        const isSaved = savedIds.has(k);
        const offer = bestOffer(p.offers);
        const ringClass = isA
          ? "border-cyan-400/70 bg-cyan-400/[0.06] shadow-[0_0_18px_-6px_rgba(94,234,212,0.45)]"
          : isB
            ? "border-fuchsia-400/70 bg-fuchsia-400/[0.06] shadow-[0_0_18px_-6px_rgba(232,121,249,0.45)]"
            : "border-border bg-bg-elevated hover:border-border-strong";
        const badgeClass = isA ? "bg-cyan-500" : "bg-fuchsia-500";
        return (
          <button
            key={k}
            type="button"
            onClick={() => onToggle(k)}
            className={`relative rounded-xl border-2 p-2 sm:p-2.5 flex flex-col gap-1.5 text-left transition-all ${ringClass}`}
            aria-pressed={isA || isB}
            aria-label={`${isA ? "Quitar de A" : isB ? "Quitar de B" : "Seleccionar"} ${p.brand} ${p.name}`}
          >
            {(isA || isB) && (
              <span
                className={`absolute top-1.5 left-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[11px] font-extrabold shadow-md z-10 ${badgeClass}`}
                aria-hidden
              >
                {isA ? "A" : "B"}
              </span>
            )}
            {isSaved && !isA && !isB && (
              <span
                className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/90 text-white text-[10px] z-10 shadow"
                title="Producto guardado"
                aria-label="Guardado"
              >
                ♥
              </span>
            )}
            <div className="aspect-square w-full bg-white rounded-lg border border-border overflow-hidden relative">
              {p.image || p.images?.[0] ? (
                <Image
                  src={p.images?.[0] ?? p.image ?? ""}
                  alt=""
                  fill
                  className="object-contain p-1 sm:p-1.5"
                  sizes="(max-width: 640px) 45vw, 200px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-25">📦</div>
              )}
            </div>
            <p className="text-[10px] font-bold text-cyan-300 truncate">{p.brand}</p>
            <p className="text-[11px] sm:text-[12px] font-bold text-fg line-clamp-2 leading-tight break-words flex-1 min-h-[2.2em]">
              {p.name}
            </p>
            {offer && (
              <p className="text-[12px] sm:text-[13px] font-extrabold text-fg tabular">
                {formatPrice(offer.priceCurrent)}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="px-4 sm:px-5 py-5 space-y-3 animate-pulse">
      <div className="h-32 rounded-xl bg-bg-subtle" />
      <div className="h-6 rounded-md bg-bg-subtle" />
      <div className="h-6 rounded-md bg-bg-subtle w-3/4" />
      <div className="h-6 rounded-md bg-bg-subtle w-5/6" />
      <div className="h-10 rounded-md bg-bg-subtle" />
    </div>
  );
}

// ─── Tabla detallada ─────────────────────────────────────────────────────────

const VERDICT_TONE: Record<string, { bg: string; fg: string; border: string }> = {
  great: { bg: "var(--accent-50)",  fg: "var(--accent-700)", border: "var(--accent-100)" },
  good:  { bg: "var(--brand-50)",   fg: "var(--brand-700)",  border: "var(--brand-100)" },
  ok:    { bg: "#FFFBEB",            fg: "#B45309",           border: "#FDE68A" },
  warn:  { bg: "var(--danger-50)",   fg: "var(--danger-600)", border: "#FECACA" },
};

function DetailTable({
  a, b, onCtaClick,
}: {
  a: DetailedProduct;
  b: DetailedProduct;
  onCtaClick: (p: DetailedProduct, offer: Offer) => void;
}) {
  const offerA = bestOffer(a.offers);
  const offerB = bestOffer(b.offers);
  const specsA = extractSpecs(a.name, a.description);
  const specsB = extractSpecs(b.name, b.description);

  const priceA = offerA?.priceCurrent ?? null;
  const priceB = offerB?.priceCurrent ?? null;
  const savingA = (offerA?.priceOld ?? 0) - (offerA?.priceCurrent ?? 0);
  const savingB = (offerB?.priceOld ?? 0) - (offerB?.priceCurrent ?? 0);
  const minHistA = a.priceHistory.length > 0 ? Math.min(...a.priceHistory.map((h) => h.price)) : null;
  const minHistB = b.priceHistory.length > 0 ? Math.min(...b.priceHistory.map((h) => h.price)) : null;

  function winner(condA: boolean, condB: boolean): "a" | "b" | null {
    if (condA && !condB) return "a";
    if (condB && !condA) return "b";
    return null;
  }

  const wScore   = a.analysis.score > b.analysis.score ? "a" : a.analysis.score < b.analysis.score ? "b" : null;
  const wPrice   = priceA !== null && priceB !== null ? (priceA < priceB ? "a" : priceA > priceB ? "b" : null) : null;
  const wDisc    = (offerA?.discountPercent ?? 0) > (offerB?.discountPercent ?? 0) ? "a"
                   : (offerB?.discountPercent ?? 0) > (offerA?.discountPercent ?? 0) ? "b" : null;
  const wSaving  = savingA > savingB ? "a" : savingB > savingA ? "b" : null;
  const wMin     = minHistA !== null && minHistB !== null
                     ? (priceA !== null && priceA <= minHistA ? "a" : priceB !== null && priceB <= minHistB ? "b" : null)
                     : minHistA !== null ? "a" : minHistB !== null ? "b" : null;
  const wRating  = (a.rating ?? 0) > (b.rating ?? 0) ? "a" : (b.rating ?? 0) > (a.rating ?? 0) ? "b" : null;
  const wReviews = (a.reviewCount ?? 0) > (b.reviewCount ?? 0) ? "a" : (b.reviewCount ?? 0) > (a.reviewCount ?? 0) ? "b" : null;
  const wStores  = a.offers.length > b.offers.length ? "a" : b.offers.length > a.offers.length ? "b" : null;
  const wStock   = winner(offerA?.inStock !== false, offerB?.inStock !== false);

  // Conteo de victorias para veredicto final
  const wins = [wScore, wPrice, wDisc, wSaving, wMin, wRating, wReviews, wStores, wStock];
  const winsA = wins.filter((w) => w === "a").length;
  const winsB = wins.filter((w) => w === "b").length;

  let verdictLead: string;
  let verdictDetail: string;
  let verdictTone: "a" | "b" | "tie";
  if (winsA > winsB) {
    verdictLead = `${a.brand} ${a.name.split(" ").slice(0, 4).join(" ")}…`;
    verdictDetail = `Gana en ${winsA} de ${wins.filter(Boolean).length} aspectos comparados.`;
    verdictTone = "a";
  } else if (winsB > winsA) {
    verdictLead = `${b.brand} ${b.name.split(" ").slice(0, 4).join(" ")}…`;
    verdictDetail = `Gana en ${winsB} de ${wins.filter(Boolean).length} aspectos comparados.`;
    verdictTone = "b";
  } else {
    verdictLead = "Empate técnico";
    verdictDetail = "Ambos van parejos. Decide por la marca o las specs que más te importen.";
    verdictTone = "tie";
  }

  return (
    <div>
      {/* Cabecera con imágenes + score + veredicto */}
      <div className="grid grid-cols-[64px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] border-b border-border-subtle">
        <div className="px-2 py-3 sm:px-5 sm:py-5 flex items-end">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-fg-subtle">Producto</p>
        </div>
        {[a, b].map((p, i) => {
          const offer = i === 0 ? offerA : offerB;
          const tone = VERDICT_TONE[p.analysis.verdict.tone] ?? VERDICT_TONE.good;
          return (
            <div key={p.id} className="px-2 py-3 sm:px-5 sm:py-5 border-l border-border-subtle min-w-0">
              <Link href={`/productos/${p.slug}`} className="block group">
                <div className="aspect-square w-full max-w-[160px] mx-auto bg-white rounded-xl border border-border overflow-hidden relative mb-2 sm:mb-3">
                  {p.image || p.images?.[0] ? (
                    <Image
                      src={p.images?.[0] ?? p.image ?? ""}
                      alt={p.name}
                      fill
                      className="object-contain p-1.5 sm:p-3 transition-transform group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 40vw, 160px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-25">📦</div>
                  )}
                  {offer?.discountPercent ? (
                    <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 inline-flex items-center px-1.5 sm:px-2 h-5 sm:h-6 rounded-md bg-fg-strong text-bg text-[10px] sm:text-[11px] font-bold">
                      −{offer.discountPercent}%
                    </span>
                  ) : null}
                </div>
                <p className="text-[10px] sm:text-[11px] font-bold text-cyan-300 mb-0.5 truncate">{p.brand}</p>
                <p className="text-[12px] sm:text-[13px] font-bold text-fg line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors break-words mb-2">
                  {p.name}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 h-5 rounded-md border"
                  style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
                >
                  {p.analysis.verdict.label}
                </span>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Filas */}
      <div className="text-[13px]">
        <Row label="Score" trophy={wScore}>
          <ScoreCell score={a.analysis.score} winner={wScore === "a"} />
          <ScoreCell score={b.analysis.score} winner={wScore === "b"} />
        </Row>

        <Row label="Mejor precio" trophy={wPrice}>
          <CellPrice value={priceA !== null ? formatPrice(priceA) : "—"} oldValue={offerA?.priceOld ?? null} winner={wPrice === "a"} />
          <CellPrice value={priceB !== null ? formatPrice(priceB) : "—"} oldValue={offerB?.priceOld ?? null} winner={wPrice === "b"} />
        </Row>

        <Row label="Descuento" trophy={wDisc}>
          <Cell winner={wDisc === "a"}>
            {offerA?.discountPercent ? (
              <span className="inline-flex items-center px-1.5 sm:px-2 h-5 sm:h-6 rounded-md bg-lime-400/15 text-lime-300 border border-lime-400/30 font-bold tabular text-[11px] sm:text-[12px]">
                −{offerA.discountPercent}%
              </span>
            ) : <span className="text-fg-subtle text-[11px]">Sin desc.</span>}
          </Cell>
          <Cell winner={wDisc === "b"}>
            {offerB?.discountPercent ? (
              <span className="inline-flex items-center px-1.5 sm:px-2 h-5 sm:h-6 rounded-md bg-lime-400/15 text-lime-300 border border-lime-400/30 font-bold tabular text-[11px] sm:text-[12px]">
                −{offerB.discountPercent}%
              </span>
            ) : <span className="text-fg-subtle text-[11px]">Sin desc.</span>}
          </Cell>
        </Row>

        <Row label="Ahorro €" trophy={wSaving}>
          <Cell winner={wSaving === "a"}>
            <span className="font-bold tabular">{savingA > 0 ? formatPrice(savingA) : "—"}</span>
          </Cell>
          <Cell winner={wSaving === "b"}>
            <span className="font-bold tabular">{savingB > 0 ? formatPrice(savingB) : "—"}</span>
          </Cell>
        </Row>

        <Row label="Mínimo 90d" trophy={wMin}>
          <Cell winner={wMin === "a"}>
            {minHistA !== null ? (
              <div>
                <span className="font-semibold tabular">{formatPrice(minHistA)}</span>
                {priceA !== null && priceA <= minHistA && (
                  <p className="text-[10px] font-bold text-accent-700 uppercase tracking-wider mt-0.5">En mínimo</p>
                )}
              </div>
            ) : <span className="text-fg-subtle text-[11px]">Sin datos</span>}
          </Cell>
          <Cell winner={wMin === "b"}>
            {minHistB !== null ? (
              <div>
                <span className="font-semibold tabular">{formatPrice(minHistB)}</span>
                {priceB !== null && priceB <= minHistB && (
                  <p className="text-[10px] font-bold text-accent-700 uppercase tracking-wider mt-0.5">En mínimo</p>
                )}
              </div>
            ) : <span className="text-fg-subtle text-[11px]">Sin datos</span>}
          </Cell>
        </Row>

        <Row label="Valoración" trophy={wRating}>
          <Cell winner={wRating === "a"}>
            {a.rating !== null ? (
              <span className="inline-flex items-center gap-1 font-semibold tabular flex-wrap">
                <span aria-hidden>⭐</span>{a.rating.toFixed(1)}
                <span className="text-fg-subtle font-normal text-[10px]">/5</span>
              </span>
            ) : <span className="text-fg-subtle">—</span>}
          </Cell>
          <Cell winner={wRating === "b"}>
            {b.rating !== null ? (
              <span className="inline-flex items-center gap-1 font-semibold tabular flex-wrap">
                <span aria-hidden>⭐</span>{b.rating.toFixed(1)}
                <span className="text-fg-subtle font-normal text-[10px]">/5</span>
              </span>
            ) : <span className="text-fg-subtle">—</span>}
          </Cell>
        </Row>

        <Row label="Reseñas" trophy={wReviews}>
          <Cell winner={wReviews === "a"}>
            <span className="font-semibold tabular">{a.reviewCount?.toLocaleString("es-ES") ?? "0"}</span>
          </Cell>
          <Cell winner={wReviews === "b"}>
            <span className="font-semibold tabular">{b.reviewCount?.toLocaleString("es-ES") ?? "0"}</span>
          </Cell>
        </Row>

        <Row label="Tiendas" trophy={wStores}>
          <Cell winner={wStores === "a"}>
            <span className="font-semibold tabular">{a.offers.length}</span>
            <span className="text-fg-subtle text-[11px] ml-1">disp.</span>
          </Cell>
          <Cell winner={wStores === "b"}>
            <span className="font-semibold tabular">{b.offers.length}</span>
            <span className="text-fg-subtle text-[11px] ml-1">disp.</span>
          </Cell>
        </Row>

        <Row label="Stock" trophy={wStock}>
          <Cell winner={wStock === "a"}>
            {(offerA?.inStock !== false)
              ? <span className="inline-flex items-center gap-1 text-accent-700 font-semibold"><span aria-hidden>✓</span><span className="hidden sm:inline"> En stock</span><span className="sm:hidden">Sí</span></span>
              : <span className="text-danger-600 font-semibold">Agotado</span>}
          </Cell>
          <Cell winner={wStock === "b"}>
            {(offerB?.inStock !== false)
              ? <span className="inline-flex items-center gap-1 text-accent-700 font-semibold"><span aria-hidden>✓</span><span className="hidden sm:inline"> En stock</span><span className="sm:hidden">Sí</span></span>
              : <span className="text-danger-600 font-semibold">Agotado</span>}
          </Cell>
        </Row>

        <Row label="Marca">
          <Cell><span className="font-semibold">{a.brand}</span></Cell>
          <Cell><span className="font-semibold">{b.brand}</span></Cell>
        </Row>

        <Row label="Modelo">
          <Cell><span className="font-mono-ui text-[11px] sm:text-[12px] text-fg-muted break-all">{a.model || "—"}</span></Cell>
          <Cell><span className="font-mono-ui text-[11px] sm:text-[12px] text-fg-muted break-all">{b.model || "—"}</span></Cell>
        </Row>

        <Row label="Specs">
          <Cell><SpecChips items={specsA} /></Cell>
          <Cell><SpecChips items={specsB} /></Cell>
        </Row>

        <Row label="Pros">
          <Cell><ProsConsList items={a.analysis.pros} tone="pro" /></Cell>
          <Cell><ProsConsList items={b.analysis.pros} tone="pro" /></Cell>
        </Row>

        <Row label="Contras">
          <Cell><ProsConsList items={a.analysis.cons} tone="con" /></Cell>
          <Cell><ProsConsList items={b.analysis.cons} tone="con" /></Cell>
        </Row>

        <Row label="¿Es el momento?">
          <Cell>
            {a.analysis.bestMoment ? (
              <div className="flex items-start gap-1.5">
                <span aria-hidden className="shrink-0">{a.analysis.bestMoment.isGood ? "✅" : "⏳"}</span>
                <span className="text-[11px] sm:text-[12px] text-fg-muted leading-snug">{a.analysis.bestMoment.reason}</span>
              </div>
            ) : <span className="text-fg-subtle text-[11px]">Sin datos</span>}
          </Cell>
          <Cell>
            {b.analysis.bestMoment ? (
              <div className="flex items-start gap-1.5">
                <span aria-hidden className="shrink-0">{b.analysis.bestMoment.isGood ? "✅" : "⏳"}</span>
                <span className="text-[11px] sm:text-[12px] text-fg-muted leading-snug">{b.analysis.bestMoment.reason}</span>
              </div>
            ) : <span className="text-fg-subtle text-[11px]">Sin datos</span>}
          </Cell>
        </Row>

        <Row label="Tiendas y precios">
          <Cell><OffersList offers={a.offers} /></Cell>
          <Cell><OffersList offers={b.offers} /></Cell>
        </Row>

        {/* CTA */}
        <div className="grid grid-cols-[64px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] border-t border-border-subtle">
          <div className="px-2 py-3 sm:px-5 sm:py-4 flex items-center">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-fg-subtle leading-tight">Ir a tienda</p>
          </div>
          {[{ p: a, offer: offerA }, { p: b, offer: offerB }].map(({ p, offer }, i) => (
            <div key={i} className="px-2 py-3 sm:px-5 sm:py-4 border-l border-border-subtle min-w-0">
              {offer ? (
                <a
                  href={offer.externalUrl}
                  target="_blank"
                  rel="nofollow noopener noreferrer sponsored"
                  onClick={() => onCtaClick(p, offer)}
                  className="flex items-center justify-center gap-1 sm:gap-2 w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-extrabold h-10 sm:h-11 rounded-xl text-[11px] sm:text-[13px] transition-all shadow-md shadow-brand-600/25 px-2"
                  aria-label={`Ver en ${offer.store}`}
                >
                  <span className="sm:hidden truncate">{offer.store}</span>
                  <span className="hidden sm:inline">Ver en {offer.store}</span>
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </a>
              ) : (
                <div className="text-center text-[11px] text-fg-subtle py-2">Sin oferta</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Veredicto final */}
      <div
        className="px-4 sm:px-5 py-4 border-t border-border-subtle flex items-start gap-2.5 sm:gap-3"
        style={{
          background: verdictTone === "tie"
            ? "var(--bg-subtle)"
            : "linear-gradient(135deg, rgba(94,234,212,0.08), rgba(129,140,248,0.08))",
        }}
      >
        <span className="text-lg sm:text-xl shrink-0 leading-none mt-0.5" aria-hidden>
          {verdictTone === "tie" ? "🤝" : "🏆"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle mb-0.5">Veredicto</p>
          <p className="text-[13px] sm:text-[14px] font-extrabold text-fg leading-snug break-words">
            {verdictLead}
          </p>
          <p className="text-[11px] sm:text-[12px] text-fg-muted leading-relaxed mt-0.5 break-words">
            {verdictDetail}
          </p>
          <p className="text-[11px] sm:text-[12px] text-fg-muted leading-relaxed mt-1.5 break-words">
            <span className="font-bold text-fg">A:</span> {a.analysis.oneLiner}
          </p>
          <p className="text-[11px] sm:text-[12px] text-fg-muted leading-relaxed mt-0.5 break-words">
            <span className="font-bold text-fg">B:</span> {b.analysis.oneLiner}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Componentes auxiliares de filas/celdas ──────────────────────────────────

function Row({ label, trophy, children }: { label: string; trophy?: "a" | "b" | null; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[64px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr] border-t border-border-subtle">
      <div className="px-2 py-2.5 sm:px-5 sm:py-3.5 flex items-center bg-bg-subtle/40">
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] text-fg-subtle leading-tight">
          {label}
          {trophy && <span className="ml-1 text-[10px]" aria-hidden>🏆</span>}
        </p>
      </div>
      {children}
    </div>
  );
}

function Cell({ children, winner }: { children: React.ReactNode; winner?: boolean }) {
  return (
    <div
      className={`px-2 py-2.5 sm:px-5 sm:py-3.5 border-l border-border-subtle flex items-center min-w-0 ${
        winner ? "bg-accent-50/50" : ""
      }`}
    >
      <div className={`text-[12px] sm:text-[13px] min-w-0 break-words ${winner ? "text-accent-700 font-bold" : "text-fg"}`}>
        {children}
      </div>
    </div>
  );
}

function CellPrice({
  value, oldValue, winner,
}: {
  value: string; oldValue: number | null; winner?: boolean;
}) {
  return (
    <div
      className={`px-2 py-2.5 sm:px-5 sm:py-3.5 border-l border-border-subtle flex flex-col justify-center min-w-0 ${
        winner ? "bg-accent-50/50" : ""
      }`}
    >
      <span className={`text-[15px] sm:text-lg font-extrabold tabular ${winner ? "text-accent-700" : "text-fg"}`}>
        {value}
      </span>
      {winner && (
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-accent-700 mt-0.5">↓ mejor</span>
      )}
      {oldValue !== null && (
        <span className="text-[10px] sm:text-[11px] text-fg-subtle line-through tabular mt-0.5">
          {formatPrice(oldValue)}
        </span>
      )}
    </div>
  );
}

function ScoreCell({ score, winner }: { score: number; winner: boolean }) {
  const tone = score >= 8.5 ? "great" : score >= 7 ? "good" : score >= 5.5 ? "ok" : "warn";
  const cfg = VERDICT_TONE[tone];
  return (
    <div
      className={`px-2 py-2.5 sm:px-5 sm:py-3.5 border-l border-border-subtle flex items-center min-w-0 ${
        winner ? "bg-accent-50/50" : ""
      }`}
    >
      <div
        className="inline-flex items-baseline gap-1 px-2 sm:px-2.5 h-8 sm:h-9 rounded-lg font-extrabold border tabular"
        style={{ background: cfg.bg, color: cfg.fg, borderColor: cfg.border }}
      >
        <span className="text-[15px] sm:text-base">{score.toFixed(1)}</span>
        <span className="text-[10px] opacity-70">/10</span>
      </div>
    </div>
  );
}

function SpecChips({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-fg-subtle text-[11px]">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((s) => (
        <span key={s} className="inline-flex items-center px-1.5 sm:px-2 h-5 sm:h-6 rounded-md bg-bg-subtle border border-border-subtle text-[10px] sm:text-[11px] font-medium text-fg-muted whitespace-nowrap">
          {s}
        </span>
      ))}
    </div>
  );
}

function ProsConsList({ items, tone }: { items: string[]; tone: "pro" | "con" }) {
  if (items.length === 0) return <span className="text-fg-subtle text-[11px]">—</span>;
  const dot = tone === "pro" ? "text-accent-600" : "text-danger-500";
  return (
    <ul className="space-y-1.5">
      {items.map((p) => (
        <li key={p} className="flex gap-1.5 text-[11px] sm:text-[12px] leading-snug text-fg-muted">
          <span className={`${dot} mt-1.5 leading-none shrink-0`} aria-hidden>●</span>
          <span className="break-words">{p}</span>
        </li>
      ))}
    </ul>
  );
}

function OffersList({ offers }: { offers: DetailedOffer[] }) {
  if (offers.length === 0) return <span className="text-fg-subtle text-[11px]">Sin tiendas</span>;
  return (
    <ul className="space-y-1">
      {offers.slice(0, 4).map((o, i) => (
        <li key={`${o.store}-${i}`} className="flex items-center justify-between gap-2 text-[11px] sm:text-[12px]">
          <span className={`truncate ${o.inStock === false ? "text-fg-subtle line-through" : "text-fg-muted"}`}>
            {o.store}
          </span>
          <span className={`font-bold tabular shrink-0 ${o.inStock === false ? "text-fg-subtle" : "text-fg"}`}>
            {formatPrice(o.priceCurrent)}
          </span>
        </li>
      ))}
      {offers.length > 4 && (
        <li className="text-[10px] text-fg-subtle">+{offers.length - 4} más</li>
      )}
    </ul>
  );
}
