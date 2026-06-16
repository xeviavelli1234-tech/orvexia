/**
 * Parser PURO de notificaciones ANY_OFFER_CHANGED de SP-API (entregadas vía
 * SQS). Sin server-only ni I/O → 100% testeable. Tolera el envoltorio SNS por
 * si la cola está detrás de un topic.
 */

export interface OfferChange {
  sellerId: string | null;
  marketplaceId: string | null;
  asin: string | null;
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object"
    ? (v as Record<string, unknown>)
    : null;
}

function asStr(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/**
 * Extrae (sellerId, marketplaceId, asin) de un mensaje. Devuelve null si el
 * body no es JSON parseable o no es un ANY_OFFER_CHANGED.
 */
export function parseAnyOfferChanged(body: string): OfferChange | null {
  let root: unknown;
  try {
    root = JSON.parse(body);
  } catch {
    return null;
  }

  let obj = asObj(root);
  if (!obj) return null;

  // Envoltorio SNS: { Type: "Notification", Message: "<json string>" }.
  if (obj.Type === "Notification" && typeof obj.Message === "string") {
    try {
      obj = asObj(JSON.parse(obj.Message));
    } catch {
      return null;
    }
    if (!obj) return null;
  }

  const type = asStr(obj.notificationType) ?? asStr(obj.NotificationType);
  if (type !== "ANY_OFFER_CHANGED") return null;

  const payload = asObj(obj.payload) ?? asObj(obj.Payload);
  const notif = asObj(payload?.AnyOfferChangedNotification);
  const trigger = asObj(notif?.OfferChangeTrigger);

  return {
    sellerId: asStr(notif?.SellerId),
    marketplaceId: asStr(trigger?.MarketplaceId),
    asin: asStr(trigger?.ASIN),
  };
}
