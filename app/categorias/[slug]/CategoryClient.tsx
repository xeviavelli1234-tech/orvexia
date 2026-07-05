"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
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
                  checked ? "bg-brand-400/[0.10]" : "hover:bg-bg-subtle"
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
                      ? "bg-brand-500 border-brand-400 shadow-[0_0_10px_-2px_rgba(129,140,248,0.7)]"
                      : "bg-white/[0.04] border-white/20 peer-hover:border-white/40"
                  }`}
                >
                  {checked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm flex-1 transition-colors ${checked ? "text-fg font-semibold" : "text-fg-muted"}`}>{b}</span>
                <span className={`text-[11px] tabular ${checked ? "text-brand-200/80" : "text-fg-faint"}`}>{enriched.filter((p) => p.brand === b).length}</span>
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
                    checked ? "bg-brand-400/[0.10]" : "hover:bg-bg-subtle"
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
                        ? "bg-brand-500 border-brand-400 shadow-[0_0_10px_-2px_rgba(129,140,248,0.7)]"
                        : "bg-white/[0.04] border-white/20 peer-hover:border-white/40"
                    }`}
                  >
                    {checked && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm flex-1 transition-colors ${checked ? "text-fg font-semibold" : "text-fg-muted"}`}>{s}</span>
                  <span className={`text-[11px] tabular ${checked ? "text-brand-200/80" : "text-fg-faint"}`}>
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
              className={`text-xs h-9 rounded-full font-semibold border transition-colors tabular ${
                maxPrice === v
                  ? "bg-brand-500 text-white border-brand-400"
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
                className={`px-3.5 h-9 rounded-full text-xs font-bold border transition-all ${
                  selectedTechs.includes(t)
                    ? "bg-brand-500 text-white border-brand-400"
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
                className={`px-3.5 h-9 rounded-full text-xs font-bold border transition-all ${
                  selectedOS.includes(os)
                    ? "bg-brand-500 text-white border-brand-400"
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
                className={`px-3.5 h-9 rounded-full text-xs font-bold border transition-all tabular ${
                  selectedEnergy.includes(e)
                    ? "bg-brand-500 text-white border-brand-400"
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
              className={`h-9 rounded-full text-xs font-bold border transition-all ${
                minRating === r
                  ? "bg-brand-500 text-white border-brand-400"
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
        <span className={`text-sm font-semibold transition-colors ${onlyDiscount ? "text-brand-100" : "text-fg-muted"}`}>
          Solo con descuento
        </span>
        {/* Track 44x24 · thumb 20x20 · 2px margin all sides (symmetric) */}
        <span
          className={`relative inline-block w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
            onlyDiscount
              ? "bg-brand-500 shadow-[0_0_14px_-2px_rgba(99,102,241,0.6)]"
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
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-300 mb-0.5">Filtros</p>
          <h3 className="text-sm font-bold text-fg">Refinar resultados</h3>
        </div>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-[11px] font-semibold text-white/45 hover:text-white transition-colors"
          >
            Limpiar
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
    <main className="min-h-screen bg-[#050310] text-white/90">
      {/* HERO — halo violeta discreto */}
      <section className="relative overflow-hidden border-b border-white/[0.05]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 left-1/2 hidden h-[520px] w-[1100px] -translate-x-1/2 rounded-full halo-breathe sm:block"
          style={{ background: "radial-gradient(ellipse at center, rgba(129,140,248,0.18), transparent 65%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-14 sm:pb-16">
          {/* Breadcrumb */}
          <nav aria-label="Miga de pan" className="mb-8 flex items-center gap-2 text-[11px] font-semibold text-white/40">
            <Link href="/" className="transition-colors hover:text-brand-200">Inicio</Link>
            <span aria-hidden className="text-white/20">›</span>
            <Link href="/categorias" className="transition-colors hover:text-brand-200">Categorías</Link>
            <span aria-hidden className="text-white/20">›</span>
            <span className="text-brand-300">{meta.label}</span>
          </nav>

          <div className="reveal flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-10">
            <div className="flex items-center gap-4">
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-400/30 text-3xl sm:h-20 sm:w-20 sm:text-4xl"
                style={{
                  background: "rgba(129,140,248,0.10)",
                  boxShadow: "0 0 40px -6px rgba(129,140,248,0.45)",
                }}
              >
                {meta.icon}
              </div>
              <div>
                <h1
                  className="mb-2 font-extrabold tracking-tight text-white"
                  style={{ fontSize: "clamp(1.9rem, 4.4vw, 3rem)", lineHeight: 1.02, letterSpacing: "-0.035em" }}
                >
                  {meta.label}
                </h1>
                <p className="text-sm text-white/50">{meta.desc}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-2.5 text-[10px] font-semibold tabular text-brand-200">
                    {products.length} producto{products.length !== 1 ? "s" : ""}
                  </span>
                  {products.some((p) => p.offers[0]?.discountPercent) && (
                    <span className="inline-flex h-6 items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
                      Ofertas activas
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Inline search */}
            <div className="w-full max-w-md flex-1 lg:ml-auto">
              <div className="flex h-11 items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-4 backdrop-blur-md transition-all hover:border-white/25 focus-within:border-brand-400/50 focus-within:bg-white/[0.06]">
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
          <div
            className="reveal relative overflow-hidden rounded-3xl border border-brand-400/15 p-6 flex flex-col gap-5"
            style={{ background: "linear-gradient(160deg, #100d26 0%, #0a0819 55%, #070614 100%)" }}
          >
            <div aria-hidden className="pointer-events-none absolute -top-24 right-10 h-52 w-[420px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.14), transparent 70%)" }} />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-brand-300">Guía de compra</p>
            <p className="relative -mt-3 text-sm leading-relaxed text-white/55" style={{ textWrap: "pretty" }}>{content.intro}</p>
            <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-3">
              {content.tips.map((t) => (
                <div
                  key={t.title}
                  className="flex gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition-colors hover:border-brand-400/25"
                >
                  <span className="flex-shrink-0 text-xl" style={{ filter: "drop-shadow(0 0 8px rgba(129,140,248,0.5))" }}>{t.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight text-white">{t.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {content.guideSlug && (
              <Link
                href={`/guias/${content.guideSlug}`}
                className="relative inline-flex h-10 items-center gap-2 self-start rounded-full border border-brand-400/25 bg-brand-400/10 px-5 text-[12px] font-bold text-brand-200 transition-all hover:border-brand-400/50 hover:bg-brand-400/[0.16] active:scale-[0.97]"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                Ver guía completa →
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
          <div className="lg:static sticky top-16 z-30 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 py-3 lg:py-0 mb-4 bg-[#050310]/85 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-b border-white/[0.06] lg:border-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="hidden text-[12px] text-white/55 sm:block">
                <span className="font-bold tabular text-white">{filtered.length}</span> resultado{filtered.length !== 1 ? "s" : ""}
                {search && <> para &ldquo;<span className="font-semibold text-brand-200">{search}</span>&rdquo;</>}
              </p>
              <p className="sm:hidden text-xs text-white/70 tabular">
                <span className="font-bold text-white">{filtered.length}</span> producto{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2 sm:ml-auto">
                <button
                  onClick={() => setShowFilters(true)}
                  className={`lg:hidden flex items-center gap-1.5 text-sm font-semibold px-4 h-10 rounded-full transition-all ${
                    activeCount > 0
                      ? "bg-brand-500 text-white border border-brand-400 shadow-[0_0_18px_-6px_rgba(99,102,241,0.7)]"
                      : "bg-white/[0.03] border border-white/12 hover:border-white/30 text-white/85"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
                  </svg>
                  Filtros
                  {activeCount > 0 && (
                    <span className="bg-white/25 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center tabular">
                      {activeCount}
                    </span>
                  )}
                </button>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="text-sm font-medium border border-white/[0.10] bg-white/[0.03] rounded-full px-4 h-10 lg:h-9 outline-none hover:border-white/25 focus-visible:border-brand-400/50 focus-visible:ring-2 focus-visible:ring-brand-400/15 transition-all cursor-pointer text-fg"
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
                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-3 h-8 rounded-full bg-brand-400/10 text-brand-200 border border-brand-400/30 hover:bg-brand-400/[0.16] hover:border-brand-400/50 transition-colors"
                >
                  {c.label}
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M6 6L18 18M6 18L18 6" />
                  </svg>
                </button>
              ))}
              <button
                onClick={clearAll}
                className="flex-shrink-0 text-[11px] font-semibold text-white/45 hover:text-white ml-1 transition-colors"
              >
                Limpiar todo
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
                className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-[#0a0818] border-t border-white/[0.10] rounded-t-3xl shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.7)] animate-slide-up"
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
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-300 mb-0.5">Refinar resultados</p>
                    <h3 className="text-base font-bold text-fg">Filtros</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeCount > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-xs font-semibold text-white/65 hover:text-white px-3 h-9 rounded-full hover:bg-white/[0.06] transition-colors"
                      >
                        Limpiar
                      </button>
                    )}
                    <button
                      onClick={() => setShowFilters(false)}
                      aria-label="Cerrar"
                      className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.10] text-white/70 hover:text-white flex items-center justify-center transition-colors"
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
                  className="px-5 py-4 border-t border-white/[0.08] bg-[#0a0818]/95 backdrop-blur-md"
                  style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 1rem)" }}
                >
                  <button
                    onClick={() => setShowFilters(false)}
                    className="shine-on-hover w-full h-12 rounded-full bg-brand-500 hover:bg-brand-400 active:scale-[0.97] text-white font-bold text-sm transition-all"
                    style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
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
            <div className="reveal grid grid-cols-3 sm:grid-cols-3 xl:grid-cols-3 gap-2 sm:gap-5">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i === 0} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.07] bg-white/[0.02] py-20 text-center">
              <span className="mb-4 text-5xl opacity-50" style={{ filter: "drop-shadow(0 0 16px rgba(129,140,248,0.5))" }}>{meta.icon}</span>
              <h3 className="text-base font-bold text-fg mb-1.5">Sin resultados</h3>
              <p className="text-sm text-fg-muted mb-6 max-w-sm">
                {search ? `No encontramos "${search}" con estos filtros.` : "Ningún producto coincide con los filtros seleccionados."}
              </p>
              <button
                onClick={clearAll}
                className="shine-on-hover inline-flex h-11 items-center justify-center rounded-full bg-brand-500 px-6 text-sm font-bold text-white transition-all hover:bg-brand-400 active:scale-[0.97]"
                style={{ boxShadow: "0 8px 36px -6px rgba(99,102,241,0.85)" }}
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
