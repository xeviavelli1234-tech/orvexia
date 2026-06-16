/**
 * Detección de Amazon RETAIL como vendedor — FUNCIÓN PURA, testeable.
 *
 * `getItemOffers` (v0) NO trae un flag "isAmazon", así que la única forma de
 * que el filtro "ignorar Amazon" funcione es reconocer a Amazon por su
 * SellerId de retail, que es distinto en cada marketplace.
 *
 * Estos IDs son conocidos y estables pero NO están oficialmente documentados y
 * pueden cambiar. Por eso el detector acepta IDs extra por entorno
 * (AMAZON_RETAIL_SELLER_IDS, separados por coma) para corregir o ampliar la
 * lista sin tocar código. Si no se reconoce, devuelve false → sin regresión
 * respecto al comportamiento anterior (que daba false a todo).
 */

import { MARKETPLACE_IDS } from "./endpoints";

/** SellerId de Amazon retail por marketplaceId. Best-known; override por env. */
export const AMAZON_RETAIL_SELLER_IDS: Record<string, string> = {
  [MARKETPLACE_IDS.ES]: "A1AT7YVPFBWXBL",
  [MARKETPLACE_IDS.DE]: "A3JWKAKR8XB7XF",
  [MARKETPLACE_IDS.FR]: "A1X6FK5RDHNB96",
  [MARKETPLACE_IDS.IT]: "A11IL2PNWYJU7H",
  [MARKETPLACE_IDS.UK]: "A3P5ROKL5A1OLE",
};

const norm = (s: string | undefined | null) => (s ?? "").trim().toUpperCase();

/**
 * ¿La oferta es de Amazon retail? true si el `sellerId` coincide con el ID
 * conocido del `marketplaceId` o con alguno de `extraIds` (override de entorno).
 * Sin sellerId → false (no podemos afirmarlo).
 */
export function isAmazonRetail(
  sellerId: string | undefined | null,
  marketplaceId: string | undefined | null,
  extraIds: string[] = [],
): boolean {
  const sid = norm(sellerId);
  if (!sid) return false;
  const known = norm(AMAZON_RETAIL_SELLER_IDS[norm(marketplaceId)]);
  if (known && sid === known) return true;
  return extraIds.map(norm).includes(sid);
}

/** Parsea la lista de override AMAZON_RETAIL_SELLER_IDS (CSV) a array limpio. */
export function parseAmazonRetailOverride(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
