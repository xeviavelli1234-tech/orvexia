"use client";

import { useEffect, useState } from "react";

type StockLevel = "green" | "yellow" | "red";

const CATEGORY_SLUGS: Record<string, string> = {
  TELEVISORES: "televisores", LAVADORAS: "lavadoras", FRIGORIFICOS: "frigorificos",
  LAVAVAJILLAS: "lavavajillas", SECADORAS: "secadoras", HORNOS: "hornos",
  MICROONDAS: "microondas", ASPIRADORAS: "aspiradoras", CAFETERAS: "cafeteras",
  AIRES_ACONDICIONADOS: "aires_acondicionados", OTROS: "otros",
};

interface Props {
  inStock: boolean;
  productId: string;
  store: string;
  category?: string;
  discountPercent?: number | null;
}

export function StockBadge({ inStock, productId, store, category, discountPercent }: Props) {
  const [level, setLevel] = useState<StockLevel>(inStock ? "green" : "red");

  useEffect(() => {
    if (!inStock) { setLevel("red"); return; }

    // Semáforo amarillo: descuento alto (>= 25%) → stock limitado probable
    if (discountPercent && discountPercent >= 25) {
      setLevel("yellow");
      return;
    }

    // Semáforo amarillo: muchos cambios de precio recientes
    fetch(`/api/stock-status?productId=${productId}&store=${encodeURIComponent(store)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && data.priceChanges24h >= 2) setLevel("yellow");
      })
      .catch(() => {});
  }, [inStock, productId, store, discountPercent]);

  if (level === "red") {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1 rounded-full w-fit">
          <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
          Agotado temporalmente
        </span>
        {category && CATEGORY_SLUGS[category] && (
          <a
            href={`/categorias/${CATEGORY_SLUGS[category]}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-[#2563EB] hover:underline font-medium pl-1"
          >
            Ver alternativas en stock →
          </a>
        )}
      </div>
    );
  }

  if (level === "yellow") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1 rounded-full w-fit">
        <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse shrink-0" />
        ¡Oferta limitada! Pocas unidades
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-full w-fit">
      <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />
      En stock · Disponible en {store}
    </span>
  );
}
