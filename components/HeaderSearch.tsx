"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, Suspense } from "react";

function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (!q) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", q);
    router.push(`/buscar?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" role="search" aria-label="Buscar productos">
      <div className="flex items-center gap-2 w-full px-3 py-2 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] hover:border-[#CBD5E1] focus-within:border-[#2563EB] focus-within:bg-white transition-all">
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-[#94A3B8]"
          aria-hidden="true"
        >
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          placeholder="Buscar productos, categorías…"
          defaultValue={searchParams.get("q") ?? ""}
          aria-label="Buscar electrodomésticos"
          className="flex-1 bg-transparent text-sm outline-none text-[#0F172A] placeholder:text-[#94A3B8]"
        />
        <button type="submit" className="sr-only">Buscar</button>
      </div>
    </form>
  );
}

export function HeaderSearch() {
  return (
    <Suspense fallback={null}>
      <SearchInput />
    </Suspense>
  );
}
