import { NextResponse } from "next/server";
import { readRequestMeta } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import {
  heuristicSuggest,
  type PricingInput,
  type Aggression,
} from "@/lib/assistant/pricing-core";

export const maxDuration = 10;

const AGGRESSIONS: Aggression[] = ["conservative", "balanced", "aggressive"];

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * POST /api/repricer/simular  (PÚBLICO, sin login)
 * Demo del motor de precios para tráfico frío: el visitante introduce coste,
 * precio actual y de competencia, y obtiene el precio recomendado con la misma
 * heurística determinista que usa el producto en modo manual/CSV.
 *
 * Body: { product?, currency?, cost?, currentPrice (req), competitorPrice?,
 *         priceMin?, priceMax?, aggression? }
 */
export async function POST(req: Request) {
  const meta = readRequestMeta(req);
  if (rateLimit("repricer-simular", meta.ip ?? "anon", 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const currentPrice = num(body.currentPrice);
  if (currentPrice == null || currentPrice <= 0) {
    return NextResponse.json({ error: "current_price_required" }, { status: 400 });
  }

  const aggression = AGGRESSIONS.includes(body.aggression as Aggression)
    ? (body.aggression as Aggression)
    : "balanced";
  const currency =
    typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().slice(0, 4).toUpperCase()
      : "EUR";
  const product =
    typeof body.product === "string" && body.product.trim()
      ? body.product.trim().slice(0, 120)
      : "Tu producto";

  const input: PricingInput = {
    product,
    currency,
    currentPrice,
    competitorPrice: num(body.competitorPrice),
    cost: num(body.cost),
    priceMin: num(body.priceMin),
    priceMax: num(body.priceMax),
    aggression,
    salesVelocityKnown: false,
    competitorStockUnknown: true,
  };

  const out = heuristicSuggest(input);
  return NextResponse.json(out);
}
