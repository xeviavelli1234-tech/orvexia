/**
 * Lógica PURA del drenado de eventos ANY_OFFER_CHANGED — testeable sin SQS.
 *
 * Decide qué mensajes borrar de la cola tras un ciclo, de forma que NUNCA se
 * pierda el evento de una cuenta que no llegamos a reprecir (cap/deadline):
 *  - sin sellerId, o sellerId que NO mapea a ninguna cuenta → ruido → borrar.
 *  - sellerId de una cuenta que SÍ intentamos reprecir → borrar (hecho; y si
 *    falló, el cron de 5 min es la red de seguridad).
 *  - sellerId de una cuenta que mapeó pero NO se intentó (cortó el cap o el
 *    tiempo) → CONSERVAR: reaparece tras el visibility timeout y se procesa en
 *    el siguiente drenado, sin esperar al poll de 5 min.
 */

export interface DrainMsg {
  receiptHandle: string;
  sellerId: string | null;
}

export function messagesToDelete(
  messages: DrainMsg[],
  mappedSellerIds: Set<string>,
  attemptedSellerIds: Set<string>,
): DrainMsg[] {
  return messages.filter(
    (m) =>
      !m.sellerId ||
      !mappedSellerIds.has(m.sellerId) ||
      attemptedSellerIds.has(m.sellerId),
  );
}
