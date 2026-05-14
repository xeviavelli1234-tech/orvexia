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
  const [focused, setFocused] = useState(false);

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
    <div className="w-full">
      <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
        {/* Halo glow when focused */}
        <div
          className={`absolute inset-0 -m-px rounded-2xl transition-opacity duration-300 pointer-events-none ${focused ? "opacity-100" : "opacity-0"}`}
          style={{
            background: "linear-gradient(120deg, rgba(99,102,241,0.5), rgba(96,165,250,0.4), rgba(52,211,153,0.4))",
            filter: "blur(16px)",
          }}
          aria-hidden
        />

        <form
          onSubmit={handleSubmit}
          className="relative flex items-center gap-2 bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] p-2 sm:p-2.5 ring-1 ring-white/10"
        >
          <span className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-fg-faint flex-shrink-0">
            {loading ? (
              <svg className="animate-spin w-5 h-5 text-brand-500" viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="38" strokeDashoffset="14" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            )}
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="¿Qué electrodoméstico estás buscando?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(-1);
              fetchResults(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true);
              if (results.length > 0) setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            aria-label="Buscar electrodomésticos"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            className="flex-1 min-w-0 text-base text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
            style={{ color: "#0B0D12" }}
          />
          <span className="aura-cta inline-flex rounded-xl shrink-0">
            <button
              type="submit"
              className="inline-flex items-center justify-center bg-brand-600 hover:bg-brand-700 active:scale-[0.97] text-white text-sm font-bold px-5 sm:px-6 h-10 sm:h-11 rounded-xl transition-all duration-150"
            >
              Buscar
            </button>
          </span>
        </form>

        {open && results.length > 0 && (
          <div
            role="listbox"
            className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden fade-in"
          >
            {results.map((r, i) => (
              <button
                key={r.id}
                role="option"
                aria-selected={i === highlighted}
                onClick={() => navigate(r.name)}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  i === highlighted ? "bg-slate-100" : "hover:bg-slate-50"
                } ${i > 0 ? "border-t border-slate-100" : ""}`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-100">
                  {r.image ? (
                    <Image src={r.image} alt={r.name} width={36} height={36} className="object-contain w-full h-full p-1" unoptimized />
                  ) : (
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {r.brand} · {CAT[r.category] ?? r.category}
                  </p>
                </div>
                {r.offers[0] && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-900 tabular">
                      {r.offers[0].priceCurrent.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </p>
                    {r.offers[0].discountPercent != null && r.offers[0].discountPercent > 0 && (
                      <p className="text-xs font-bold text-emerald-600">-{r.offers[0].discountPercent}%</p>
                    )}
                  </div>
                )}
              </button>
            ))}
            <button
              onClick={() => navigate(query.trim())}
              className="w-full px-4 py-3 text-center text-sm text-brand-600 font-bold hover:bg-brand-50 transition-colors border-t border-slate-100"
            >
              Ver todos los resultados →
            </button>
          </div>
        )}
      </div>

      {/* Trending tags */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-5 px-2 sm:px-0">
        <span className="text-white/40 text-xs font-medium">Tendencias:</span>
        {TRENDING.map((term) => (
          <button
            key={term}
            onClick={() => navigate(term)}
            className="text-xs text-white/70 hover:text-white px-3 h-7 inline-flex items-center rounded-full border border-white/15 hover:border-white/35 bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-150"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
