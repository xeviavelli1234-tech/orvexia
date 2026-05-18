/**
 * Selección del precio de competencia — FUNCIÓN PURA, testeable.
 *
 * Aplica filtros (ignorar Amazon retail, FBA/FBM, valoración mínima del
 * vendedor) sobre la lista de ofertas y devuelve el precio del competidor
 * más barato que pasa los filtros, además de si NOSOTROS tenemos la Buy Box.
 */

export type FulfillmentFilter = "ANY" | "FBA" | "FBM";

export interface CompetitorOffer {
  sellerId?: string;
  price: number; // landed price (con envío)
  isAmazon: boolean; // oferta de Amazon retail
  isFba: boolean; // gestionado por Logística de Amazon
  rating: number | null; // valoración del vendedor 0..5 (null = desconocida)
  isBuyBoxWinner: boolean;
}

export interface CompetitionFilters {
  ignoreAmazon: boolean;
  fulfillment: FulfillmentFilter;
  minRating: number | null;
}

export interface CompetitionResult {
  /** Precio del competidor más barato tras filtros, o null si no hay. */
  price: number | null;
  /** WON si la Buy Box es nuestra, LOST si de otro, UNKNOWN si no hay datos. */
  buyBox: "WON" | "LOST" | "UNKNOWN";
}

export function selectCompetitor(
  offers: CompetitorOffer[],
  filters: CompetitionFilters,
  ourSellerId?: string,
): CompetitionResult {
  // Estado de Buy Box (independiente de los filtros de competencia).
  let buyBox: CompetitionResult["buyBox"] = "UNKNOWN";
  const bbWinner = offers.find((o) => o.isBuyBoxWinner);
  if (bbWinner) {
    buyBox =
      ourSellerId && bbWinner.sellerId === ourSellerId ? "WON" : "LOST";
  }

  const eligible = offers.filter((o) => {
    if (ourSellerId && o.sellerId === ourSellerId) return false; // nunca contra nosotros
    if (!Number.isFinite(o.price) || o.price <= 0) return false;
    if (filters.ignoreAmazon && o.isAmazon) return false;
    if (filters.fulfillment === "FBA" && !o.isFba) return false;
    if (filters.fulfillment === "FBM" && o.isFba) return false;
    if (filters.minRating != null) {
      if (o.rating == null || o.rating < filters.minRating) return false;
    }
    return true;
  });

  const price =
    eligible.length === 0
      ? null
      : Math.min(...eligible.map((o) => o.price));

  return { price, buyBox };
}
