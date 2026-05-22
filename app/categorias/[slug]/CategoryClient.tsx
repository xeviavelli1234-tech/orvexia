"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { FuturisticFX } from "@/components/FuturisticFX";
import type { ProductSpecs } from "@/lib/specs/extractor";

interface Offer {
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
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
  specs: Record<string, unknown>;
  offers: Offer[];
}

interface Meta {
  label: string;
  icon: string;
  color: string;
  bg: string;
  gradient: string;
  desc: string;
}

interface Content {
  intro: string;
  tips: { icon: string; title: string; desc: string }[];
  guideSlug?: string;
}

type SortKey = "relevancia" | "precio_asc" | "precio_desc" | "descuento" | "valoracion";

// Las specs vienen estructuradas desde Product.specs (lib/specs/extractor.ts).
// Lectura tolerante porque el campo es JSON y puede tener formas variadas.
function readSpecs(p: Product): ProductSpecs {
  return (p.specs ?? {}) as ProductSpecs;
}

// Clase energética: orden A+++ → G para la barra de filtros.
const ENERGY_ORDER = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"] as const;

export default function CategoryClient({ products, meta, content }: { products: Product[]; meta: Meta; content: Content | null }) {
  const [search, setSearch] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [selectedOS, setSelectedOS] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedEnergy, setSelectedEnergy] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(9999);
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevancia");
  const [showFilters, setShowFilters] = useState(false);

  const enriched = useMemo(
    () => products.map((p) => ({ ...p, specs: readSpecs(p) })),
    [products]
  );

  const brands = useMemo(() => [...new Set(enriched.map((p) => p.brand))].sort(), [enriched]);
  const techs = useMemo(
    () => [...new Set(enriched.map((p) => p.specs.tech).filter((v): v is NonNullable<typeof v> => Boolean(v)))],
    [enriched]
  );
  const osList = useMemo(
    () => [...new Set(enriched.map((p) => p.specs.os).filter((v): v is NonNullable<typeof v> => Boolean(v)))],
    [enriched]
  );
  const energyClasses = useMemo(() => {
    const present = new Set(
      enriched.map((p) => p.specs.energyClass).filter((v): v is string => Boolean(v))
    );
    return ENERGY_ORDER.filter((e) => present.has(e));
  }, [enriched]);
  const stores = useMemo(() => [...new Set(enriched.flatMap((p) => p.offers.map((o) => o.store)))].sort(), [enriched]);

  const prices = enriched.flatMap((p) => p.offers.map((o) => o.priceCurrent)).filter(Boolean);
  const globalMin = prices.length ? Math.floor(Math.min(...prices) / 10) * 10 : 0;
  const globalMax = prices.length ? Math.ceil(Math.max(...prices) / 10) * 10 : 9999;

  const filtered = useMemo(() => {
    const list = enriched.filter((p) => {
      const oferta = p.offers[0];
      const price = oferta?.priceCurrent ?? 0;
      if (search && !`${p.name} ${p.brand}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedBrands.length && !selectedBrands.includes(p.brand)) return false;
      if (selectedTechs.length && !selectedTechs.includes(p.specs.tech ?? "")) return false;
      if (selectedOS.length && !selectedOS.includes(p.specs.os ?? "")) return false;
      if (selectedEnergy.length && !selectedEnergy.includes(p.specs.energyClass ?? "")) return false;
      if (selectedStores.length && !p.offers.some((o) => selectedStores.includes(o.store))) return false;
      if (maxPrice < globalMax && price > maxPrice) return false;
      if (minRating > 0 && (p.rating ?? 0) < minRating) return false;
      if (onlyDiscount && !oferta?.discountPercent) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      const oa = a.offers[0], ob = b.offers[0];
      if (sort === "precio_asc") return (oa?.priceCurrent ?? 9999) - (ob?.priceCurrent ?? 9999);
      if (sort === "precio_desc") return (ob?.priceCurrent ?? 0) - (oa?.priceCurrent ?? 0);
      if (sort === "descuento") return (ob?.discountPercent ?? 0) - (oa?.discountPercent ?? 0);
      if (sort === "valoracion") return (b.rating ?? 0) - (a.rating ?? 0);
      return 0;
    });
  }, [enriched, search, selectedBrands, selectedTechs, selectedOS, selectedEnergy, selectedStores, maxPrice, minRating, onlyDiscount, sort, globalMax]);

  function toggle<T>(arr: T[], val: T, set: (v: T[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function clearAll() {
    setSearch(""); setSelectedBrands([]); setSelectedTechs([]);
    setSelectedOS([]); setSelectedEnergy([]); setSelectedStores([]);
    setMaxPrice(9999); setMinRating(0); setOnlyDiscount(false);
  }

  const activeCount = selectedBrands.length + selectedTechs.length + selectedOS.length +
    selectedEnergy.length + selectedStores.length +
    (maxPrice < globalMax ? 1 : 0) + (minRating > 0 ? 1 : 0) + (onlyDiscount ? 1 : 0);

  // Active filter chips for top of results
  const activeChips: { label: string; clear: () => void }[] = [
    ...selectedBrands.map((b) => ({ label: b, clear: () => setSelectedBrands(selectedBrands.filter((x) => x !== b)) })),
    ...selectedTechs.map((t) => ({ label: t, clear: () => setSelectedTechs(selectedTechs.filter((x) => x !== t)) })),
    ...selectedOS.map((o) => ({ label: o, clear: () => setSelectedOS(selectedOS.filter((x) => x !== o)) })),
    ...selectedEnergy.map((e) => ({ label: `Clase ${e}`, clear: () => setSelectedEnergy(selectedEnergy.filter((x) => x !== e)) })),
    ...selectedStores.map((s) => ({ label: s, clear: () => setSelectedStores(selectedStores.filter((x) => x !== s)) })),
    ...(maxPrice < globalMax ? [{ label: `≤ ${maxPrice} €`, clear: () => setMaxPrice(9999) }] : []),
    ...(minRating > 0 ? [{ label: `★${minRating}+`, clear: () => setMinRating(0) }] : []),
    ...(onlyDiscount ? [{ label: "Con descuento", clear: () => setOnlyDiscount(false) }] : []),
  ];

  // Body content of the filters — shared between desktop sidebar and mobile bottom sheet.
  // Touch targets are kept generous (h-9/h-10) so it feels comfortable on phones.
  const filtersBody = (
    <>
      {/* Marca */}
      <section>
        <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Marca</p>
        <div className="space-y-0.5">
          {brands.map((b) => {
            const checked = selectedBrands.includes(b);
            return (
              <label
                key={b}
                className={`flex items-center gap-3 cursor-pointer py-2 px-2.5 -mx-2.5 rounded-lg transition-colors ${
                  checked ? "bg-cyan-400/[0.10]" : "hover:bg-bg-subtle"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(selectedBrands, b, setSelectedBrands)}
                  className="sr-only peer"
                />
                <span
                  aria-hidden
                  className={`flex items-center justify-center w-5 h-5 rounded-md border transition-all flex-shrink-0 ${
                    checked
                      ? "bg-cyan-500 border-cyan-400 shadow-[0_0_10px_-2px_rgba(94,234,212,0.7)]"
                      : "bg-white/[0.04] border-white/20 peer-hover:border-white/40"
                  }`}
                >
                  {checked && (
                    <svg className="w-3 h-3 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm flex-1 transition-colors ${checked ? "text-fg font-semibold" : "text-fg-muted"}`}>{b}</span>
                <span className={`text-[11px] tabular ${checked ? "text-cyan-200/80" : "text-fg-faint"}`}>{enriched.filter((p) => p.brand === b).length}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Tienda */}
      {stores.length > 1 && (
        <section>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Tienda</p>
          <div className="space-y-0.5">
            {stores.map((s) => {
              const checked = selectedStores.includes(s);
              return (
                <label
                  key={s}
                  className={`flex items-center gap-3 cursor-pointer py-2 px-2.5 -mx-2.5 rounded-lg transition-colors ${
                    checked ? "bg-cyan-400/[0.10]" : "hover:bg-bg-subtle"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(selectedStores, s, setSelectedStores)}
                    className="sr-only peer"
                  />
                  <span
                    aria-hidden
                    className={`flex items-center justify-center w-5 h-5 rounded-md border transition-all flex-shrink-0 ${
                      checked
                        ? "bg-cyan-500 border-cyan-400 shadow-[0_0_10px_-2px_rgba(94,234,212,0.7)]"
                        : "bg-white/[0.04] border-white/20 peer-hover:border-white/40"
                    }`}
                  >
                    {checked && (
                      <svg className="w-3 h-3 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm flex-1 transition-colors ${checked ? "text-fg font-semibold" : "text-fg-muted"}`}>{s}</span>
                  <span className={`text-[11px] tabular ${checked ? "text-cyan-200/80" : "text-fg-faint"}`}>
                    {enriched.filter((p) => p.offers.some((o) => o.store === s)).length}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* Precio */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em]">Precio máximo</p>
          <span className="text-xs font-bold tabular" style={{ color: maxPrice < globalMax ? "var(--brand-400)" : "var(--fg-faint)" }}>
            {maxPrice < globalMax ? `≤ ${maxPrice} €` : `hasta ${globalMax} €`}
          </span>
        </div>
        <input
          type="range"
          min={globalMin}
          max={globalMax}
          step={10}
          value={maxPrice === 9999 ? globalMax : maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="filter-range w-full mb-4"
          aria-label="Precio máximo"
        />
        <div className="grid grid-cols-3 gap-1.5">
          {[200, 300, 400, 500, 700, 1000].filter((v) => v <= globalMax + 50).map((v) => (
            <button
              key={v}
              onClick={() => setMaxPrice(maxPrice === v ? 9999 : v)}
              className={`text-xs h-9 rounded-lg font-semibold border transition-colors tabular ${
                maxPrice === v
                  ? "bg-cyan-400/15 text-cyan-200 border-cyan-400/50"
                  : "border-white/10 text-fg-muted hover:text-fg hover:border-white/25"
              }`}
            >
              {v}€
            </button>
          ))}
        </div>
      </section>

      {/* Tecnología */}
      {techs.length > 0 && (
        <section>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Tecnología</p>
          <div className="flex flex-wrap gap-2">
            {techs.map((t) => (
              <button
                key={t}
                onClick={() => toggle(selectedTechs, t, setSelectedTechs)}
                className={`px-3.5 h-9 rounded-lg text-xs font-bold border transition-all ${
                  selectedTechs.includes(t)
                    ? "bg-cyan-400/15 text-cyan-200 border-cyan-400/50"
                    : "border-white/10 text-fg-muted hover:text-fg hover:border-white/25"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* OS */}
      {osList.length > 0 && (
        <section>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Sistema operativo</p>
          <div className="flex flex-wrap gap-2">
            {osList.map((os) => (
              <button
                key={os}
                onClick={() => toggle(selectedOS, os, setSelectedOS)}
                className={`px-3.5 h-9 rounded-lg text-xs font-bold border transition-all ${
                  selectedOS.includes(os)
                    ? "bg-cyan-400/15 text-cyan-200 border-cyan-400/50"
                    : "border-white/10 text-fg-muted hover:text-fg hover:border-white/25"
                }`}
              >
                {os}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Clase energética */}
      {energyClasses.length > 0 && (
        <section>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Clase energética</p>
          <div className="flex flex-wrap gap-2">
            {energyClasses.map((e) => (
              <button
                key={e}
                onClick={() => toggle(selectedEnergy, e, setSelectedEnergy)}
                className={`px-3.5 h-9 rounded-lg text-xs font-bold border transition-all tabular ${
                  selectedEnergy.includes(e)
                    ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/50"
                    : "border-white/10 text-fg-muted hover:text-fg hover:border-white/25"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Valoración */}
      <section>
        <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Valoración mínima</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[3, 3.5, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(minRating === r ? 0 : r)}
              className={`h-9 rounded-lg text-xs font-bold border transition-all ${
                minRating === r
                  ? "bg-amber-400/15 text-amber-200 border-amber-400/50"
                  : "border-white/10 text-fg-muted hover:text-fg hover:border-white/25"
              }`}
            >
              ★{r}+
            </button>
          ))}
        </div>
      </section>

      {/* Solo con descuento */}
      <button
        type="button"
        role="switch"
        aria-checked={onlyDiscount}
        onClick={() => setOnlyDiscount((v) => !v)}
        className="w-full flex items-center justify-between gap-3 pt-3 border-t border-white/10 select-none"
      >
        <span className={`text-sm font-semibold transition-colors ${onlyDiscount ? "text-cyan-100" : "text-fg-muted"}`}>
          Solo con descuento
        </span>
        {/* Track 44x24 · thumb 20x20 · 2px margin all sides (symmetric) */}
        <span
          className={`relative inline-block w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
            onlyDiscount
              ? "bg-cyan-500/70 shadow-[0_0_14px_-2px_rgba(34,211,238,0.55)]"
              : "bg-white/[0.12]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 will-change-transform ${
              onlyDiscount ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </button>
    </>
  );

  const sidebarJSX = (
    <div className="bg-bg-elevated rounded-2xl border border-white/[0.08] p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80 mb-0.5">▸ /filters</p>
          <h3 className="text-sm font-bold text-fg">Refinar resultados</h3>
        </div>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="font-mono-ui text-[10px] uppercase tracking-wider text-white/45 hover:text-white transition-colors"
          >
            limpiar
          </button>
        )}
      </div>
      {filtersBody}
    </div>
  );

  // Lock body scroll while the mobile bottom-sheet is open.
  useEffect(() => {
    if (!showFilters) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showFilters]);

  // Close sheet with Esc.
  useEffect(() => {
    if (!showFilters) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setShowFilters(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [showFilters]);

  return (
    <main className="min-h-screen">
      {/* HERO con accent de la categoría — decoración pesada solo en sm+ */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="hidden sm:block absolute inset-0 bg-grid-cyber opacity-50 pointer-events-none" />
        <div className="hidden sm:block absolute inset-0 pointer-events-none">
          <FuturisticFX particleCount={5} streamCount={2} beam seed={meta.label.length} />
        </div>
        <div
          className="hidden sm:block absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full halo-breathe pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${meta.color}33, transparent 65%)` }}
        />
        <div
          className="hidden sm:block absolute -top-20 -right-32 w-[500px] h-[500px] rounded-full opacity-50 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${meta.color}33, transparent 70%)` }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-14 sm:pb-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-white/40 mb-8">
            <Link href="/" className="hover:text-cyan-300 transition-colors">~/</Link>
            <span className="text-white/25">›</span>
            <Link href="/categorias" className="hover:text-cyan-300 transition-colors">categorias</Link>
            <span className="text-white/25">›</span>
            <span style={{ color: meta.color }}>{meta.label.toLowerCase()}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-10">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-xl relative"
                style={{
                  background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${meta.color} 45%, transparent)`,
                  boxShadow: `0 0 40px -6px ${meta.color}66`,
                }}
              >
                {meta.icon}
              </div>
              <div>
                <p className="font-mono-ui text-[10px] uppercase tracking-wider mb-1.5"
                   style={{ color: meta.color }}>
                  ▸ /catalog/{meta.label.toLowerCase().replace(/\s+/g, "_")}
                </p>
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1] mb-2">
                  {meta.label}
                </h1>
                <p className="text-white/55 text-sm">{meta.desc}</p>
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <span className="font-mono-ui text-[10px] font-bold uppercase tracking-wider text-white/80 border border-white/[0.12] bg-white/[0.04] px-2.5 h-6 inline-flex items-center rounded-md tabular">
                    {products.length} item{products.length !== 1 ? "s" : ""}
                  </span>
                  {products.some((p) => p.offers[0]?.discountPercent) && (
                    <span className="font-mono-ui text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 h-6 inline-flex items-center rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 pulse-dot" />
                      live deals
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Inline search */}
            <div className="flex-1 max-w-md lg:ml-auto w-full">
              <div className="flex items-center gap-2 bg-white/[0.04] backdrop-blur-md border border-white/[0.10] hover:border-white/25 focus-within:border-cyan-400/50 focus-within:bg-white/[0.06] rounded-xl px-4 h-11 transition-all">
                <svg className="w-4 h-4 text-white/45 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={`Buscar en ${meta.label.toLowerCase()}…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-white/40 text-sm outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} aria-label="Limpiar búsqueda" className="text-white/50 hover:text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENIDO EDITORIAL */}
      {content && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
          <div className="bg-bg-elevated rounded-2xl border border-white/[0.08] p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80 mb-1">
              ▸ /briefing
            </div>
            <p className="text-fg-muted text-sm leading-relaxed -mt-3">{content.intro}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {content.tips.map((t) => (
                <div
                  key={t.title}
                  className="flex gap-3 p-3.5 rounded-xl border"
                  style={{
                    background: `color-mix(in srgb, ${meta.color} 6%, transparent)`,
                    borderColor: `color-mix(in srgb, ${meta.color} 25%, transparent)`,
                  }}
                >
                  <span className="text-xl flex-shrink-0" style={{ filter: `drop-shadow(0 0 8px ${meta.color}80)` }}>{t.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-tight">{t.title}</p>
                    <p className="text-xs text-white/55 mt-1 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {content.guideSlug && (
              <Link
                href={`/guias/${content.guideSlug}`}
                className="self-start inline-flex items-center gap-2 font-mono-ui text-[11px] uppercase font-bold px-4 h-9 rounded-full transition-all hover:scale-[1.02]"
                style={{
                  color: meta.color,
                  background: `${meta.color}12`,
                  border: `1px solid ${meta.color}40`,
                  boxShadow: `0 0 14px -4px ${meta.color}60`,
                }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                ver guía completa →
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex gap-8">

        {/* SIDEBAR DESKTOP */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="filters-scroll sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain pr-1 touch-pan-y">
            {sidebarJSX}
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 min-w-0">

          {/* Control bar — sticky on mobile (below the 64px page header) so Filtros/Ordenar are always reachable */}
          <div className="lg:static sticky top-16 z-30 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 py-3 lg:py-0 mb-4 bg-bg/85 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-b border-white/[0.06] lg:border-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="font-mono-ui text-[11px] uppercase tracking-wider text-white/55 hidden sm:block">
                <span className="text-emerald-300 tabular">{filtered.length.toString().padStart(2, "0")}</span> result{filtered.length !== 1 ? "s" : ""}
                {search && <> · query=&ldquo;<span className="text-cyan-300">{search}</span>&rdquo;</>}
              </p>
              <p className="sm:hidden text-xs text-white/70 tabular">
                <span className="font-bold text-emerald-300">{filtered.length}</span> producto{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2 sm:ml-auto">
                <button
                  onClick={() => setShowFilters(true)}
                  className={`lg:hidden flex items-center gap-1.5 text-sm font-semibold px-3.5 h-10 rounded-lg transition-all ${
                    activeCount > 0
                      ? "bg-cyan-400/15 border border-cyan-400/45 text-cyan-100 shadow-[0_0_18px_-6px_rgba(94,234,212,0.6)]"
                      : "bg-bg-elevated border border-white/[0.10] hover:border-white/25 text-white/85"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
                  </svg>
                  Filtros
                  {activeCount > 0 && (
                    <span className="bg-cyan-400/30 text-cyan-50 text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center tabular">
                      {activeCount}
                    </span>
                  )}
                </button>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="text-sm font-medium border border-white/[0.10] bg-bg-elevated rounded-lg px-3 h-10 lg:h-9 outline-none hover:border-white/25 focus-visible:border-cyan-400/50 focus-visible:ring-2 focus-visible:ring-cyan-400/15 transition-all cursor-pointer text-fg"
                >
                  <option value="relevancia">Relevancia</option>
                  <option value="precio_asc">Precio: menor a mayor</option>
                  <option value="precio_desc">Precio: mayor a menor</option>
                  <option value="descuento">Mayor descuento</option>
                  <option value="valoracion">Mejor valorado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-nowrap lg:flex-wrap items-center gap-1.5 mb-5 -mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto lg:overflow-visible scrollbar-hide">
              {activeChips.map((c) => (
                <button
                  key={c.label}
                  onClick={c.clear}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-3 h-8 rounded-full bg-cyan-400/10 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-400/15 hover:border-cyan-400/50 transition-colors"
                >
                  {c.label}
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M6 6L18 18M6 18L18 6" />
                  </svg>
                </button>
              ))}
              <button
                onClick={clearAll}
                className="flex-shrink-0 font-mono-ui text-[10px] uppercase tracking-wider text-white/45 hover:text-white ml-1 transition-colors"
              >
                limpiar todo
              </button>
            </div>
          )}

          {/* Bottom sheet de filtros (móvil/tablet) */}
          {showFilters && (
            <div className="lg:hidden">
              {/* Backdrop */}
              <div
                onClick={() => setShowFilters(false)}
                className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm animate-fade-in"
                aria-hidden="true"
              />
              {/* Sheet */}
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Filtros"
                className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-bg-elevated border-t border-white/[0.10] rounded-t-3xl shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.7)] animate-slide-up"
                style={{ maxHeight: "90vh" }}
              >
                {/* Drag handle */}
                <button
                  onClick={() => setShowFilters(false)}
                  aria-label="Cerrar filtros"
                  className="flex justify-center pt-3 pb-1 group"
                >
                  <span className="w-11 h-1.5 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors" />
                </button>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-white/[0.06]">
                  <div>
                    <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300/80 mb-0.5">▸ /filters</p>
                    <h3 className="text-base font-bold text-fg">Filtros</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeCount > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-xs font-semibold text-white/65 hover:text-white px-3 h-9 rounded-lg hover:bg-bg-subtle transition-colors"
                      >
                        Limpiar
                      </button>
                    )}
                    <button
                      onClick={() => setShowFilters(false)}
                      aria-label="Cerrar"
                      className="w-9 h-9 rounded-full bg-bg-subtle hover:bg-bg-muted text-white/70 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Body */}
                <div className="filters-scroll flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-7 touch-pan-y">
                  {filtersBody}
                </div>
                {/* Sticky apply CTA */}
                <div
                  className="px-5 py-4 border-t border-white/[0.08] bg-bg-elevated/95 backdrop-blur-md"
                  style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 1rem)" }}
                >
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-[0_0_24px_-6px_rgba(99,102,241,0.6)]"
                  >
                    {filtered.length === 0
                      ? "Sin resultados — ajusta filtros"
                      : `Ver ${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 xl:grid-cols-3 gap-2 sm:gap-5">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i === 0} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-bg-elevated rounded-2xl border border-white/[0.08]">
              <span className="text-5xl mb-4 opacity-50" style={{ filter: `drop-shadow(0 0 16px ${meta.color}80)` }}>{meta.icon}</span>
              <p className="font-mono-ui text-[10px] uppercase tracking-wider text-white/40 mb-2">stand_by · 0 results</p>
              <h3 className="text-base font-bold text-fg mb-1.5">Sin resultados</h3>
              <p className="text-sm text-fg-muted mb-6 max-w-sm">
                {search ? `No encontramos "${search}" con estos filtros.` : "Ningún producto coincide con los filtros seleccionados."}
              </p>
              <button
                onClick={clearAll}
                className="text-sm font-bold text-white px-5 h-10 rounded-lg bg-cyan-400/15 border border-cyan-400/40 hover:bg-cyan-400/25 hover:border-cyan-400/60 transition-colors shadow-[0_0_18px_-6px_rgba(94,234,212,0.5)]"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
