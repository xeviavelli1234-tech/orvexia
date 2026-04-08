"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

const TRENDING = [
  "Lavadora Samsung",
  'TV 65"',
  "Frigorífico No Frost",
  "Lavavajillas Bosch",
];

export function HeroSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (!q) return;
    router.push(`/buscar?q=${encodeURIComponent(q)}`);
  }

  function searchTrend(term: string) {
    router.push(`/buscar?q=${encodeURIComponent(term)}`);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] px-4 py-2.5 max-w-2xl mx-auto mb-5">
        <svg className="w-5 h-5 text-[#94A3B8] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Busca lavadora, TV, frigorífico..."
          className="flex-1 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none bg-transparent py-1"
        />
        <button
          type="submit"
          className="bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-150 whitespace-nowrap"
        >
          Buscar ahora
        </button>
      </form>

      {/* Trending tags */}
      <div className="flex flex-wrap items-center justify-center gap-2">
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
