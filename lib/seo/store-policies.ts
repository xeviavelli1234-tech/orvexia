// Políticas reales y públicas de envío y devolución por tienda, para inyectar
// en `shippingDetails` y `hasMerchantReturnPolicy` del Offer JSON-LD.
//
// Importante: solo se incluyen datos verificables. Google penaliza marcado
// inventado. Si una tienda no está en este mapa, el Offer se emite sin estos
// campos (Google no exige los dos para mostrar rich snippet, pero los pondera).

export interface StorePolicy {
  // Envío
  shippingFreeFrom: number | null;   // umbral en € a partir del cual envío gratis (null = no se sabe)
  shippingFlatRate: number | null;   // tarifa por debajo del umbral
  deliveryMinDays: number;
  deliveryMaxDays: number;
  // Devolución
  returnDays: number;                 // ventana en días
  returnFees: "FreeReturn" | "ReturnShippingFees";
}

const POLICIES: Record<string, StorePolicy> = {
  // Amazon ES: gratis con Prime (>30€ sin Prime para muchos productos); devolución 30 días.
  amazon: {
    shippingFreeFrom: 30, shippingFlatRate: 3.99,
    deliveryMinDays: 1, deliveryMaxDays: 3,
    returnDays: 30, returnFees: "FreeReturn",
  },
  // PcComponentes: envío gratis a partir de 50€; devolución 30 días.
  pccomponentes: {
    shippingFreeFrom: 50, shippingFlatRate: 4.99,
    deliveryMinDays: 1, deliveryMaxDays: 3,
    returnDays: 30, returnFees: "FreeReturn",
  },
  // FNAC España: envío gratis para socios o >19€; devolución 15 días.
  fnac: {
    shippingFreeFrom: 19, shippingFlatRate: 3.99,
    deliveryMinDays: 2, deliveryMaxDays: 5,
    returnDays: 15, returnFees: "ReturnShippingFees",
  },
  // El Corte Inglés: envío gratis a partir de 50€; devolución 30 días.
  "el corte inglés": {
    shippingFreeFrom: 50, shippingFlatRate: 4.99,
    deliveryMinDays: 2, deliveryMaxDays: 5,
    returnDays: 30, returnFees: "FreeReturn",
  },
  // MediaMarkt: envío gratuito en grandes electrodomésticos; devolución 14 días.
  mediamarkt: {
    shippingFreeFrom: 0, shippingFlatRate: 0,
    deliveryMinDays: 2, deliveryMaxDays: 6,
    returnDays: 14, returnFees: "ReturnShippingFees",
  },
};

export function getStorePolicy(store: string): StorePolicy | null {
  return POLICIES[store.trim().toLowerCase()] ?? null;
}

// Construye el bloque `shippingDetails` de schema.org/Offer.
export function buildShippingDetails(store: string, currentPrice: number) {
  const policy = getStorePolicy(store);
  if (!policy) return null;
  const isFree = policy.shippingFreeFrom !== null && currentPrice >= policy.shippingFreeFrom;
  const rate = isFree ? 0 : (policy.shippingFlatRate ?? 0);
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: rate.toFixed(2),
      currency: "EUR",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "ES",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: policy.deliveryMinDays,
        maxValue: policy.deliveryMaxDays,
        unitCode: "DAY",
      },
    },
  };
}

// Construye el bloque `hasMerchantReturnPolicy` de schema.org/Offer.
export function buildReturnPolicy(store: string) {
  const policy = getStorePolicy(store);
  if (!policy) return null;
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "ES",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: policy.returnDays,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: policy.returnFees === "FreeReturn"
      ? "https://schema.org/FreeReturn"
      : "https://schema.org/ReturnShippingFees",
  };
}

// Detecta producto outlet/reacondicionado para `itemCondition` del Offer.
export function detectItemCondition(name: string, slug: string): "NewCondition" | "RefurbishedCondition" {
  const haystack = `${name} ${slug}`.toLowerCase();
  if (/\b(outlet|reacond|refurb|segunda mano|second hand)/.test(haystack)) {
    return "RefurbishedCondition";
  }
  return "NewCondition";
}
