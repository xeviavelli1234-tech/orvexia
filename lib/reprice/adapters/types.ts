import type {
  CompetitionFilters,
  CompetitionResult,
} from "@/lib/reprice/competition";
import type { NormalizedListing } from "@/lib/amazon/listings";

/**
 * Frontera de marketplace para el repricer.
 *
 * El motor de decisión de precios (engine/competition/margin) es agnóstico:
 * solo necesita una lista de ofertas y devuelve un precio. Toda la E/S
 * específica de cada canal (Amazon SP-API hoy; Mirakl/Fnac/ECI el día de
 * mañana) vive detrás de esta interfaz, de modo que el runner no importe
 * `@/lib/amazon` directamente.
 *
 * Un `MarketplaceAdapter` representa una conexión YA establecida con la
 * tienda de UN vendedor (credenciales resueltas, cliente listo). Se obtiene
 * con `connectAdapter(account)`.
 */
export interface MarketplaceAdapter {
  /** Canal del marketplace: "amazon", "fnac", "eci", … */
  readonly channel: string;

  /**
   * true si el adapter opera en modo fixtures/demo: las lecturas devuelven
   * mocks deterministas y `applyPrice` es un no-op (no toca la tienda real).
   */
  readonly isFixture: boolean;

  /** Trae todo el catálogo del vendedor, ya normalizado. */
  fetchListings(): Promise<SyncedListing[]>;

  /** Ofertas de competencia para un producto + selección según filtros. */
  getCompetition(query: CompetitionQuery): Promise<CompetitionResult>;

  /** Aplica un precio nuevo a un listing del vendedor. */
  applyPrice(params: ApplyPriceParams): Promise<ApplyPriceResult>;
}

/**
 * Listing del vendedor tal y como lo devuelve la sincronización de catálogo.
 *
 * Por ahora reutiliza la forma de Amazon (`NormalizedListing`); cuando entren
 * más canales se generalizará aquí sin tocar a los consumidores.
 */
export type SyncedListing = NormalizedListing;

export interface CompetitionQuery {
  /** Identificador del producto en el canal (ASIN en Amazon). */
  productId: string;
  /** Precio actual del vendedor, base para el cálculo de competencia. */
  basePrice: number;
  /** Filtros de competencia (FBA/FBM, rating, listas, ignorar Amazon…). */
  filters: CompetitionFilters;
}

export interface ApplyPriceParams {
  sku: string;
  productType: string | null;
  newPrice: number;
  currency: string;
}

export interface ApplyPriceResult {
  applied: boolean;
  mode: "fixture" | "live";
}

/** Motivos por los que no se puede conectar el adapter de una cuenta. */
export type ConnectError = "token_undecryptable";

export type ConnectResult =
  | { ok: true; adapter: MarketplaceAdapter }
  | { ok: false; reason: ConnectError };
