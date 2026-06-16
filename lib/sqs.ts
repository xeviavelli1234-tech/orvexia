import "server-only";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
} from "@aws-sdk/client-sqs";

/**
 * Cliente SQS — GATED como Stripe. Mientras no estén las env de AWS, todo el
 * pipeline de eventos queda dormido (isSqsConfigured() = false) y la app sigue
 * funcionando solo con el polling de 5 min.
 *
 * Se usa para drenar la cola donde Amazon entrega las notificaciones
 * ANY_OFFER_CHANGED (SP-API solo entrega a SQS/EventBridge, no a HTTP).
 */

export function isSqsConfigured(): boolean {
  return !!(
    process.env.AWS_SQS_QUEUE_URL &&
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

let client: SQSClient | null = null;

function getClient(): SQSClient {
  if (!client) {
    client = new SQSClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return client;
}

export interface SqsMessage {
  id: string;
  receiptHandle: string;
  body: string;
}

/** Recibe hasta `max` (≤10) mensajes. `waitSeconds` = long-polling (≤20). */
export async function receiveMessages(
  max = 10,
  waitSeconds = 0,
): Promise<SqsMessage[]> {
  const out = await getClient().send(
    new ReceiveMessageCommand({
      QueueUrl: process.env.AWS_SQS_QUEUE_URL,
      MaxNumberOfMessages: Math.min(10, Math.max(1, max)),
      WaitTimeSeconds: Math.min(20, Math.max(0, waitSeconds)),
      // > tiempo de proceso del peor caso (cuenta con muchos SKUs + reintentos)
      // para que el receipt handle no caduque antes del borrado y el mensaje no
      // reaparezca provocando un doble reprecio. El cron corre cada 60 s.
      VisibilityTimeout: 120,
    }),
  );
  return (out.Messages ?? []).map((m) => ({
    id: m.MessageId ?? "",
    receiptHandle: m.ReceiptHandle ?? "",
    body: m.Body ?? "",
  }));
}

/** Borra mensajes ya procesados (en lotes de ≤10, como exige SQS). */
export async function deleteMessages(
  handles: Array<{ receiptHandle: string }>,
): Promise<void> {
  const valid = handles.filter((h) => h.receiptHandle);
  for (let i = 0; i < valid.length; i += 10) {
    const chunk = valid.slice(i, i + 10);
    // DeleteMessageBatch NO lanza ante fallos individuales: devuelve Failed[].
    // Si no lo miramos, un borrado fallido (p.ej. receipt handle caducado) se
    // da por hecho y el mensaje reaparece → doble reprecio silencioso.
    const out = await getClient().send(
      new DeleteMessageBatchCommand({
        QueueUrl: process.env.AWS_SQS_QUEUE_URL,
        Entries: chunk.map((h, j) => ({
          Id: String(i + j), // índice global → log de Failed no ambiguo entre chunks
          ReceiptHandle: h.receiptHandle,
        })),
      }),
    );
    if (out.Failed && out.Failed.length > 0) {
      console.error(
        "[sqs] borrado parcial fallido:",
        out.Failed.map((f) => `${f.Id}:${f.Code ?? "?"}`).join(", "),
      );
    }
  }
}
