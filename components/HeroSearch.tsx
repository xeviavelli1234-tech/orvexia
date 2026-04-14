"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";

const TRENDING = [
  "Lavadora Samsung",
  'TV 65"',
  "Frigorífico No Frost",
  "Lavavajillas Bosch",
];

const CAT: Record<string, string> = {
  TELEVISORES: "Televisores",
  LAVADORAS: "Lavadoras",
  FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas",
  SECADORAS: "Secadoras",
  HORNOS: "Hornos",
  MICROONDAS: "Microondas",
  ASPIRADORAS: "Aspiradoras",
  CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aire acond.",
  OTROS: "Otros",
};

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image: string | null;
  offers: { priceCurrent: number; discountPercent: number | null }[];
}

export function HeroSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  // Debounced fetch
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchResults = useCallback((q: string) => {
    if (fetchRef.current) clearTimeout(fetchRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlighted(-1);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function navigate(q: string) {
    setOpen(false);
    setHighlighted(-1);
    router.push(`/buscar?q=${encodeURIComponent(q)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(q);
  }

  function searchTrend(term: string) {
    navigate(term);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      navigate(results[highlighted].name);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
    }
  }

  return (
    <div>
      <div ref={containerRef} className="relative w-full max-w-2xl mx-auto mb-5 px-2 sm:px-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-white rounded-2xl shadow-[0_10px_28px_rgba(15,23,42,0.18)] px-3 py-2 sm:px-4 sm:py-2.5"
        >
          {/* Search icon / spinner */}
          <span className="w-5 h-5 text-[#94A3B8] flex-shrink-0 flex items-center justify-center">
            {loading ? (
              <svg
                className="animate-spin w-5 h-5"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="38"
                  strokeDashoffset="14"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            )}
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Busca lavadora, TV, frigorífico..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(-1);
              fetchResults(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            aria-label="Buscar electrodomésticos"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            className="flex-1 min-w-0 text-sm sm:text-base text-[#0F172A] placeholder-[#94A3B8] outline-none bg-transparent py-1"
          />
          <button
            type="submit"
            className="shrink-0 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white text-sm sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-xl transition-all duration-150 whitespace-nowrap text-center"
          >
            Buscar ahora
          </button>
        </form>

        {/* Dropdown */}
        {open && results.length > 0 && (
          <div
            role="listbox"
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.20)] z-50 overflow-hidden"
          >
            {results.map((r, i) => (
              <button
                key={r.id}
                role="option"
                aria-selected={i === highlighted}
                onClick={() => navigate(r.name)}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  i === highlighted ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]"
                } ${i > 0 ? "border-t border-[#F1F5F9]" : ""}`}
              >
                {/* Image */}
                <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {r.image ? (
                    <Image
                      src={r.image}
                      alt={r.name}
                      width={32}
                      height={32}
                      className="object-contain w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <svg className="w-4 h-4 text-[#CBD5E1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">{r.name}</p>
                  <p className="text-xs text-[#64748B] truncate">
                    {r.brand} · {CAT[r.category] ?? r.category}
                  </p>
                </div>
                {/* Price */}
                {r.offers[0] && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {r.offers[0].priceCurrent.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </p>
                    {r.offers[0].discountPercent != null && r.offers[0].discountPercent > 0 && (
                      <p className="text-xs font-medium text-[#16A34A]">-{r.offers[0].discountPercent}%</p>
                    )}
                  </div>
                )}
              </button>
            ))}
            {/* Ver todos */}
            <button
              onClick={() => navigate(query.trim())}
              className="w-full px-4 py-3 text-center text-sm text-[#2563EB] font-medium hover:bg-[#EFF6FF] transition-colors border-t border-[#F1F5F9]"
            >
              Ver todos los resultados →
            </button>
          </div>
        )}
      </div>

      {/* Trending tags */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-2 sm:px-0">
        <span className="text-white/40 text-xs">Tendencias:</span>
        {TRENDING.map((term) => (
          <button
            key={term}
            onClick={() => searchTrend(term)}
            className="text-xs text-white/70 hover:text-white px-3 py-1 rounded-full border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-150"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
