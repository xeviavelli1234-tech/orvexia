import "server-only";
import { decryptToken } from "@/lib/crypto";
import { SpApiClient } from "@/lib/amazon/client";
import { getCompetition, patchListingPrice } from "@/lib/amazon/pricing";
import { fetchAllListings } from "@/lib/amazon/listings";
import { isFixtureMode } from "@/lib/amazon/fixtures";
import type {
  ApplyPriceParams,
  ApplyPriceResult,
  CompetitionQuery,
  ConnectResult,
  MarketplaceAdapter,
  SyncedListing,
} from "./types";

type SpApiEnv = "sandbox" | "production";

/** Campos de `SellerAccount` que necesita el adapter de Amazon. */
export interface AmazonAccountConn {
  amazonSellerId: string;
  marketplaceId: string;
  spApiEnv: string;
  refreshToken: string;
}

/**
 * Adapter de Amazon SP-API. Envuelve la E/S que vivía suelta en el runner
 * (`getCompetition`, `patchListingPrice`, `fetchAllListings`) detrás de la
 * interfaz `MarketplaceAdapter`, sin cambiar su comportamiento.
 */
class AmazonAdapter implements MarketplaceAdapter {
  readonly channel = "amazon";
  readonly isFixture: boolean;

  private readonly client: SpApiClient;
  private readonly ctx: {
    client: SpApiClient;
    spApiEnv: string;
    marketplaceId: string;
  };
  private readonly amazonSellerId: string;
  private readonly marketplaceId: string;
  private readonly spApiEnv: string;

  constructor(account: AmazonAccountConn, refreshToken: string) {
    this.isFixture = isFixtureMode(account.spApiEnv);
    this.amazonSellerId = account.amazonSellerId;
    this.marketplaceId = account.marketplaceId;
    this.spApiEnv = account.spApiEnv;
    this.client = new SpApiClient(refreshToken, account.spApiEnv as SpApiEnv);
    this.ctx = {
      client: this.client,
      spApiEnv: account.spApiEnv,
      marketplaceId: account.marketplaceId,
    };
  }

  fetchListings(): Promise<SyncedListing[]> {
    return fetchAllListings({
      client: this.client,
      amazonSellerId: this.amazonSellerId,
      marketplaceId: this.marketplaceId,
      spApiEnv: this.spApiEnv,
    });
  }

  getCompetition(query: CompetitionQuery) {
    return getCompetition(
      this.ctx,
      query.productId,
      query.basePrice,
      query.filters,
      this.amazonSellerId,
    );
  }

  applyPrice(params: ApplyPriceParams): Promise<ApplyPriceResult> {
    return patchListingPrice(this.ctx, {
      amazonSellerId: this.amazonSellerId,
      sku: params.sku,
      productType: params.productType,
      newPrice: params.newPrice,
      currency: params.currency,
    });
  }
}

/**
 * Conecta un adapter de Amazon para una cuenta, resolviendo el descifrado del
 * refresh token y el modo fixtures (misma lógica que tenía el runner inline).
 *
 * Devuelve `{ ok: false, reason: "token_undecryptable" }` cuando el token no
 * se puede descifrar en una cuenta REAL (p. ej. cambió `ENCRYPTION_KEY`): el
 * llamador debe pedir reconectar en lugar de mandar un token basura a Amazon
 * (que provocaría spam de `invalid_grant`). En cuentas de fixtures el fallo
 * de descifrado se degrada a `FIXTURE_NO_TOKEN`.
 */
export function connectAmazonAdapter(account: AmazonAccountConn): ConnectResult {
  const isFixtureAcc = isFixtureMode(account.spApiEnv);
  let refreshToken: string;
  if (account.refreshToken === "FIXTURE_NO_TOKEN") {
    refreshToken = "FIXTURE_NO_TOKEN";
  } else {
    try {
      refreshToken = decryptToken(account.refreshToken);
    } catch {
      if (isFixtureAcc) {
        refreshToken = "FIXTURE_NO_TOKEN";
      } else {
        return { ok: false, reason: "token_undecryptable" };
      }
    }
  }
  return { ok: true, adapter: new AmazonAdapter(account, refreshToken) };
}
