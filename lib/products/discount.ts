type DiscountInput = {
  priceCurrent: number;
  priceOld: number | null | undefined;
  store: string;
};

const TRUSTED_STORE = /^(LG|El Corte Inglés|Fnac)$/i;

export function isTrustedStore(store: string): boolean {
  return TRUSTED_STORE.test(store) || store.toLowerCase().includes("corte ingl");
}

export function getRealDiscountPercent(offer: DiscountInput | null | undefined): number {
  if (!offer || offer.priceOld == null) return 0;
  if (offer.priceCurrent >= offer.priceOld) return 0;
  if (!isTrustedStore(offer.store) && offer.priceOld / offer.priceCurrent > 2.5) return 0;
  return Math.round((1 - offer.priceCurrent / offer.priceOld) * 100);
}

export function getSavingsAmount(offer: DiscountInput | null | undefined): number {
  if (!offer || offer.priceOld == null) return 0;
  if (offer.priceOld <= offer.priceCurrent) return 0;
  // Mismo saneo que getRealDiscountPercent: para tiendas no confiables con un
  // priceOld inverosímil (ratio > 2.5, p.ej. un PVPR inflado), no mostramos el
  // ahorro. Si no, la card ocultaba el badge "-X%" pero seguía pintando un
  // "Ahorras N €" enorme e incoherente.
  if (!isTrustedStore(offer.store) && offer.priceOld / offer.priceCurrent > 2.5) return 0;
  return offer.priceOld - offer.priceCurrent;
}
