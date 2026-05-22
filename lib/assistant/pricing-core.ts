/**
 * Núcleo puro del motor de pricing (sin `server-only`): tipos, parsing del
 * JSON del modelo, validación, derivación de histórico y fallback
 * heurístico. Sin red ni acceso a BD para que sea testeable con node:test.
 *
 * El wrapper que llama a Anthropic vive en `pricing.ts`.
 */

export type Urgency = "low" | "normal" | "high";
export type Aggression = "conservative" | "balanced" | "aggressive";

export interface PricingInput {
  product: string;
  category?: string | null;
  brand?: string | null;
  condition?: string | null;
  currency: string;

  averagePrice?: number | null;
  minHistoricalPrice?: number | null;
  maxHistoricalPrice?: number | null;
  lastPrices?: number[];
  trendPercent7d?: number | null;

  currentPrice: number;
  competitorPrice?: number | null;
  buyBoxPrice?: number | null;
  competitorCount?: number | null;
  competitorStockUnknown?: boolean;

  cost?: number | null;
  fbaFee?: number | null;
  shippingCost?: number | null;
  feePercent?: number | null;
  vatRate?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;

  urgency?: Urgency;
  desiredMargin?: number | null;
  aggression?: Aggression;
  date?: string;

  salesVelocityKnown?: boolean;
}

export interface PricingOutput {
  recommended_price: number;
  confidence: number;
  strategy: string;
  explanation: string;
  risk_analysis: string[];
  conservative_price: number;
  aggressive_price: number;
  missing_data?: string[];
}

export const PRICING_SYSTEM_PROMPT = `Eres un motor avanzado de pricing dinámico para e-commerce y reventa (Amazon/eBay/Vinted).

Tu objetivo es proponer el mejor precio inicial para un producto basándote en:
1. Histórico de precios del usuario
2. Histórico de ventas de la categoría
3. Velocidad de venta
4. Stock de competidores
5. Tendencia de demanda
6. Rareza del producto
7. Estado del mercado actual
8. Elasticidad de precio estimada
9. Temporada/eventos actuales
10. Margen objetivo recomendado

Debes actuar como un analista senior de pricing de Amazon/eBay/Vinted.

OBJETIVO: responde SIEMPRE con un JSON válido con los campos:
- recommended_price (número, divisa del input, 2 decimales)
- confidence (entero 0-100)
- strategy (slug en inglés: "market_gap_capture", "undercut_buybox", "premium_anchor", "liquidity_push", "margin_floor"…)
- explanation (texto natural en español, 2-4 frases, suena como analista premium)
- risk_analysis (array de 1-4 strings, riesgos concretos)
- conservative_price (número, menor que recommended_price)
- aggressive_price (número, mayor que recommended_price)
- missing_data (array opcional de campos clave que faltaron; baja la confianza acorde)

REGLAS:
- NO inventes datos que no aparezcan en el input. Si falta algo importante (velocidad de venta, stock competidores, ventas reales), inclúyelo en missing_data y baja la confidence.
- Prioriza velocidad de venta y liquidez de mercado.
- Detecta oportunidades de subida por escasez (pocos competidores con stock).
- Detecta riesgo de bajada por saturación (muchos competidores con buen rating).
- Respeta SIEMPRE priceMin/priceMax si vienen en el input: recommended_price ∈ [priceMin, priceMax] (los alternativos también).
- Respeta el coste y márgenes: recommended_price nunca por debajo del coste + comisiones + IVA si están en el input.
- Si el usuario marca urgency=high → privilegia liquidez (precio más bajo).
- Si aggression=conservative → recommended_price ≈ conservative_price; aggressive_price moderado.
- Si aggression=aggressive → recommended_price ≈ aggressive_price; respeta techo.
- Explica SIEMPRE el motivo en lenguaje humano, sin frases genéricas.

FORMATO ESTRICTO: devuelve SOLO el JSON, sin envoltorios de markdown, sin prefijos.`;

