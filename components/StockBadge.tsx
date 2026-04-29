"use client";

interface Props {
  inStock: boolean;
  store: string;
  category?: string;
  discountPercent?: number | null;
  updatedAt?: Date | string;
  externalUrl?: string;
  productName?: string;
  // kept for API compatibility but no longer used
  productId?: string;
}

// Lista cerrada de modelos ECI marcados como agotados a mano por el usuario.
// El badge AGOTADO se muestra ÚNICAMENTE si el nombre del producto contiene
// uno de estos códigos Y la oferta es de El Corte Inglés. Independiente del
// campo inStock de la BD para evitar que un scraping antiguo "contagie" el
// badge a otros productos.
const ECI_SOLD_OUT_MODELS = [
  "WAN28287ES",
  "LFE6G54H4B",
  "WUU28T66ES",
  "WUU28T8XES",
  "WGH244A0ES",
  "THASNQ286TM5-S",
  "LFR6114O4B",
  "WG44H2A0ES",
  "3TS3106B",
  "RB53DG706AS9EF",
  "RB34C775CS9",
  "KGN392LAG",
  "KGN392WCF",
  "HDPW7620ANPK",
  "RB38C776CS9",
  "GBV7280AMB",
  // Lavavajillas ECI agotados (capturas 2026-04-28)
  "FFB76717PM",
  "6B0S3FSB",
  "3VH6330SA",
  "MID60S110",
  "FFB64627ZW",
  "6B2S3PSX",
  "SPS4EMW61E",
  "4A4M3PB",
];

// Misma lógica para Amazon: marcamos modelos sin stock vistos en captura.
const AMAZON_SOLD_OUT_MODELS = [
  "CNCQ2T518EG",
  "Aguazero 6620 Inox",
];

// Misma lógica para Fnac.
const FNAC_SOLD_OUT_MODELS = [
  "FFB 10469", // Whirlpool FFB 10469 BV SPT 10kg 1400rpm
  "3KFE561MI", // Frigorífico Combi Balay 3KFE561MI Inox A++
  "MF1070",    // Frigorífico DCG Eltronic MF1070
];

function isManualEciSoldOut(productName: string | undefined, store: string): boolean {
  if (!productName) return false;
  if (!/corte\s*ingl[eé]s|elcorteingles|\beci\b/i.test(store)) return false;
  const upper = productName.toUpperCase();
  return ECI_SOLD_OUT_MODELS.some((m) => upper.includes(m));
}

function isManualAmazonSoldOut(productName: string | undefined, store: string): boolean {
  if (!productName) return false;
  if (!/amazon/i.test(store)) return false;
  const upper = productName.toUpperCase();
  return AMAZON_SOLD_OUT_MODELS.some((m) => upper.includes(m));
}

function isManualFnacSoldOut(productName: string | undefined, store: string): boolean {
  if (!productName) return false;
  if (!/fnac/i.test(store)) return false;
  const upper = productName.toUpperCase();
  return FNAC_SOLD_OUT_MODELS.some((m) => upper.includes(m.toUpperCase()));
}

export function StockBadge({ inStock, store, discountPercent, productName }: Props) {
  // 1) Listas manuales (override por nombre de modelo en stores donde el dato
  //    de BD aún no es fiable o ha sido detectado a mano por capturas).
  if (
    isManualEciSoldOut(productName, store) ||
    isManualAmazonSoldOut(productName, store) ||
    isManualFnacSoldOut(productName, store)
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1 rounded-full w-fit max-w-full break-words uppercase tracking-wide">
        <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
        Agotado en {store}
      </span>
    );
  }

  // 2) Dato real de BD (alimentado por el feed de Awin para ECI/Fnac
  //    y por el scraper para Amazon/PcComponentes).
  if (inStock === false) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1 rounded-full w-fit max-w-full break-words uppercase tracking-wide">
        <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
        Agotado en {store}
      </span>
    );
  }

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
