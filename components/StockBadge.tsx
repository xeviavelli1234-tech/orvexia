"use client";

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

export function StockBadge({ inStock: _inStock, store, discountPercent }: Props) {
  void _inStock;

  const isPcComponentes = store.toLowerCase().includes("pccomponente");
  const inStockLabel = isPcComponentes
    ? `En stock - ${store}`
    : `En stock - Disponible en ${store}`;
  const discountLabel = isPcComponentes
    ? `En stock - Rebajado en ${store}`
    : `En stock - Precio rebajado en ${store}`;

  if (discountPercent && discountPercent > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-1 rounded-full w-fit max-w-full break-words">
        <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
        {discountLabel}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1 rounded-full w-fit max-w-full break-words">
      <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />
      {inStockLabel}
    </span>
  );
}
