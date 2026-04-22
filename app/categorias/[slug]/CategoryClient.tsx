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
    let list = enriched.filter((p) => {
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
  }, [enriched, search, selectedBrands, selectedTechs, selectedOS, selectedStores, maxPrice, minRating, onlyDiscount, sort, globalMin, globalMax]);

  function toggle<T>(arr: T[], val: T, set: (v: T[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function clearAll() {
    setSearch(""); setSelectedBrands([]); setSelectedTechs([]);
    setSelectedOS([]); setSelectedStores([]); setMaxPrice(9999); setMinRating(0); setOnlyDiscount(false);
  }

  const activeCount = selectedBrands.length + selectedTechs.length + selectedOS.length + selectedStores.length +
    (maxPrice < globalMax ? 1 : 0) + (minRating > 0 ? 1 : 0) + (onlyDiscount ? 1 : 0);

  const sidebarJSX = (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#0F172A]">Filtros</h3>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs font-semibold text-[#EF4444] hover:underline">
            Limpiar todo
          </button>
        )}
      </div>

      {/* Marca */}
      <div>
        <p className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">Marca</p>
        <div className="space-y-2">
          {brands.map((b) => (
            <label key={b} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedBrands.includes(b)}
                onChange={() => toggle(selectedBrands, b, setSelectedBrands)}
                className="w-4 h-4 rounded border-[#CBD5E1] accent-[#2563EB]"
              />
              <span className="text-sm text-[#374151] group-hover:text-[#0F172A] flex-1">{b}</span>
              <span className="text-[11px] text-[#94A3B8]">{enriched.filter((p) => p.brand === b).length}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tienda */}
      {stores.length > 1 && (
        <div>
          <p className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">Tienda</p>
          <div className="space-y-2">
            {stores.map((s) => (
              <label key={s} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedStores.includes(s)}
                  onChange={() => toggle(selectedStores, s, setSelectedStores)}
                  className="w-4 h-4 rounded border-[#CBD5E1] accent-[#2563EB]"
                />
                <span className="text-sm text-[#374151] group-hover:text-[#0F172A] flex-1">{s}</span>
                <span className="text-[11px] text-[#94A3B8]">
                  {enriched.filter((p) => p.offers.some((o) => o.store === s)).length}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Precio */}
      <div>
        <p className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">
          Precio máximo
          {maxPrice < globalMax && <span className="ml-2 text-[#2563EB] normal-case font-semibold">hasta {maxPrice}€</span>}
        </p>
        <input
          type="range"
          min={globalMin}
          max={globalMax}
          step={10}
          value={maxPrice === 9999 ? globalMax : maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#2563EB] mb-3"
        />
        <div className="grid grid-cols-3 gap-1.5">
          {[200, 300, 400, 500, 700, 1000].filter((v) => v <= globalMax + 50).map((v) => (
            <button
              key={v}
              onClick={() => setMaxPrice(maxPrice === v ? 9999 : v)}
              className={`text-xs py-1.5 rounded-lg border transition-colors ${maxPrice === v ? "bg-[#2563EB] text-white border-[#2563EB]" : "border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB]/50"}`}
            >
              {v}€
            </button>
          ))}
        </div>
      </div>

      {/* Tecnología */}
      {techs.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">Tecnología</p>
          <div className="flex flex-wrap gap-2">
            {techs.map((t) => (
              <button
                key={t}
                onClick={() => toggle(selectedTechs, t, setSelectedTechs)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedTechs.includes(t) ? "bg-[#2563EB] text-white border-[#2563EB]" : "border-[#E2E8F0] text-[#475569] hover:border-[#2563EB]/50"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sistema Operativo */}
      {osList.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">Sistema operativo</p>
          <div className="space-y-2">
            {osList.map((os) => (
              <label key={os} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedOS.includes(os)}
                  onChange={() => toggle(selectedOS, os, setSelectedOS)}
                  className="w-4 h-4 rounded border-[#CBD5E1] accent-[#2563EB]"
                />
                <span className="text-sm text-[#374151] group-hover:text-[#0F172A]">{os}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Valoración */}
      <div>
        <p className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">Valoración mínima</p>
        <div className="flex gap-1.5">
          {[3, 3.5, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(minRating === r ? 0 : r)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${minRating === r ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "border-[#E2E8F0] text-[#475569] hover:border-[#F59E0B]/50"}`}
            >
              ★{r}+
            </button>
          ))}
        </div>
      </div>

      {/* Descuento */}
      <div className="flex items-center justify-between cursor-pointer pt-1 border-t border-[#F1F5F9]" onClick={() => setOnlyDiscount((v) => !v)}>
        <span className="text-sm font-medium text-[#374151] select-none">Solo con descuento</span>
        <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${onlyDiscount ? "bg-[#2563EB]" : "bg-[#CBD5E1]"}`}>
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${onlyDiscount ? "translate-x-5" : "translate-x-1"}`} />
        </div>
      </div>
    </div>
  );

  return (

    <main className="min-h-screen bg-[#F8FAFC]">

      {/* HERO */}
      <section className={`bg-gradient-to-br ${meta.gradient} pt-12 pb-16 px-6 relative overflow-hidden`}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white opacity-5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-64 h-32 rounded-full bg-white opacity-5 blur-2xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-6">
            <Link href="/" className="hover:text-white/80 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/categorias" className="hover:text-white/80 transition-colors">Categorías</Link>
            <span>/</span>
            <span className="text-white/90 font-medium">{meta.label}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-5xl shadow-xl">{meta.icon}</div>
              <div>
                <h1 className="text-4xl font-extrabold text-white tracking-tight">{meta.label}</h1>
                <p className="text-white/60 text-sm mt-1">{meta.desc}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs font-semibold text-white/80 bg-white/10 px-2.5 py-1 rounded-full">
                    {products.length} producto{products.length !== 1 ? "s" : ""}
                  </span>
                  {products.some((p) => p.offers[0]?.discountPercent) && (
                    <span className="text-xs font-semibold text-[#34D399] bg-white/10 px-2.5 py-1 rounded-full">🔥 Ofertas activas</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5">
                <svg className="w-4 h-4 text-white/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={`Buscar en ${meta.label.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-white/40 text-sm outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-white/50 hover:text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 leading-none">
          <svg viewBox="0 0 1440 32" fill="none" className="w-full h-8"><path d="M0 32L720 0L1440 32V32H0V32Z" fill="#F8FAFC" /></svg>
        </div>
      </section>

      {/* CONTENIDO EDITORIAL */}
      {content && (
        <section className="max-w-7xl mx-auto px-6 pt-8 pb-2">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col gap-5">
            <p className="text-[#334155] text-sm leading-relaxed">{content.intro}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {content.tips.map((t) => (
                <div key={t.title} className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: meta.bg }}>
                  <span className="text-xl flex-shrink-0">{t.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">{t.title}</p>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {content.guideSlug && (
              <Link
                href={`/guias/${content.guideSlug}`}
                className="self-start flex items-center gap-1.5 text-xs font-bold hover:underline transition-colors"
                style={{ color: meta.color }}
              >
                📖 Ver guía de compra completa →
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">

        {/* SIDEBAR DESKTOP */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="filters-scroll sticky top-6 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain pr-1 touch-pan-y">
            {sidebarJSX}
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 min-w-0">

          {/* Barra de control */}
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <p className="text-sm text-[#64748B]">
              <span className="font-bold text-[#0F172A]">{filtered.length}</span> resultado{filtered.length !== 1 ? "s" : ""}
              {search && <span> para "<span className="text-[#2563EB]">{search}</span>"</span>}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="lg:hidden flex items-center gap-1.5 text-sm font-semibold px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB]/40 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" /></svg>
                Filtros
                {activeCount > 0 && <span className="bg-[#2563EB] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>}
              </button>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="text-sm border border-[#E2E8F0] bg-white rounded-xl px-3 py-2 outline-none hover:border-[#2563EB]/40 transition-colors cursor-pointer"
              >
                <option value="relevancia">Relevancia</option>
                <option value="precio_asc">Precio: menor a mayor</option>
                <option value="precio_desc">Precio: mayor a menor</option>
                <option value="descuento">Mayor descuento</option>
                <option value="valoracion">Mejor valorado</option>
              </select>
            </div>
          </div>

          {/* Filtros móvil */}
          {showFilters && (
            <div className="filters-scroll lg:hidden mb-6 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl pr-1 touch-pan-y">
              {sidebarJSX}
            </div>
          )}

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p, i) => <ProductCard key={p.id} product={p} priority={i === 0} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-[#E2E8F0]">
              <span className="text-6xl mb-4">{meta.icon}</span>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">Sin resultados</h3>
              <p className="text-sm text-[#64748B] mb-6">
                {search ? `No encontramos "${search}" con estos filtros` : "Ningún producto coincide con los filtros seleccionados"}
              </p>
              <button onClick={clearAll} className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors">
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
