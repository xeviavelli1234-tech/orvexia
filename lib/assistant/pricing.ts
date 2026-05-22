import "server-only";

import {
  PRICING_SYSTEM_PROMPT,
  buildInputForModel,
  enforceBounds,
  heuristicSuggest,
  parsePricingResponse,
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
 * Llama al modelo (Anthropic) con el system prompt del analista. Si no hay
 * API key o falla la petición/parseo, devuelve la sugerencia heurística
 * (fallback útil en lugar de error).
 */
export async function suggestPrice(input: PricingInput): Promise<PricingOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return heuristicSuggest(input);

  const model = process.env.ASSISTANT_MODEL ?? "claude-3-5-haiku-latest";
  const userMessage = JSON.stringify(buildInputForModel(input), null, 2);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system: PRICING_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!r.ok) return heuristicSuggest(input);
    const data = (await r.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n");
    const parsed = parsePricingResponse(text);
    if (!parsed) return heuristicSuggest(input);
    return enforceBounds(parsed, input.priceMin, input.priceMax);
  } catch {
    return heuristicSuggest(input);
  }
}
