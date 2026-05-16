"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import type React from "react";
import ProductCard from "./ProductCard";

const STORAGE_KEY = "mdeal:v1";
const SYNC_EVENT = "mdeal:sync";
const REVEAL_MS = 520;

type ProductCardProduct = React.ComponentProps<typeof ProductCard>["product"];

const CATEGORY_LABELS: Record<string, string> = {
  TELEVISORES: "Televisores", LAVADORAS: "Lavadoras", FRIGORIFICOS: "Frigoríficos",
  LAVAVAJILLAS: "Lavavajillas", SECADORAS: "Secadoras", HORNOS: "Hornos",
  MICROONDAS: "Microondas", ASPIRADORAS: "Aspiradoras", CAFETERAS: "Cafeteras",
  AIRES_ACONDICIONADOS: "Aire acondicionado", OTROS: "Otros",
};

// Estado persistido: { k: clave del día, ids: ofertas ya abiertas ese día }.
// Cuando la clave del día cambia (nuevas ofertas) el registro queda obsoleto
// y las cajas vuelven a salir cerradas.
function readOpened(): { k: string; ids: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { k: "", ids: [] };
    const v = JSON.parse(raw);
    if (v && typeof v.k === "string" && Array.isArray(v.ids)) return v;
  } catch {
    /* localStorage no disponible / JSON inválido */
  }
  return { k: "", ids: [] };
}

function persistOpened(revealKey: string, id: string): void {
  try {
    const cur = readOpened();
    const next =
      cur.k === revealKey
        ? { k: revealKey, ids: cur.ids.includes(id) ? cur.ids : [...cur.ids, id] }
        : { k: revealKey, ids: [id] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    /* localStorage no disponible */
  }
}

// localStorage es estado externo: useSyncExternalStore evita el desajuste de
// hidratación (server siempre "cerrada") y sincroniza otras tarjetas/pestañas.
function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener(SYNC_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(SYNC_EVENT, cb);
  };
}

export default function MysteryDealCard({
  product,
  priority = false,
  revealKey,
}: {
  product: ProductCardProduct;
  priority?: boolean;
  revealKey: string;
}) {
  const getSnapshot = useCallback(() => {
    const s = readOpened();
    return s.k === revealKey && s.ids.includes(product.id);
  }, [revealKey, product.id]);

  const persistedOpen = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const [opening, setOpening] = useState(false);
  const [locallyRevealed, setLocallyRevealed] = useState(false);
  const revealed = persistedOpen || locallyRevealed;

  const open = useCallback(() => {
    if (opening || revealed) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      persistOpened(revealKey, product.id);
      setLocallyRevealed(true);
      return;
    }
    setOpening(true);
    window.setTimeout(() => {
      persistOpened(revealKey, product.id);
      setLocallyRevealed(true);
    }, REVEAL_MS);
  }, [opening, revealed, revealKey, product.id]);

  const o = product.offers[0];
  const trusted = o
    ? /^(LG|El Corte Inglés|Fnac)$/i.test(o.store) ||
      o.store.toLowerCase().includes("corte ingl")
    : false;
  const discount =
    o?.priceOld != null && o.priceCurrent < o.priceOld
      ? trusted || o.priceOld / o.priceCurrent <= 2.5
        ? Math.round((1 - o.priceCurrent / o.priceOld) * 100)
        : 0
      : 0;
  const savings =
    o?.priceOld != null && o.priceOld > o.priceCurrent
      ? o.priceOld - o.priceCurrent
      : 0;
  const catLabel = CATEGORY_LABELS[product.category] ?? product.category;

  return (
    <div className="relative h-full">
      <ProductCard product={product} priority={priority} />

      {!revealed && (
        <button
          type="button"
          onClick={open}
          aria-label="Abrir oferta misteriosa"
          className={`absolute inset-0 z-20 w-full overflow-hidden rounded-2xl
            bg-bg-elevated border border-white/[0.08]
            flex flex-col items-center justify-center gap-3.5 p-5 text-center
            transition-all duration-500 ease-out
            ${opening ? "opacity-0 scale-110 blur-[3px] pointer-events-none" : "hover:border-cyan-400/40"}
            motion-reduce:transition-none`}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70
              bg-[radial-gradient(circle_at_50%_28%,rgba(94,234,212,0.14),transparent_60%)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-1 opacity-50
              bg-[conic-gradient(from_0deg,transparent,rgba(217,70,239,0.10),transparent,rgba(94,234,212,0.12),transparent)]"
          />

          <span className="relative font-mono-ui text-[10px] uppercase tracking-widest text-white/55
            border border-white/10 rounded-full px-3 py-1 bg-white/[0.03]">
            {catLabel}
          </span>

          <span
            className={`relative text-5xl transition-transform duration-500 ease-out
              ${opening ? "scale-150 -translate-y-2 rotate-6" : "group-hover:scale-105"}`}
          >
            🎁
          </span>

          {discount > 0 ? (
            <span className="relative leading-none">
              <span className="block text-4xl font-black text-gradient-neon">-{discount}%</span>
              {savings > 0 && (
                <span className="mt-1.5 block font-mono-ui text-[11px] text-emerald-300/90">
                  ahorras {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(savings)} €
                </span>
              )}
            </span>
          ) : (
            <span className="relative text-sm font-bold text-white/80">Oferta sorpresa</span>
          )}

          <span className="relative mt-0.5 inline-flex items-center gap-2 font-mono-ui text-[11px] uppercase font-bold
            px-4 h-9 rounded-full text-cyan-200 border border-cyan-400/30 bg-cyan-400/[0.06]
            group-hover:bg-cyan-400/[0.12] transition-colors">
            Abrir oferta
            <span className="transition-transform group-hover:translate-x-0.5">▸</span>
          </span>
        </button>
      )}
    </div>
  );
}
