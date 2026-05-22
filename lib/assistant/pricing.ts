import "server-only";

import {
  enforceBounds,
  heuristicSuggest,
  type PricingInput,
  type PricingOutput,
} from "./pricing-core";

// Re-exports para consumidores (endpoint, server actions):
export {
  PRICING_SYSTEM_PROMPT,
  enforceBounds,
  heuristicSuggest,
  parsePricingResponse,
  deriveHistory,
} from "./pricing-core";
export type {
  PricingInput,
  PricingOutput,
  Urgency,
  Aggression,
  RawPricingEvent,
  DerivedHistory,
} from "./pricing-core";

/**
 * Sugerencia de precio 100% local: heurística determinística sin llamadas
 * externas. Anteriormente este wrapper invocaba a Anthropic con fallback
 * a la heurística; ahora la heurística es la única fuente. La eliminación
 * del LLM externo evita coste, latencia y dependencia de cloud.
 */
export async function suggestPrice(input: PricingInput): Promise<PricingOutput> {
  const raw = heuristicSuggest(input);
  return enforceBounds(raw, input.priceMin, input.priceMax);
}
