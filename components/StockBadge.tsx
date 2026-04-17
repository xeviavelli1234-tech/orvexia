"use client";

const CATEGORY_SLUGS: Record<string, string> = {
  TELEVISORES: "televisores", LAVADORAS: "lavadoras", FRIGORIFICOS: "frigorificos",
  LAVAVAJILLAS: "lavavajillas", SECADORAS: "secadoras", HORNOS: "hornos",
  MICROONDAS: "microondas", ASPIRADORAS: "aspiradoras", CAFETERAS: "cafeteras",
  AIRES_ACONDICIONADOS: "aires_acondicionados", OTROS: "otros",
};

interface Props {
  inStock: boolean;
  store: string;
  category?: string;
  discountPercent?: number | null;
  // kept for API compatibility but no longer used
  productId?: string;
}

export function StockBadge({ inStock, store, category, discountPercent }: Props) {
  /* OUT OF STOCK */
  if (!inStock) {
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

  /* IN STOCK WITH ACTIVE DISCOUNT */
  if (discountPercent && discountPercent > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1 rounded-full w-fit">
        <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
        En stock · Precio rebajado en {store}
      </span>
    );
  }

  /* IN STOCK */
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-full w-fit">
      <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />
      En stock · Disponible en {store}
    </span>
  );
}
