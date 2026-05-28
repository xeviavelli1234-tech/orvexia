"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { trackAffiliateClick } from "@/lib/affiliate-track";
import {
  categoryIcon,
  categoryLabel,
  productKey,
  type CompareApiResponse,
  type CompareProduct,
  type DetailedProduct,
  type Offer,
} from "./compare-table/helpers";
import {
  DetailTable,
  Header,
  PickerGrid,
  TableSkeleton,
} from "./compare-table/Primitives";

export type { CompareProduct } from "./compare-table/helpers";

// ─── Componente principal ────────────────────────────────────────────────────

export function CompareTable({ products }: { products: CompareProduct[] }) {
  // Dedupe + agrupar por categoría
  const { byCategory, eligibleCats } = useMemo(() => {
    const seen = new Set<string>();
    const list: CompareProduct[] = [];
    for (const p of products) {
      const k = productKey(p);
      if (seen.has(k)) continue;
      seen.add(k);
      list.push(p);
    }
    const byCategory: Record<string, CompareProduct[]> = {};
    for (const p of list) {
      (byCategory[p.category] ??= []).push(p);
    }
    const eligibleCats = Object.keys(byCategory).filter((c) => byCategory[c].length >= 2);
    eligibleCats.sort((a, b) => byCategory[b].length - byCategory[a].length);
    return { byCategory, eligibleCats };
  }, [products]);

  const [category, setCategory] = useState<string | null>(() => eligibleCats[0] ?? null);
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);

  // Al cambiar de categoría limpiamos la selección. NO autoseleccionamos:
  // el usuario elige manualmente los 2 productos que quiere comparar.
  useEffect(() => {
    setAId(null);
    setBId(null);
  }, [category]);

  // Toggle FIFO: tap en uno seleccionado lo quita; en uno nuevo, llena el
  // hueco vacío o desplaza A si los dos están llenos.
  const toggleSelect = useCallback((key: string) => {
    setAId((prevA) => {
      if (key === prevA) return null;
      if (key === bId) { setBId(null); return prevA; }
      if (!prevA) return key;
      if (!bId) { setBId(key); return prevA; }
      // Ambos llenos → A se descarta, B pasa a A, key pasa a B.
      const newA = bId;
      setBId(key);
      return newA;
    });
  }, [bId]);

  // Detalle: fetch al /api/compare cuando hay A y B
  const [detail, setDetail] = useState<CompareApiResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!aId || !bId || aId === bId) { setDetail(null); return; }
    let cancelled = false;
    setLoadingDetail(true);
    setDetailError(null);
    fetch(`/api/compare?a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d: CompareApiResponse) => { if (!cancelled) setDetail(d); })
      .catch((e: unknown) => {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : "Error de red");
      })
      .finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [aId, bId]);

  const swap = useCallback(() => {
    setAId((prevA) => { setBId(prevA); return bId; });
  }, [bId]);

  const handleCtaClick = useCallback((p: DetailedProduct, offer: Offer) => {
    trackAffiliateClick({
      productId: p.id,
      selectedRetailer: offer.store,
      retailerPosition: 0,
      isPrimary: true,
      placement: "dashboard-compare",
    });
  }, []);

  // ── Empty state global ──────────────────────────────────────────────────────
  if (eligibleCats.length === 0) {
    return (
      <section className="bg-bg-elevated rounded-2xl border border-white/[0.08] overflow-hidden">
        <Header />
        <div className="py-10 px-6 flex flex-col items-center text-center gap-3">
          <span className="text-4xl" aria-hidden>⚖️</span>
          <div>
            <p className="text-[15px] font-semibold text-fg">
              Necesitas al menos 2 productos de la misma categoría
            </p>
            <p className="text-[13px] text-fg-subtle mt-1 max-w-sm">
              Guarda dos televisores, dos lavadoras… y vuelve aquí para enfrentarlos
              lado a lado.
            </p>
          </div>
          <Link
            href="/categorias"
            className="mt-1 text-sm font-semibold text-white px-5 py-2 rounded-full"
            style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}
          >
            Explorar categorías
          </Link>
        </div>
      </section>
    );
  }

  const currentPool = category ? (byCategory[category] ?? []) : [];

  return (
    <section className="bg-bg-elevated rounded-2xl border border-white/[0.08] overflow-hidden">
      <Header onSwap={aId && bId ? swap : undefined} />

      {/* ── Paso 1: categoría ──────────────────────────────────────────────── */}
      <div className="px-4 sm:px-5 py-3 border-b border-border-subtle bg-bg-subtle/40">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle mb-2">
          1 · Categoría
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
          {eligibleCats.map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 snap-start inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold border transition-all ${
                  active
                    ? "bg-cyan-400/15 border-cyan-400/50 text-cyan-200 shadow-[0_0_18px_-6px_rgba(94,234,212,0.5)]"
                    : "bg-bg-elevated border-border text-fg-muted hover:border-border-strong hover:text-fg"
                }`}
                aria-pressed={active}
              >
                <span aria-hidden>{categoryIcon(c)}</span>
                <span>{categoryLabel(c)}</span>
                <span className={`text-[10px] tabular ${active ? "text-cyan-300" : "text-fg-subtle"}`}>
                  {byCategory[c].length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Paso 2: tarjetas seleccionables ───────────────────────────────── */}
      <div className="px-4 sm:px-5 py-4 border-b border-border-subtle">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-subtle">
            2 · Toca 2 productos
          </p>
          <p className="text-[11px] text-fg-muted">
            {aId && bId
              ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 mr-1 align-middle" /><span className="font-semibold text-cyan-300">A</span> vs <span className="inline-block w-1.5 h-1.5 rounded-full bg-fuchsia-400 mr-1 ml-1 align-middle" /><span className="font-semibold text-fuchsia-300">B</span></>
              : aId
                ? "Falta el segundo (B)"
                : "Ninguno seleccionado"}
          </p>
        </div>
        <PickerGrid
          pool={currentPool}
          aId={aId}
          bId={bId}
          onToggle={toggleSelect}
        />
      </div>

      {/* ── Tabla comparativa ──────────────────────────────────────────────── */}
      {!aId || !bId ? (
        <div className="py-10 px-6 text-center text-[13px] text-fg-subtle">
          Elige dos productos para ver la comparativa detallada.
        </div>
      ) : loadingDetail && !detail ? (
        <TableSkeleton />
      ) : detailError ? (
        <div className="py-8 px-6 text-center">
          <p className="text-[14px] font-semibold text-danger-600 mb-1">No se pudo cargar la comparación</p>
          <p className="text-[12px] text-fg-subtle">{detailError}</p>
        </div>
      ) : detail ? (
        <DetailTable a={detail.a} b={detail.b} onCtaClick={handleCtaClick} />
      ) : null}
    </section>
  );
}
