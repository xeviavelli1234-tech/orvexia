"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback, Suspense } from "react";
import Image from "next/image";

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

function SearchInput({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
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
    onNavigate?.();
    router.push(`/buscar?q=${encodeURIComponent(q)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(q);
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
    <div ref={containerRef} className="w-full relative">
      <form onSubmit={handleSubmit} className="w-full" role="search" aria-label="Buscar productos">
        <div className="flex items-center gap-2 w-full px-2.5 py-2.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-full bg-[#F1F5F9] border border-[#E2E8F0] hover:border-[#CBD5E1] focus-within:border-[#2563EB] focus-within:bg-white transition-all">
          {/* Search icon / spinner */}
          <span className="shrink-0 text-[#94A3B8] w-[15px] h-[15px] flex items-center justify-center">
            {loading ? (
              <svg
                className="animate-spin"
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="7.5"
                  cy="7.5"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="28"
                  strokeDashoffset="10"
                />
              </svg>
            ) : (
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <input
            ref={inputRef}
            type="search"
            placeholder="Buscar productos, categorías…"
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
            className="flex-1 min-w-0 bg-transparent text-[15px] sm:text-sm outline-none text-[#0F172A] placeholder:text-[#94A3B8]"
          />
          <button type="submit" className="sr-only">Buscar</button>
        </div>
      </form>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden max-h-[60vh] overflow-y-auto"
        >
          {results.map((r, i) => (
            <button
              key={r.id}
              role="option"
              aria-selected={i === highlighted}
              onClick={() => navigate(r.name)}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 text-left transition-colors ${
                i === highlighted ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]"
              } ${i > 0 ? "border-t border-[#F1F5F9]" : ""}`}
            >
              {/* Image */}
              <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-md bg-[#F1F5F9] flex-shrink-0 overflow-hidden flex items-center justify-center">
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
                <p className="text-[13px] sm:text-sm font-medium text-[#0F172A] truncate">{r.name}</p>
                <p className="text-xs text-[#64748B] truncate">
                  {r.brand} · {CAT[r.category] ?? r.category}
                </p>
              </div>
              {/* Price */}
              {r.offers[0] && (
                <div className="flex-shrink-0 text-right min-w-[76px] sm:min-w-[84px]">
                  <p className="text-[13px] sm:text-sm font-semibold text-[#0F172A] leading-tight">
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
            className="w-full px-3 py-3 sm:py-2.5 text-center text-sm text-[#2563EB] font-medium hover:bg-[#EFF6FF] transition-colors border-t border-[#F1F5F9]"
          >
            Ver todos los resultados →
          </button>
        </div>
      )}
    </div>
  );
}

export function HeaderSearch({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={null}>
      <SearchInput onNavigate={onNavigate} />
    </Suspense>
  );
}
