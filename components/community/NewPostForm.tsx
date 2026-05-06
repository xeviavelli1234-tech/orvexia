"use client";

import { useActionState, useState, useRef, useEffect, useCallback } from "react";
import { useFormStatus } from "react-dom";
import type { CommunityActionState } from "@/app/actions/community";
import { createCommunityPost } from "@/app/actions/community";

const initialState: CommunityActionState = {};

const TYPE_OPTIONS = [
  { value: "DISCUSION", label: "Discusión", bg: "var(--brand-50)", color: "var(--brand-600)", dot: "var(--brand-600)" },
  { value: "PREGUNTA",  label: "Pregunta",  bg: "#FEF3C7", color: "#B45309", dot: "var(--warn-500)" },
  { value: "CHOLLO",    label: "Chollo",    bg: "#DCFCE7", color: "#15803D", dot: "var(--accent-600)" },
  { value: "CONSEJO",   label: "Consejo",   bg: "#F3E8FF", color: "#6D28D9", dot: "#7C3AED" },
] as const;

type ProductResult = {
  id: string;
  name: string;
  brand: string;
  image: string | null;
  offers: { priceCurrent: number }[];
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
      style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
    >
      {pending ? (
        <>
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round" />
          </svg>
          Publicando...
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Publicar
        </>
      )}
    </button>
  );
}

function ProductSearch({
  selectedProduct,
  onSelect,
}: {
  selectedProduct: ProductResult | null;
  onSelect: (p: ProductResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selectedProduct) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-brand-200 bg-brand-50">
        {selectedProduct.image && (
          <img
            src={selectedProduct.image}
            alt={selectedProduct.name}
            className="w-12 h-12 rounded-lg object-contain bg-white border border-border p-1 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-widest mb-0.5">
            Producto seleccionado
          </p>
          <p className="text-sm font-bold text-fg truncate">{selectedProduct.name}</p>
          {selectedProduct.offers[0] && (
            <p className="text-xs text-fg-muted">
              desde {selectedProduct.offers[0].priceCurrent.toFixed(2).replace(".", ",")} €
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="shrink-0 p-1.5 rounded-lg text-fg-subtle hover:text-danger-500 hover:bg-red-50 transition"
          aria-label="Quitar producto"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
          width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-bg-subtle text-sm text-fg placeholder-[#CBD5E1] focus:border-brand-600 focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition"
          placeholder="Busca un producto por nombre o marca…"
          autoComplete="off"
        />
        {loading && (
          <svg
            className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle"
            width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-2xl shadow-xl overflow-hidden">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onSelect(p); setOpen(false); setQuery(""); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-subtle transition text-left border-b border-border-subtle last:border-0"
            >
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-10 h-10 rounded-lg object-contain bg-white border border-border p-0.5 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-bg-subtle shrink-0 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--fg-subtle)" strokeWidth="2" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{p.name}</p>
                <p className="text-xs text-fg-subtle">{p.brand}</p>
              </div>
              {p.offers[0] && (
                <span className="text-sm font-bold text-fg shrink-0">
                  {p.offers[0].priceCurrent.toFixed(2).replace(".", ",")} €
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-2xl shadow-xl px-4 py-4 text-center">
          <p className="text-sm text-fg-muted">No se encontraron productos</p>
        </div>
      )}
    </div>
  );
}

export function NewPostForm({ productId: initialProductId }: { productId?: string | null }) {
  const [state, formAction] = useActionState(createCommunityPost, initialState);
  const [selectedType, setSelectedType] = useState<string>("DISCUSION");
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);

  return (
    <form action={formAction} className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Accent bar matching selected type */}
      <div
        className="h-1 transition-colors"
        style={{
          backgroundColor:
            TYPE_OPTIONS.find((o) => o.value === selectedType)?.dot ?? "var(--brand-600)",
        }}
      />

      <div className="p-6 space-y-6">
        {/* Type selector */}
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-fg">
            Tipo de publicación
          </label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const isSelected = selectedType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedType(opt.value)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all"
                  style={
                    isSelected
                      ? { backgroundColor: opt.bg, color: opt.color, borderColor: opt.color }
                      : { backgroundColor: "white", color: "var(--fg-muted)", borderColor: "var(--border)" }
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isSelected ? opt.dot : "var(--fg-faint)" }}
                  />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="type" value={selectedType} />
          {state?.fieldErrors?.type && (
            <p className="text-xs text-red-500">{state.fieldErrors.type[0]}</p>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label htmlFor="post-title" className="text-[13px] font-bold text-fg">
            Título
          </label>
          <input
            id="post-title"
            name="title"
            required
            minLength={6}
            maxLength={120}
            className="w-full rounded-xl border border-border bg-bg-subtle px-4 py-2.5 text-sm text-fg placeholder-[#CBD5E1] focus:border-brand-600 focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition"
            placeholder="Ej: ¿Merece la pena la lavadora LG a este precio?"
          />
          {state?.fieldErrors?.title && (
            <p className="text-xs text-red-500">{state.fieldErrors.title[0]}</p>
          )}
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <label htmlFor="post-content" className="text-[13px] font-bold text-fg">
            Contenido
          </label>
          <textarea
            id="post-content"
            name="content"
            required
            minLength={30}
            maxLength={2000}
            rows={6}
            className="w-full rounded-xl border border-border bg-bg-subtle px-4 py-3 text-sm text-fg placeholder-[#CBD5E1] focus:border-brand-600 focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition resize-none"
            placeholder="Cuéntanos más detalles: modelo, tienda, precio, experiencia de uso, pros y contras…"
          />
          {state?.fieldErrors?.content && (
            <p className="text-xs text-red-500">{state.fieldErrors.content[0]}</p>
          )}
        </div>

        {/* Product search */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-[13px] font-bold text-fg">
              Vincular producto
            </label>
            <span className="text-[11px] text-fg-subtle font-medium bg-bg-subtle px-2 py-0.5 rounded-full">
              opcional
            </span>
          </div>
          <p className="text-xs text-fg-subtle">
            Asocia tu publicación a un producto de Orvexia para que otros lo encuentren fácilmente.
          </p>
          <ProductSearch selectedProduct={selectedProduct} onSelect={setSelectedProduct} />
          <input
            type="hidden"
            name="productId"
            value={selectedProduct?.id ?? initialProductId ?? ""}
          />
          {state?.fieldErrors?.productId && (
            <p className="text-xs text-red-500">{state.fieldErrors.productId[0]}</p>
          )}
        </div>

        {/* Errors / success */}
        {state?.error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {state.error}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
          <p className="text-xs text-fg-subtle">
            Sé respetuoso y constructivo.
          </p>
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
