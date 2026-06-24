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
 * Lee la suscripción ANY_OFFER_CHANGED existente del vendedor (token de
 * `client`) y devuelve su subscriptionId, o null si no hay ninguna. Se usa
 * para recuperar el id cuando la suscripción ya existía (409) y así poder
 * cancelarla más tarde al desconectar.
 */
export async function getAnyOfferChangedSubscriptionId(
  client: SpApiClient,
): Promise<string | null> {
  try {
    const res = await client.get<{ payload?: { subscriptionId?: string } }>(
      `/notifications/v1/subscriptions/${ANY_OFFER_CHANGED}`,
      { payloadVersion: "1.0" },
    );
    return res.payload?.subscriptionId ?? null;
  } catch (e) {
    // 404 = sin suscripción para ese tipo. Cualquier otro error: no lo tenemos.
    if (e instanceof SpApiError && e.status === 404) return null;
    throw e;
  }
}

/**
 * Suscribe al vendedor (token de `client`) a ANY_OFFER_CHANGED contra el
 * destino dado. Idempotente: si ya existe, Amazon responde 409 y recuperamos
 * el subscriptionId vigente con un GET. Devuelve el subscriptionId (recién
 * creado o ya existente) para poder persistirlo y cancelarlo al desconectar,
 * o null si Amazon no lo expone.
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
    // Ya existía: recuperamos su id para poder cancelarla en el futuro. Si el
    // GET de respaldo falla, devolvemos null (no rompemos la conexión por esto).
    if (e instanceof SpApiError && e.status === 409) {
      return getAnyOfferChangedSubscriptionId(client).catch(() => null);
    }
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

/**
 * Cancela (best-effort) la suscripción ANY_OFFER_CHANGED de una cuenta al
 * desconectar o borrar. Nunca lanza: una limpieza fallida no debe bloquear la
 * desconexión ni el borrado RGPD (el `event-drain` ya descarta eventos de
 * cuentas inactivas, así que un huérfano residual es inocuo, solo ruido).
 *
 * Resuelve el subscriptionId persistido o, si falta (conexiones antiguas), lo
 * recupera en vivo con un GET. Se salta cuentas sin token real (demo/manual) o
 * fuera de producción: ahí no hay suscripción que borrar.
 */
export async function cancelSellerAnyOfferChangedSubscription(account: {
  refreshToken: string;
  spApiEnv: string;
  notifSubscriptionId: string | null;
}): Promise<void> {
  // Sin destino configurado no se llegó a suscribir nada en producción.
  if (!process.env.SP_API_NOTIF_DESTINATION_ID) return;
  if (account.spApiEnv !== "production") return;
  // Tokens placeholder/borrados (demo, manual o ya desconectada): nada que hacer.
  const NON_TOKENS = new Set([
    "FIXTURE_NO_TOKEN",
    "MANUAL_NO_TOKEN",
    "DISCONNECTED",
  ]);
  if (!account.refreshToken || NON_TOKENS.has(account.refreshToken)) return;

  try {
    const { SpApiClient } = await import("./client");
    const { decryptToken } = await import("@/lib/crypto");
    const client = new SpApiClient(decryptToken(account.refreshToken), "production");
    const subId =
      account.notifSubscriptionId ??
      (await getAnyOfferChangedSubscriptionId(client));
    if (!subId) return;
    await deleteAnyOfferChangedSubscription(client, subId);
  } catch (e) {
    console.warn(
      "[notifications] cancelar suscripción ANY_OFFER_CHANGED falló (best-effort):",
      e,
    );
  }
}
