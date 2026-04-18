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
  updatedAt?: Date | string;
  externalUrl?: string;
  // kept for API compatibility but no longer used
  productId?: string;
}

function hoursAgo(d: Date | string): number {
  return Math.round((Date.now() - new Date(d).getTime()) / 36e5);
}

export function StockBadge({ inStock, store, category, discountPercent, updatedAt, externalUrl }: Props) {
  const verifiedLabel = updatedAt ? `Verificado hace ${hoursAgo(updatedAt)}h` : null;
  const isPcComponentes = store.toLowerCase().includes("pccomponente");
  const inStockLabel = isPcComponentes
    ? `En stock · ${store}`
    : `En stock · Disponible en ${store}`;
  const discountLabel = isPcComponentes
    ? `En stock · Rebajado en ${store}`
    : `En stock · Precio rebajado en ${store}`;

  /* OUT OF STOCK */
  if (!inStock) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1 rounded-full w-fit">
            <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
            Sin stock en {store}
          </span>
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-[#64748B] hover:text-[#2563EB] hover:underline font-medium"
            >
              Verificar en tienda &rarr;
            </a>
          )}
        </div>
        {verifiedLabel && (
          <span className="text-[10px] text-[#94A3B8] pl-1">{verifiedLabel}</span>
        )}
        {category && CATEGORY_SLUGS[category] && (
          <a
            href={`/categorias/${CATEGORY_SLUGS[category]}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-[#2563EB] hover:underline font-medium pl-1"
          >
            Ver alternativas &rarr;
          </a>
        )}
      </div>
    );
  }

  /* IN STOCK WITH ACTIVE DISCOUNT */
  if (discountPercent && discountPercent > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1 rounded-full w-fit whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
        {discountLabel}
      </span>
    );
  }

  /* IN STOCK */
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-full w-fit whitespace-nowrap">
      <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />
      {inStockLabel}
    </span>
  );
}
