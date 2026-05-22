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
        <div className="flex items-center gap-2 w-full px-3 h-10 rounded-lg bg-bg-subtle border border-border hover:border-border-strong focus-within:border-brand-500 focus-within:bg-bg-elevated focus-within:ring-2 focus-within:ring-brand-500/15 transition-all">
          <span className="shrink-0 text-fg-faint w-4 h-4 flex items-center justify-center">
            {loading ? (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="26" strokeDashoffset="9" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <input
            ref={inputRef}
            type="search"
            placeholder="Buscar productos…"
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
            role="combobox"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none text-fg placeholder:text-fg-faint"
          />
          <kbd className="hidden lg:inline-flex h-5 px-1.5 rounded border border-border text-[10px] font-semibold text-fg-subtle bg-bg-elevated tabular">
            ⌘K
          </kbd>
          <button type="submit" className="sr-only">Buscar</button>
        </div>
      </form>

      {open && results.length > 0 && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-bg-elevated border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-[60vh] overflow-y-auto fade-in"
        >
          {results.map((r, i) => (
            <button
              key={r.id}
              role="option"
              aria-selected={i === highlighted}
              onClick={() => navigate(r.name)}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                i === highlighted ? "bg-bg-subtle" : "hover:bg-bg-subtle"
              } ${i > 0 ? "border-t border-border-subtle" : ""}`}
            >
              <div className="w-9 h-9 rounded-lg bg-bg-subtle flex-shrink-0 overflow-hidden flex items-center justify-center border border-border-subtle">
                {r.image ? (
                  <Image src={r.image} alt={r.name} width={32} height={32} className="object-contain w-full h-full p-1" unoptimized />
                ) : (
                  <svg className="w-4 h-4 text-fg-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{r.name}</p>
                <p className="text-xs text-fg-subtle truncate">
                  {r.brand} · {CAT[r.category] ?? r.category}
                </p>
              </div>
              {r.offers[0] && (
                <div className="flex-shrink-0 text-right min-w-[80px]">
                  <p className="text-sm font-bold text-fg leading-tight tabular">
                    {r.offers[0].priceCurrent.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                  </p>
                  {r.offers[0].discountPercent != null && r.offers[0].discountPercent > 0 && (
                    <p className="text-xs font-bold text-accent-600">-{r.offers[0].discountPercent}%</p>
                  )}
                </div>
              )}
            </button>
          ))}
          <button
            onClick={() => navigate(query.trim())}
            className="w-full px-3 py-3 text-center text-sm text-brand-600 font-semibold hover:bg-brand-50 transition-colors border-t border-border-subtle"
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
