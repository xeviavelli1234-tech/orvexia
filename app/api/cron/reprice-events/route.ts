import { NextRequest, NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/auth";
import { isSqsConfigured, receiveMessages, deleteMessages } from "@/lib/sqs";
import { parseAnyOfferChanged } from "@/lib/amazon/any-offer-changed";
import { messagesToDelete, type DrainMsg } from "@/lib/reprice/event-drain";
import { prisma } from "@/lib/prisma";
import { runRepricer } from "@/lib/reprice/runner";

export const maxDuration = 60;

/** Lotes de 10 que drenamos por invocación (máx. 50 mensajes/minuto). */
const MAX_BATCHES = 5;
/** Tope de cuentas reprecidas por invocación. */
const MAX_ACCOUNTS = 10;
/** Presupuesto de tiempo: corta antes de que Vercel mate la lambda (60 s). */
const DEADLINE_MS = 45_000;

/**
 * Cron de reprecio POR EVENTOS. Drena la cola SQS donde Amazon entrega
 * ANY_OFFER_CHANGED y dispara un reprecio inmediato (ignoreInterval) de cada
 * cuenta afectada — reusa runRepricer entero, sin tocar el motor.
 *
 * GATED: si no hay SQS configurado, no hace nada (la app sigue con el polling
 * de 5 min). Borrado selectivo: solo se borran los mensajes ya intentados o de
 * ruido; los de cuentas que mapearon pero no llegamos a procesar (cap/deadline)
 * se conservan y se reintentan en el siguiente drenado (sin pérdida).
 */
export async function GET(req: NextRequest) {
  const authErr = cronAuthError(req);
  if (authErr !== null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authErr });
  }
  if (!isSqsConfigured()) {
    return NextResponse.json({ ok: true, skipped: "sqs_not_configured" });
  }

  const now = new Date();
  const start = Date.now();
  const messages: DrainMsg[] = [];
  // sellerId → ASINs que cambiaron, para reprecir SOLO esos productos (no todo
  // el catálogo) por cada cuenta afectada.
  const asinsBySeller = new Map<string, Set<string>>();

  try {
    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      // Long-poll 1 s solo en el primer lote (recoge ráfagas sin gastar tiempo).
      const msgs = await receiveMessages(10, batch === 0 ? 1 : 0);
      if (msgs.length === 0) break;
      for (const m of msgs) {
        const change = parseAnyOfferChanged(m.body);
        const sellerId = change?.sellerId ?? null;
        messages.push({ receiptHandle: m.receiptHandle, sellerId });
        if (sellerId && change?.asin) {
          const set = asinsBySeller.get(sellerId) ?? new Set<string>();
          set.add(change.asin);
          asinsBySeller.set(sellerId, set);
        }
      }
    }
  } catch (e) {
    console.error("[reprice-events] receive failed:", e);
  }

  const wantedSellerIds = [
    ...new Set(messages.map((m) => m.sellerId).filter((s): s is string => !!s)),
  ];

  // sellerId → accountId (solo cuentas Amazon activas).
  const accountBySeller = new Map<string, string>();
  if (wantedSellerIds.length > 0) {
    const accounts = await prisma.sellerAccount.findMany({
      where: {
        amazonSellerId: { in: wantedSellerIds },
        active: true,
        mode: "amazon",
      },
      select: { id: true, amazonSellerId: true },
    });
    for (const a of accounts) accountBySeller.set(a.amazonSellerId, a.id);
  }
  const mappedSellerIds = new Set(accountBySeller.keys());
  const attemptedSellerIds = new Set<string>();

  // Reprecia cada cuenta afectada (1 vez), acotado por cap y por tiempo. Las
  // cuentas mapeadas pero NO intentadas conservan sus mensajes (reintento).
  let triggered = 0;
  for (const [sellerId, accountId] of accountBySeller) {
    if (attemptedSellerIds.size >= MAX_ACCOUNTS || Date.now() - start > DEADLINE_MS) {
      break;
    }
    attemptedSellerIds.add(sellerId);
    // Reprecio acotado a los ASIN del evento; si no llegó ningún ASIN, cae a
    // todo el catálogo (mejor reprecir de más que perder la reacción).
    const asins = [...(asinsBySeller.get(sellerId) ?? [])];
    try {
      await runRepricer(now, {
        accountId,
        ignoreInterval: true,
        asins: asins.length > 0 ? asins : undefined,
      });
      triggered += 1;
    } catch (e) {
      console.error("[reprice-events] reprice failed:", accountId, e);
    }
  }

  const toDelete = messagesToDelete(messages, mappedSellerIds, attemptedSellerIds);
  try {
    await deleteMessages(toDelete);
  } catch (e) {
    console.error("[reprice-events] delete failed:", e);
  }

  return NextResponse.json({
    ok: true,
    drained: messages.length,
    sellers: mappedSellerIds.size,
    accounts: triggered,
    deleted: toDelete.length,
    kept: messages.length - toDelete.length,
    ranAt: now.toISOString(),
  });
}
