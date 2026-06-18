import "server-only";
import type { SpApiClient } from "./client";
import { EU_MARKETPLACE_IDS, MARKETPLACE_IDS } from "./endpoints";

interface MarketplaceParticipationsResponse {
  payload?: Array<{
    marketplace?: { id?: string };
    participation?: { isParticipating?: boolean };
  }>;
}

/**
 * Marketplaces EU en los que el vendedor participa activamente, según
 * GET /sellers/v1/marketplaceParticipations. Devuelve solo los IDs EU que
 * soportamos (mismo endpoint sellingpartnerapi-eu), preservando el orden de
 * la API. Si la llamada falla o no participa en ninguno EU, devuelve [].
 *
 * Por qué importa: el sync de listings filtra del lado de Amazon por
 * marketplaceId; un vendedor publicado en .de/.fr/.it/.co.uk pero no en .es
 * recibía 0 productos porque la cuenta se creaba clavada en ES.
 */
export async function getSellerEuMarketplaces(client: SpApiClient): Promise<string[]> {
  const res = await client.get<MarketplaceParticipationsResponse>(
    "/sellers/v1/marketplaceParticipations",
  );
  return (res.payload ?? [])
    .filter((p) => p.participation?.isParticipating !== false)
    .map((p) => p.marketplace?.id)
    .filter((id): id is string => !!id && EU_MARKETPLACE_IDS.includes(id));
}

/**
 * Elige el marketplace principal del vendedor: prefiere España si participa
 * (mercado por defecto del producto), si no el primero EU disponible, y como
 * último recurso ES (default histórico, cuando la lista viene vacía).
 */
export function pickPrimaryMarketplace(euMarketplaces: string[]): string {
  if (euMarketplaces.includes(MARKETPLACE_IDS.ES)) return MARKETPLACE_IDS.ES;
  return euMarketplaces[0] ?? MARKETPLACE_IDS.ES;
}
