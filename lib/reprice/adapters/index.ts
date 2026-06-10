import "server-only";
import { connectAmazonAdapter, type AmazonAccountConn } from "./amazon";
import type { ConnectResult } from "./types";

export * from "./types";

/**
 * Selecciona y conecta el adapter de marketplace para una cuenta.
 *
 * Hoy solo existe el canal Amazon (vía SP-API); las cuentas en modo `manual`
 * nunca llegan aquí (el runner las excluye). Cuando se añadan canales nuevos
 * —p. ej. un adapter Mirakl para Fnac/El Corte Inglés— este dispatcher elegirá
 * por el canal de la cuenta. El runner ya trabaja contra `MarketplaceAdapter`,
 * así que ese día no habrá que tocarlo.
 */
export function connectAdapter(account: AmazonAccountConn): ConnectResult {
  return connectAmazonAdapter(account);
}
