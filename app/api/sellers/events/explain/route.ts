import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

/**
 * POST /api/sellers/events/explain
 * Body: { eventId: string }
 *
 * Devuelve narrativa humana del por qué se aplicó (o no) este cambio de
 * precio. Cacheado en EventExplanation para no pagar tokens dos veces.
 * Si no hay ANTHROPIC_API_KEY usa una explicación heurística decente.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let eventId: string;
  try {
    const b = await req.json();
    if (typeof b?.eventId !== "string") throw new Error("bad");
    eventId = b.eventId;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // ownership check
  const event = await prisma.repricingEvent.findFirst({
    where: {
      id: eventId,
      listing: { sellerAccount: { userId: session.userId } },
    },
    include: {
      listing: {
        select: {
          sku: true, title: true, currency: true, priceMin: true, priceMax: true,
          strategy: true, undercutType: true, undercutValue: true,
          cost: true, fbaFee: true, shippingCost: true, vatRate: true,
          feePercent: true, targetMargin: true, buyBoxStatus: true,
        },
      },
    },
  });
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Cache hit
  const cached = await prisma.eventExplanation.findUnique({ where: { eventId } });
  if (cached) {
    return NextResponse.json({ ok: true, narrative: cached.narrative, source: cached.source });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const heuristic = buildHeuristic(event);

  if (!apiKey) {
    const saved = await prisma.eventExplanation.create({
      data: { eventId, narrative: heuristic, source: "heuristic" },
    });
    return NextResponse.json({ ok: true, narrative: saved.narrative, source: "heuristic" });
  }

  // Llama a Claude para narrativa rica
  try {
    const model = process.env.ASSISTANT_MODEL ?? "claude-3-5-haiku-latest";
    const system = `Eres un analista senior de pricing. Recibes datos de UN cambio de precio y produces una EXPLICACIÓN BREVE (2-3 frases, español, profesional). Menciona el motivo concreto (Buy Box, mínimo, error...), el delta numérico y un consejo accionable si aplica. NO inventes datos.`;
    const userMessage = JSON.stringify(buildEventForModel(event), null, 2);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!r.ok) throw new Error(`anthropic_${r.status}`);
    const data = (await r.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim();
    const narrative = text || heuristic;
    const saved = await prisma.eventExplanation.create({
      data: {
        eventId,
        narrative,
        source: text ? "ai" : "heuristic",
        tokensIn: data.usage?.input_tokens ?? 0,
        tokensOut: data.usage?.output_tokens ?? 0,
      },
    });
    return NextResponse.json({ ok: true, narrative: saved.narrative, source: saved.source });
  } catch (e) {
    const saved = await prisma.eventExplanation.create({
      data: { eventId, narrative: heuristic, source: "heuristic" },
    });
    return NextResponse.json({
      ok: true,
      narrative: saved.narrative,
      source: "heuristic",
      hint: e instanceof Error ? e.message.slice(0, 80) : "",
    });
  }
}

interface EventLike {
  priceBefore: number;
  priceAfter: number;
  competitorPrice: number | null;
  reason: string;
  success: boolean;
  simulated: boolean;
  buyBox: "WON" | "LOST" | "UNKNOWN";
  errorMessage: string | null;
  listing: {
    sku: string;
    title: string;
    currency: string;
    priceMin: number | null;
    priceMax: number | null;
    strategy: string;
    cost: number | null;
    targetMargin: number | null;
    buyBoxStatus: "WON" | "LOST" | "UNKNOWN";
  } | null;
}

function buildEventForModel(e: EventLike) {
  return {
    sku: e.listing?.sku,
    product: e.listing?.title,
    price_before: e.priceBefore,
    price_after: e.priceAfter,
    delta: Math.round((e.priceAfter - e.priceBefore) * 100) / 100,
    delta_percent:
      e.priceBefore > 0 ? Math.round(((e.priceAfter - e.priceBefore) / e.priceBefore) * 10000) / 100 : null,
    currency: e.listing?.currency,
    reason: e.reason,
    success: e.success,
    simulated: e.simulated,
    buy_box: e.buyBox,
    competitor_price: e.competitorPrice ?? "no disponible",
    strategy: e.listing?.strategy,
    cost: e.listing?.cost ?? "no disponible",
    target_margin: e.listing?.targetMargin ?? "no disponible",
    price_min: e.listing?.priceMin ?? "no disponible",
    price_max: e.listing?.priceMax ?? "no disponible",
    error: e.errorMessage ?? null,
  };
}

function buildHeuristic(e: EventLike): string {
  if (!e.success) {
    if (e.reason === "throttled") {
      return "Amazon nos limitó las peticiones (rate-limit) y no se pudo aplicar este cambio. Se intentará en el siguiente ciclo.";
    }
    return `No se aplicó el cambio: ${e.errorMessage ?? "error desconocido"}.`;
  }
  const delta = Math.round((e.priceAfter - e.priceBefore) * 100) / 100;
  const dir = delta > 0 ? "subió" : delta < 0 ? "bajó" : "se mantuvo";
  const reason = ({
    buybox: "para ganar la Buy Box bajando del competidor más barato",
    match: "para igualar al competidor más barato",
    fixed: "porque la estrategia es Precio fijo",
    margin: "manteniendo el suelo de margen configurado",
    min_floor: "tocando el precio mínimo del rango",
    margin_floor: "tocando el suelo del margen",
    no_change: "sin cambios respecto al ciclo anterior",
    step_up: "subiendo un paso (modo sin competencia, step-up)",
  } as Record<string, string>)[e.reason] ?? `motivo: ${e.reason}`;
  return `El precio ${dir} ${Math.abs(delta).toFixed(2)} ${e.listing?.currency ?? "€"} ${reason}. Buy Box: ${e.buyBox.toLowerCase()}.`;
}
