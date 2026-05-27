/**
 * Tipos del centro de control de productos (grafo + inspector).
 *
 * Extraídos de ProductNetwork.tsx para que helpers y subcomponentes
 * puedan reutilizarlos sin importar el componente completo.
 */

export type Strategy =
  | "BUYBOX"
  | "BUYBOX_WINNER"
  | "MATCH"
  | "FIXED"
  | "MARGIN";

export type UndercutType = "AMOUNT" | "PERCENT";
export type NoComp = "MAX" | "HOLD" | "STEP_UP";
export type Fulfillment = "ANY" | "FBA" | "FBM";
export type BuyBox = "UNKNOWN" | "WON" | "LOST";

/** Estado visual del nodo en el grafo. */
export type State =
  | "noprice"
  | "paused"
  | "error"
  | "lost"
  | "floor"
  | "won"
  | "active";

export interface NetNode {
  id: string;
  title: string;
  asin: string;
  parentAsin: string;
  sku: string;
  imageUrl: string | null;
  /**
   * Origen del listing — se usa para agrupar los nodos por hub en el grafo.
   * "amazon" (vino de SP-API o demo) o "manual" (CSV de modo manual). Cada
   * valor distinto crea su propio hub (constelación) en el canvas.
   */
  source: string;
  priceCurrent: number;
  currency: string;
  priceMin: number | null;
  priceMax: number | null;
  repricingEnabled: boolean;
  tags: string;
  strategy: Strategy;
  undercutType: UndercutType;
  undercutValue: number;
  fixedPrice: number | null;
  cost: number | null;
  shippingCost: number | null;
  fbaFee: number | null;
  vatRate: number | null;
  feePercent: number | null;
  targetMargin: number | null;
  noCompetition: NoComp;
  useAccountDefaults: boolean;
  ignoreAmazon: boolean;
  fulfillmentFilter: Fulfillment;
  minSellerRating: number | null;
  excludeSellers: string;
  onlySellers: string;
  buyBoxStatus: BuyBox;
  buyBoxPrice: number | null;
  stepUpType: UndercutType;
  stepUpValue: number;
  lastReason: string | null;
  lastSuccess: boolean | null;
  /** Plan de precios cacheado (sólo aplica a productos del modo manual). */
  suggestedPrice: number | null;
  suggestedAt: string | null;
  suggestedConfidence: number | null;
  suggestedStrategy: string | null;
  suggestedReason: string | null;
}
