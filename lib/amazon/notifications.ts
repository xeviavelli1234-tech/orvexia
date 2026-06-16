import "server-only";
import type { SpApiClient } from "./client";
import { getGrantlessToken } from "./lwa";
import { getSpApiBaseUrl } from "./endpoints";
import { SpApiError } from "./types";

/**
 * SP-API Notifications API.
 *
 *  - Destinos (createDestination/getDestinations) son operaciones GRANTLESS
 *    (token client_credentials, scope notifications). Se hacen UNA vez a nivel
 *    de app: registran nuestra cola SQS como destino.
 *  - Suscripciones (createSubscription) son POR VENDEDOR: usan el token del
 *    refresh token del vendedor (vía SpApiClient) y apuntan a ese destino.
 */

const NOTIF_SCOPE = "sellingpartnerapi::notifications";
export const ANY_OFFER_CHANGED = "ANY_OFFER_CHANGED";

interface DestinationDto {
  destinationId: string;
  name?: string;
  resource?: { sqs?: { arn?: string } };
}

/**
 * Registra (idempotente) la cola SQS como destino de notificaciones y devuelve
 * su destinationId. Si ya existe un destino con el mismo ARN, lo reutiliza.
 */
export async function ensureDestination(
  name: string,
  sqsArn: string,
): Promise<string> {
  const token = await getGrantlessToken(NOTIF_SCOPE);
  const base = getSpApiBaseUrl("production");
  const headers = {
    "x-amz-access-token": token,
    "Content-Type": "application/json",
  };

  // 1) ¿Ya existe uno con este ARN? Si el listado falla (throttle/5xx) NO
  // seguimos a crear: lanzar evita registrar un destino duplicado por un
  // fallo transitorio del GET.
  const listRes = await fetch(`${base}/notifications/v1/destinations`, {
    headers,
  });
  if (!listRes.ok) {
    throw new Error(
      `getDestinations ${listRes.status}: ${await listRes.text()}`,
    );
  }
  const data = (await listRes.json()) as { payload?: DestinationDto[] };
  const found = data.payload?.find((d) => d.resource?.sqs?.arn === sqsArn);
  if (found) return found.destinationId;

  // 2) Crear.
  const createRes = await fetch(`${base}/notifications/v1/destinations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      resourceSpecification: { sqs: { arn: sqsArn } },
    }),
  });
  if (!createRes.ok) {
    throw new Error(
      `createDestination ${createRes.status}: ${await createRes.text()}`,
    );
  }
  const created = (await createRes.json()) as {
    payload?: { destinationId?: string };
  };
  const id = created.payload?.destinationId;
  if (!id) throw new Error("createDestination: respuesta sin destinationId");
  return id;
}

/**
 * Suscribe al vendedor (token de `client`) a ANY_OFFER_CHANGED contra el
 * destino dado. Idempotente: si ya existe, Amazon responde 409 y lo damos por
 * bueno. Devuelve el subscriptionId si lo crea, o null si ya existía.
 */
export async function ensureAnyOfferChangedSubscription(
  client: SpApiClient,
  destinationId: string,
): Promise<string | null> {
  try {
    const res = await client.post<{ payload?: { subscriptionId?: string } }>(
      `/notifications/v1/subscriptions/${ANY_OFFER_CHANGED}`,
      { payloadVersion: "1.0", destinationId },
    );
    return res.payload?.subscriptionId ?? null;
  } catch (e) {
    if (e instanceof SpApiError && e.status === 409) return null; // ya existía
    throw e;
  }
}

/** Borra una suscripción (cleanup al desconectar). Best-effort. */
export async function deleteAnyOfferChangedSubscription(
  client: SpApiClient,
  subscriptionId: string,
): Promise<void> {
  await client.delete(
    `/notifications/v1/subscriptions/${ANY_OFFER_CHANGED}/${encodeURIComponent(subscriptionId)}`,
  );
}
