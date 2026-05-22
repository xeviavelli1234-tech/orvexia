import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

/**
 * POST /api/sellers/events/explain
 * Body: { eventId: string }
 *
 * Devuelve narrativa humana del por qué se aplicó (o no) este cambio de
 * precio. Cacheado en EventExplanation. Generación 100% local mediante
 * heurística determinística — sin servicios cloud.
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

  const narrative = buildHeuristic(event);
  const saved = await prisma.eventExplanation.create({
    data: { eventId, narrative, source: "heuristic" },
  });
  return NextResponse.json({ ok: true, narrative: saved.narrative, source: "heuristic" });
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
