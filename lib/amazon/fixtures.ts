import "server-only";

/**
 * Modo fixtures: permite que TODO el flujo (sync, reprecio, dashboards)
 * funcione end-to-end SIN depender de Amazon real, mientras la verificación
 * de identidad de developer está pendiente.
 *
 * Se activa cuando SP_API_ENV !== "production".
 *
 * La lógica está en lib/amazon/fixtures-core.ts (sin server-only) para que
 * sea testeable en Node. Este archivo solo re-exporta y añade la guarda
 * server-only que evita que el bundle de cliente toque estos datos.
 */

export {
  isFixtureMode,
  getFixtureCompetitivePrice,
  getFixtureOffers,
  FIXTURE_LISTINGS,
  type FixtureOffer,
} from "./fixtures-core";
