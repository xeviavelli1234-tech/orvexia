"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";

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

function extractTech(text: string): string | null {
  if (/OLED/i.test(text)) return "OLED";
  if (/QLED/i.test(text)) return "QLED";
  if (/AMOLED/i.test(text)) return "AMOLED";
  if (/LED/i.test(text)) return "LED";
  return null;
}
function extractOS(text: string): string | null {
  if (/Google\s*TV/i.test(text)) return "Google TV";
  if (/Fire\s*TV|Fire\s*OS/i.test(text)) return "Fire TV";
  if (/Android\s*TV/i.test(text)) return "Android TV";
  if (/Tizen/i.test(text)) return "Tizen";
  if (/webOS/i.test(text)) return "webOS";
  return null;
}

function getSpecs(p: Product) {
  const full = `${p.name} ${p.description ?? ""}`;
  return { tech: extractTech(full), os: extractOS(full) };
}

export default function CategoryClient({ products, meta, content }: { products: Product[]; meta: Meta; content: Content | null }) {
  const [search, setSearch] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [selectedOS, setSelectedOS] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(9999);
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevancia");
  const [showFilters, setShowFilters] = useState(false);

  const enriched = useMemo(() => products.map((p) => ({ ...p, specs: getSpecs(p) })), [products]);

  const brands = useMemo(() => [...new Set(enriched.map((p) => p.brand))].sort(), [enriched]);
  const techs = useMemo(() => [...new Set(enriched.map((p) => p.specs.tech).filter(Boolean))] as string[], [enriched]);
  const osList = useMemo(() => [...new Set(enriched.map((p) => p.specs.os).filter(Boolean))] as string[], [enriched]);
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
  }, [enriched, search, selectedBrands, selectedTechs, selectedOS, selectedStores, maxPrice, minRating, onlyDiscount, sort, globalMax]);

  function toggle<T>(arr: T[], val: T, set: (v: T[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function clearAll() {
    setSearch(""); setSelectedBrands([]); setSelectedTechs([]);
    setSelectedOS([]); setSelectedStores([]); setMaxPrice(9999); setMinRating(0); setOnlyDiscount(false);
  }

  const activeCount = selectedBrands.length + selectedTechs.length + selectedOS.length + selectedStores.length +
    (maxPrice < globalMax ? 1 : 0) + (minRating > 0 ? 1 : 0) + (onlyDiscount ? 1 : 0);

  // Active filter chips for top of results
  const activeChips: { label: string; clear: () => void }[] = [
    ...selectedBrands.map((b) => ({ label: b, clear: () => setSelectedBrands(selectedBrands.filter((x) => x !== b)) })),
    ...selectedTechs.map((t) => ({ label: t, clear: () => setSelectedTechs(selectedTechs.filter((x) => x !== t)) })),
    ...selectedOS.map((o) => ({ label: o, clear: () => setSelectedOS(selectedOS.filter((x) => x !== o)) })),
    ...selectedStores.map((s) => ({ label: s, clear: () => setSelectedStores(selectedStores.filter((x) => x !== s)) })),
    ...(maxPrice < globalMax ? [{ label: `≤ ${maxPrice} €`, clear: () => setMaxPrice(9999) }] : []),
    ...(minRating > 0 ? [{ label: `★${minRating}+`, clear: () => setMinRating(0) }] : []),
    ...(onlyDiscount ? [{ label: "Con descuento", clear: () => setOnlyDiscount(false) }] : []),
  ];

  const sidebarJSX = (
    <div className="bg-bg-elevated rounded-2xl border border-border p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-fg">Filtros</h3>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-fg-subtle hover:text-fg transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Marca */}
      <div>
        <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Marca</p>
        <div className="space-y-1.5">
          {brands.map((b) => (
            <label key={b} className="flex items-center gap-2.5 cursor-pointer group py-1 -mx-2 px-2 rounded-md hover:bg-bg-subtle transition-colors">
              <input
                type="checkbox"
                checked={selectedBrands.includes(b)}
                onChange={() => toggle(selectedBrands, b, setSelectedBrands)}
                className="w-4 h-4 rounded border-border accent-brand-600"
              />
              <span className="text-sm text-fg-muted group-hover:text-fg transition-colors flex-1">{b}</span>
              <span className="text-[11px] text-fg-faint tabular">{enriched.filter((p) => p.brand === b).length}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tienda */}
      {stores.length > 1 && (
        <div>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Tienda</p>
          <div className="space-y-1.5">
            {stores.map((s) => (
              <label key={s} className="flex items-center gap-2.5 cursor-pointer group py-1 -mx-2 px-2 rounded-md hover:bg-bg-subtle transition-colors">
                <input
                  type="checkbox"
                  checked={selectedStores.includes(s)}
                  onChange={() => toggle(selectedStores, s, setSelectedStores)}
                  className="w-4 h-4 rounded border-border accent-brand-600"
                />
                <span className="text-sm text-fg-muted group-hover:text-fg transition-colors flex-1">{s}</span>
                <span className="text-[11px] text-fg-faint tabular">
                  {enriched.filter((p) => p.offers.some((o) => o.store === s)).length}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Precio */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em]">Precio máximo</p>
          {maxPrice < globalMax && (
            <span className="text-xs font-bold text-brand-600 tabular">≤ {maxPrice} €</span>
          )}
        </div>
        <input
          type="range"
          min={globalMin}
          max={globalMax}
          step={10}
          value={maxPrice === 9999 ? globalMax : maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-brand-600 mb-3"
        />
        <div className="grid grid-cols-3 gap-1.5">
          {[200, 300, 400, 500, 700, 1000].filter((v) => v <= globalMax + 50).map((v) => (
            <button
              key={v}
              onClick={() => setMaxPrice(maxPrice === v ? 9999 : v)}
              className={`text-xs h-8 rounded-md font-semibold border transition-colors tabular ${
                maxPrice === v
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-border text-fg-muted hover:text-fg hover:border-border-strong"
              }`}
            >
              {v}€
            </button>
          ))}
        </div>
      </div>

      {/* Tecnología */}
      {techs.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Tecnología</p>
          <div className="flex flex-wrap gap-1.5">
            {techs.map((t) => (
              <button
                key={t}
                onClick={() => toggle(selectedTechs, t, setSelectedTechs)}
                className={`px-3 h-8 rounded-md text-xs font-bold border transition-all ${
                  selectedTechs.includes(t)
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-border text-fg-muted hover:text-fg hover:border-border-strong"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* OS */}
      {osList.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Sistema operativo</p>
          <div className="space-y-1.5">
            {osList.map((os) => (
              <label key={os} className="flex items-center gap-2.5 cursor-pointer group py-1 -mx-2 px-2 rounded-md hover:bg-bg-subtle transition-colors">
                <input
                  type="checkbox"
                  checked={selectedOS.includes(os)}
                  onChange={() => toggle(selectedOS, os, setSelectedOS)}
                  className="w-4 h-4 rounded border-border accent-brand-600"
                />
                <span className="text-sm text-fg-muted group-hover:text-fg transition-colors">{os}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Valoración */}
      <div>
        <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-[0.18em] mb-3">Valoración mínima</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[3, 3.5, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(minRating === r ? 0 : r)}
              className={`h-8 rounded-md text-xs font-bold border transition-all ${
                minRating === r
                  ? "bg-warn-500 text-white border-warn-500"
                  : "border-border text-fg-muted hover:text-fg hover:border-border-strong"
              }`}
            >
              ★{r}+
            </button>
          ))}
        </div>
      </div>

      {/* Solo con descuento */}
      <button
        type="button"
        onClick={() => setOnlyDiscount((v) => !v)}
        className="w-full flex items-center justify-between pt-2 border-t border-border-subtle"
      >
        <span className="text-sm font-semibold text-fg-muted select-none">Solo con descuento</span>
        <span
          className={`relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
            onlyDiscount ? "bg-brand-600" : "bg-bg-muted"
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              onlyDiscount ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </span>
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-bg">
      {/* HERO con accent de la categoría */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${meta.color} 88%, black) 0%, color-mix(in srgb, ${meta.color} 70%, black) 50%, color-mix(in srgb, ${meta.color} 60%, black) 100%)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full opacity-30"
            style={{ background: `radial-gradient(circle, ${meta.color} 0%, transparent 70%)` }}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-12 sm:pb-14">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-white/50 mb-7">
            <Link href="/" className="hover:text-white/90 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/categorias" className="hover:text-white/90 transition-colors">Categorías</Link>
            <span>/</span>
            <span className="text-white/85 font-semibold">{meta.label}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-10">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-3xl sm:text-4xl shadow-xl"
              >
                {meta.icon}
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">{meta.label}</h1>
                <p className="text-white/60 text-sm mt-1.5">{meta.desc}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/85 bg-white/[0.08] border border-white/10 px-2.5 h-6 inline-flex items-center rounded-md tabular">
                    {products.length} producto{products.length !== 1 ? "s" : ""}
                  </span>
                  {products.some((p) => p.offers[0]?.discountPercent) && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 h-6 inline-flex items-center rounded-md">
                      Ofertas activas
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Inline search */}
            <div className="flex-1 max-w-md lg:ml-auto w-full">
              <div className="flex items-center gap-2 bg-white/[0.08] backdrop-blur-md border border-white/15 hover:border-white/25 focus-within:border-white/40 focus-within:bg-white/[0.12] rounded-xl px-4 h-11 transition-all">
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
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <div className="bg-bg-elevated rounded-2xl border border-border p-6 flex flex-col gap-5">
            <p className="text-fg-muted text-sm leading-relaxed">{content.intro}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {content.tips.map((t) => (
                <div
                  key={t.title}
                  className="flex gap-3 p-3.5 rounded-xl border"
                  style={{ backgroundColor: meta.bg, borderColor: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
                >
                  <span className="text-xl flex-shrink-0">{t.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-fg leading-tight">{t.title}</p>
                    <p className="text-xs text-fg-muted mt-1 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {content.guideSlug && (
              <Link
                href={`/guias/${content.guideSlug}`}
                className="self-start inline-flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-80"
                style={{ color: meta.color }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                Ver guía de compra completa →
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

          {/* Barra de control */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="text-sm text-fg-muted">
              <span className="font-bold text-fg tabular">{filtered.length}</span> resultado{filtered.length !== 1 ? "s" : ""}
              {search && <> para &ldquo;<span className="text-brand-600 font-semibold">{search}</span>&rdquo;</>}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="lg:hidden flex items-center gap-1.5 text-sm font-semibold px-3 h-9 bg-bg-elevated border border-border rounded-lg hover:border-border-strong transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
                </svg>
                Filtros
                {activeCount > 0 && (
                  <span className="bg-brand-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular">
                    {activeCount}
                  </span>
                )}
              </button>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="text-sm font-medium border border-border bg-bg-elevated rounded-lg px-3 h-9 outline-none hover:border-border-strong focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/15 transition-all cursor-pointer text-fg"
              >
                <option value="relevancia">Relevancia</option>
                <option value="precio_asc">Precio: menor a mayor</option>
                <option value="precio_desc">Precio: mayor a menor</option>
                <option value="descuento">Mayor descuento</option>
                <option value="valoracion">Mejor valorado</option>
              </select>
            </div>
          </div>

          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-5">
              {activeChips.map((c) => (
                <button
                  key={c.label}
                  onClick={c.clear}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 h-7 rounded-full bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100 transition-colors"
                >
                  {c.label}
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M6 6L18 18M6 18L18 6" />
                  </svg>
                </button>
              ))}
              <button
                onClick={clearAll}
                className="text-xs font-semibold text-fg-subtle hover:text-fg ml-1 transition-colors"
              >
                Limpiar todo
              </button>
            </div>
          )}

          {/* Filtros móvil */}
          {showFilters && (
            <div className="filters-scroll lg:hidden mb-6 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl pr-1 touch-pan-y">
              {sidebarJSX}
            </div>
          )}

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i === 0} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-bg-elevated rounded-2xl border border-border">
              <span className="text-5xl mb-4 opacity-50">{meta.icon}</span>
              <h3 className="text-base font-bold text-fg mb-1.5">Sin resultados</h3>
              <p className="text-sm text-fg-muted mb-6 max-w-sm">
                {search ? `No encontramos "${search}" con estos filtros.` : "Ningún producto coincide con los filtros seleccionados."}
              </p>
              <button
                onClick={clearAll}
                className="text-sm font-bold text-white px-5 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 transition-colors"
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