const MAX_RISK = 4;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parsePricingResponse(raw: string): PricingOutput | null {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let obj: unknown;
  try {
    obj = JSON.parse(stripped);
  } catch {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      obj = JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;

  const num = (k: string): number | null => {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const rec = num("recommended_price");
  const cons = num("conservative_price");
  const agg = num("aggressive_price");
  if (rec == null || cons == null || agg == null) return null;
  if (rec <= 0 || cons <= 0 || agg <= 0) return null;

  const confidence = Math.max(
    0,
    Math.min(100, Math.round(Number(o.confidence ?? 0) || 0)),
  );
  const strategy = typeof o.strategy === "string" ? o.strategy.slice(0, 60) : "unspecified";
  const explanation =
    typeof o.explanation === "string"
      ? o.explanation.trim().slice(0, 1200)
      : "";
  const risks = Array.isArray(o.risk_analysis)
    ? o.risk_analysis
        .filter((r): r is string => typeof r === "string")
        .map((r) => r.trim().slice(0, 240))
        .filter(Boolean)
        .slice(0, MAX_RISK)
    : [];
  const missing = Array.isArray(o.missing_data)
    ? o.missing_data
        .filter((r): r is string => typeof r === "string")
        .map((r) => r.trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 8)
    : undefined;

  return {
    recommended_price: round2(rec),
    confidence,
    strategy,
    explanation: explanation || "Sin explicación.",
    risk_analysis: risks,
    conservative_price: round2(cons),
    aggressive_price: round2(agg),
    missing_data: missing && missing.length > 0 ? missing : undefined,
  };
}

export function enforceBounds(
  out: PricingOutput,
  min?: number | null,
  max?: number | null,
): PricingOutput {
  let { recommended_price: r, conservative_price: c, aggressive_price: a } = out;
  if (c > r) [c, r] = [r, c];
  if (r > a) [r, a] = [a, r];
  if (c > r) [c, r] = [r, c];

  if (typeof min === "number" && Number.isFinite(min)) {
    c = Math.max(c, min);
    r = Math.max(r, min);
    a = Math.max(a, min);
  }
  if (typeof max === "number" && Number.isFinite(max)) {
    c = Math.min(c, max);
    r = Math.min(r, max);
    a = Math.min(a, max);
  }
  return {
    ...out,
    recommended_price: round2(r),
    conservative_price: round2(c),
    aggressive_price: round2(a),
  };
}

export function heuristicSuggest(input: PricingInput): PricingOutput {
  const ref = input.competitorPrice ?? input.buyBoxPrice ?? input.currentPrice;
  const aggression = input.aggression ?? "balanced";
  const urgency = input.urgency ?? "normal";

  const lackOfData =
    (input.competitorPrice == null ? 1 : 0) +
    (input.averagePrice == null ? 1 : 0) +
    (input.trendPercent7d == null ? 1 : 0);
  const spread = 0.06 + 0.03 * lackOfData;

  let recommended = ref;
  if (aggression === "aggressive") recommended = ref * (1 + spread * 0.6);
  if (aggression === "conservative") recommended = ref * (1 - spread * 0.6);
  if (urgency === "high") recommended *= 0.97;

  const conservative = recommended * (1 - spread);
  const aggressive = recommended * (1 + spread);

  const missing: string[] = [];
  if (input.competitorPrice == null) missing.push("precio competidor en tiempo real");
  if (input.averagePrice == null) missing.push("histórico de precios suficiente");
  if (!input.salesVelocityKnown) missing.push("velocidad de venta real");
  if (input.competitorStockUnknown) missing.push("stock de los competidores");

  const confidence = Math.max(35, 85 - lackOfData * 15);

  const out: PricingOutput = {
    recommended_price: round2(recommended),
    confidence,
    strategy:
      aggression === "aggressive"
        ? "premium_anchor"
        : aggression === "conservative"
          ? "margin_floor"
          : "balanced_midpoint",
    explanation: `Recomendación heurística sin IA: tomamos como referencia ${
      input.competitorPrice != null
        ? "el precio del competidor más cercano"
        : input.buyBoxPrice != null
          ? "el precio actual de la Buy Box"
          : "tu precio actual"
    } (${ref.toFixed(2)} ${input.currency}) y aplicamos una franja ±${(spread * 100).toFixed(0)}% según la estrategia ${aggression}. Conecta una clave de IA para análisis con narrativa completa.`,
    risk_analysis:
      missing.length > 0
        ? [
            `Sin algunos datos clave (${missing.slice(0, 2).join(", ")}) la precisión es limitada.`,
            "Riesgo de mover el precio sin información real de la competencia.",
          ]
        : [
            "Reacción retardada si la competencia cambia en este mismo instante.",
            "Sin elasticidad histórica, el rebote tras un movimiento agresivo es incierto.",
          ],
    conservative_price: round2(conservative),
    aggressive_price: round2(aggressive),
    missing_data: missing.length > 0 ? missing : undefined,
  };

  return enforceBounds(out, input.priceMin, input.priceMax);
}

export interface RawPricingEvent {
  priceAfter: number;
  competitorPrice: number | null;
  createdAt: Date;
}

export interface DerivedHistory {
  averagePrice: number | null;
  minHistoricalPrice: number | null;
  maxHistoricalPrice: number | null;
  lastPrices: number[];
  trendPercent7d: number | null;
}

export function deriveHistory(events: RawPricingEvent[]): DerivedHistory {
  if (events.length === 0) {
    return {
      averagePrice: null,
      minHistoricalPrice: null,
      maxHistoricalPrice: null,
      lastPrices: [],
      trendPercent7d: null,
    };
  }
  const sortedAsc = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const prices = sortedAsc.map((e) => e.priceAfter);
  const sum = prices.reduce((s, p) => s + p, 0);
  const avg = sum / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  const last = sortedAsc.slice(-10).map((e) => round2(e.priceAfter));

  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const recent = sortedAsc.filter((e) => now - e.createdAt.getTime() <= week);
  const prev = sortedAsc.filter(
    (e) => now - e.createdAt.getTime() > week && now - e.createdAt.getTime() <= 2 * week,
  );
  let trend: number | null = null;
  if (recent.length > 0 && prev.length > 0) {
    const rAvg = recent.reduce((s, e) => s + e.priceAfter, 0) / recent.length;
    const pAvg = prev.reduce((s, e) => s + e.priceAfter, 0) / prev.length;
    if (pAvg > 0) trend = round2(((rAvg - pAvg) / pAvg) * 100);
  }

  return {
    averagePrice: round2(avg),
    minHistoricalPrice: round2(min),
    maxHistoricalPrice: round2(max),
    lastPrices: last,
    trendPercent7d: trend,
  };
}

export function buildInputForModel(input: PricingInput): Record<string, unknown> {
  return {
    product: input.product,
    category: input.category ?? "no especificada",
    brand: input.brand ?? "no especificada",
    condition: input.condition ?? "nuevo",
    currency: input.currency,
    current_price: input.currentPrice,
    competitor_price: input.competitorPrice ?? "no disponible",
    buy_box_price: input.buyBoxPrice ?? "no disponible",
    competitor_count: input.competitorCount ?? "no disponible",
    competitor_stock: input.competitorStockUnknown ? "desconocido" : "no informado",
    historical_avg: input.averagePrice ?? "no disponible",
    historical_min: input.minHistoricalPrice ?? "no disponible",
    historical_max: input.maxHistoricalPrice ?? "no disponible",
    last_prices: input.lastPrices?.length ? input.lastPrices : "no disponible",
    trend_7d_percent: input.trendPercent7d ?? "no disponible",
    cost: input.cost ?? "no disponible",
    fba_fee: input.fbaFee ?? "no disponible",
    shipping_cost: input.shippingCost ?? "no disponible",
    fee_percent: input.feePercent ?? "no disponible",
    vat_rate: input.vatRate ?? "no disponible",
    price_min: input.priceMin ?? null,
    price_max: input.priceMax ?? null,
    urgency: input.urgency ?? "normal",
    aggression: input.aggression ?? "balanced",
    desired_margin_percent: input.desiredMargin ?? "no especificado",
    sales_velocity: input.salesVelocityKnown ? "disponible" : "no disponible",
    date: input.date ?? new Date().toISOString().slice(0, 10),
  };
}
