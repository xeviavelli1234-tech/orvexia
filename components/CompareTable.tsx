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

export function CompareTable({ products }: { products: CompareProduct[] }) {
  // Dedupe + agrupar por categoría
  const { byCategory, eligibleCats } = useMemo(() => {
    const seen = new Set<string>();
    const list: CompareProduct[] = [];
    for (const p of products) {
      const k = productKey(p);
      if (seen.has(k)) continue;
      seen.add(k);
      list.push(p);
    }
    const byCategory: Record<string, CompareProduct[]> = {};
    for (const p of list) {
      (byCategory[p.category] ??= []).push(p);
    }
    const eligibleCats = Object.keys(byCategory).filter((c) => byCategory[c].length >= 2);
    eligibleCats.sort((a, b) => byCategory[b].length - byCategory[a].length);
    return { byCategory, eligibleCats };
  }, [products]);

  const [category, setCategory] = useState<string | null>(() => eligibleCats[0] ?? null);
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);
  const [picker, setPicker] = useState<"A" | "B" | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  // Al cambiar de categoría, autoescoger los 2 primeros y cerrar picker
  useEffect(() => {
    if (!category) { setAId(null); setBId(null); return; }
    const list = byCategory[category] ?? [];
    setAId(list[0] ? productKey(list[0]) : null);
    setBId(list[1] ? productKey(list[1]) : null);
    setPicker(null);
    setPickerSearch("");
  }, [category, byCategory]);

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

  // ── Empty state global ──────────────────────────────────────────────────────
  if (eligibleCats.length === 0) {
    return (
      <section className="bg-bg-elevated rounded-2xl border border-white/[0.08] overflow-hidden">
        <Header />
        <div className="py-10 px-6 flex flex-col items-center text-center gap-3">
          <span className="text-4xl" aria-hidden>⚖️</span>
          <div>
            <p className="text-[15px] font-semibold text-fg">
              Necesitas al menos 2 productos de la misma categoría
            </p>
            <p className="text-[13px] text-fg-subtle mt-1 max-w-sm">
              Guarda dos televisores, dos lavadoras… y vuelve aquí para enfrentarlos
              lado a lado.
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

  const currentPool = category ? (byCategory[category] ?? []) : [];

  return (
    <section className="bg-bg-elevated rounded-2xl border border-white/[0.08] overflow-hidden">
      <Header onSwap={aId && bId ? swap : undefined} />

      {/* ── Paso 1: categoría ──────────────────────────────────────────────── */}
      <div className="px-4 sm:px-5 py-3 border-b border-border-subtle bg-bg-subtle/40">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle mb-2">
          1 · Categoría
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {eligibleCats.map((c) => {
            const active = c === category;
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
                <span className={`text-[10px] tabular ${active ? "text-cyan-300" : "text-fg-subtle"}`}>
                  {byCategory[c].length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Paso 2: selección A vs B ───────────────────────────────────────── */}
      <div className="px-4 sm:px-5 py-4 border-b border-border-subtle">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle mb-2">
          2 · Productos
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-stretch">
          <Slot
            label="A"
            product={currentPool.find((p) => productKey(p) === aId) ?? null}
            isPicking={picker === "A"}
            onPick={() => { setPicker(picker === "A" ? null : "A"); setPickerSearch(""); }}
          />
          <div className="flex items-center justify-center">
            <span className="font-mono-ui text-[11px] font-bold uppercase tracking-wider text-fg-subtle px-2 py-1 rounded-full bg-bg-subtle border border-border-subtle">
              vs
            </span>
          </div>
          <Slot
            label="B"
            product={currentPool.find((p) => productKey(p) === bId) ?? null}
            isPicking={picker === "B"}
            onPick={() => { setPicker(picker === "B" ? null : "B"); setPickerSearch(""); }}
          />
        </div>

        {/* Picker inline */}
        {picker && (
          <PickerPanel
            slot={picker}
            pool={currentPool}
            excludeKey={picker === "A" ? bId : aId}
            currentKey={picker === "A" ? aId : bId}
            search={pickerSearch}
            onSearchChange={setPickerSearch}
            onSelect={(key) => {
              if (picker === "A") setAId(key); else setBId(key);
              setPicker(null);
              setPickerSearch("");
            }}
            onClose={() => { setPicker(null); setPickerSearch(""); }}
          />
        )}
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

function Slot({
  label, product, isPicking, onPick,
}: {
  label: "A" | "B";
  product: CompareProduct | null;
  isPicking: boolean;
  onPick: () => void;
}) {
  if (!product) {
    return (
      <button
        type="button"
        onClick={onPick}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-3 sm:p-4 min-h-[120px] sm:min-h-[140px] transition-all ${
          isPicking
            ? "border-cyan-400/60 bg-cyan-400/[0.05]"
            : "border-border hover:border-cyan-400/40 hover:bg-cyan-400/[0.04]"
        }`}
      >
        <span className="w-9 h-9 rounded-full bg-bg-subtle border border-border flex items-center justify-center text-fg-muted text-lg" aria-hidden>+</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">Producto {label}</span>
        <span className="text-[11px] text-fg-muted">Toca para elegir</span>
      </button>
    );
  }
  const offer = bestOffer(product.offers);
  return (
    <div
      className={`relative rounded-2xl border bg-bg-elevated p-2.5 sm:p-3 flex flex-col gap-2 min-h-[120px] sm:min-h-[140px] ${
        isPicking ? "border-cyan-400/60 shadow-[0_0_18px_-6px_rgba(94,234,212,0.5)]" : "border-border"
      }`}
    >
      <span className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-fg-strong text-bg text-[10px] font-extrabold" aria-hidden>
        {label}
      </span>
      <div className="aspect-square w-full max-w-[120px] mx-auto bg-white rounded-xl border border-border overflow-hidden relative">
        {product.image || product.images?.[0] ? (
          <Image
            src={product.images?.[0] ?? product.image ?? ""}
            alt={product.name}
            fill
            className="object-contain p-1.5"
            sizes="(max-width: 640px) 30vw, 120px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-25">📦</div>
        )}
      </div>
      <div className="min-w-0 text-center">
        <p className="text-[10px] font-bold text-cyan-300 mb-0.5 truncate">{product.brand}</p>
        <p className="text-[11px] sm:text-[12px] font-bold text-fg line-clamp-2 leading-tight break-words">
          {product.name}
        </p>
        {offer && (
          <p className="text-[13px] sm:text-[14px] font-extrabold text-fg tabular mt-1">
            {formatPrice(offer.priceCurrent)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onPick}
        className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-fg-muted hover:text-cyan-300 transition-colors px-2 py-1 rounded-full border border-border-subtle hover:border-cyan-400/40 self-center"
      >
        Cambiar
      </button>
    </div>
  );
}

function PickerPanel({
  slot, pool, excludeKey, currentKey, search, onSearchChange, onSelect, onClose,
}: {
  slot: "A" | "B";
  pool: CompareProduct[];
  excludeKey: string | null;
  currentKey: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pool.filter((p) => {
      if (q && !`${p.brand} ${p.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pool, search]);

  return (
    <div className="mt-3 rounded-2xl border border-cyan-400/30 bg-bg-subtle/60 overflow-hidden">
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-border-subtle flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-200">
          Elige el producto {slot}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] font-bold text-fg-subtle hover:text-fg px-2 h-7 rounded-full"
          aria-label="Cerrar selector"
        >
          ✕
        </button>
      </div>
      <div className="px-3 pt-3 sm:px-4">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre o marca…"
          className="w-full bg-bg-elevated border border-border rounded-xl px-3 h-9 text-[13px] text-fg placeholder:text-fg-subtle focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 outline-none transition"
          autoFocus
        />
      </div>
      <ul className="px-2 sm:px-3 py-2 max-h-[280px] overflow-y-auto divide-y divide-border-subtle">
        {filtered.length === 0 ? (
          <li className="py-6 text-center text-[12px] text-fg-subtle">Sin coincidencias.</li>
        ) : filtered.map((p) => {
          const k = productKey(p);
          const disabled = k === excludeKey;
          const selected = k === currentKey;
          const off = bestOffer(p.offers);
          return (
            <li key={k}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(k)}
                className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-colors text-left ${
                  disabled
                    ? "opacity-40 cursor-not-allowed"
                    : selected
                      ? "bg-cyan-400/10 border border-cyan-400/40"
                      : "hover:bg-bg-elevated"
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-white border border-border overflow-hidden relative shrink-0">
                  {p.image || p.images?.[0] ? (
                    <Image src={p.images?.[0] ?? p.image ?? ""} alt={p.name} fill className="object-contain p-1" sizes="48px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-lg opacity-25">📦</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-cyan-300 truncate">{p.brand}</p>
                  <p className="text-[12px] font-semibold text-fg line-clamp-2 leading-snug">{p.name}</p>
                </div>
                {off && (
                  <span className="text-[13px] font-extrabold text-fg tabular shrink-0">
                    {formatPrice(off.priceCurrent)}
                  </span>
                )}
                {disabled && (
                  <span className="text-[10px] font-bold uppercase text-fg-subtle shrink-0">ya elegido</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
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
