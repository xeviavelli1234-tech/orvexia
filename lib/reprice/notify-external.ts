import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  shouldDispatchToChannel,
  type AlertCategory,
  type ChannelAlertFlags,
} from "./notify-external-filter";

export { shouldDispatchToChannel, type AlertCategory, type ChannelAlertFlags };

const log = logger.child("notify-external");

/**
 * Notificaciones externas (Slack / Telegram / Discord / webhook genérico).
 *
 * Diseño:
 *   - El cliente da un `webhookUrl` por canal.
 *   - Para Slack/Discord: POST con body JSON { text } (compatible con
 *     incoming-webhooks; Slack también muestra "text" como mensaje).
 *   - Para Telegram: webhookUrl = "https://api.telegram.org/bot<TOKEN>" y
 *     `extraTarget` = chat_id. Hacemos POST /sendMessage.
 *   - Para webhook genérico: body { text, kind, payload }.
 *
 * Errores no rompen: se guardan en lastError y se siguen intentando en el
 * siguiente disparo.
 */

export type ChannelKind = "slack" | "telegram" | "discord" | "webhook";

export interface SendInput {
  sellerAccountId: string;
  category: AlertCategory;
  text: string;
  payload?: Record<string, unknown>;
}

export async function sendToExternalChannels(input: SendInput): Promise<{
  sent: number;
  failed: number;
}> {
  let sent = 0;
  let failed = 0;
  const channels = await prisma.notificationChannel.findMany({
    where: {
      sellerAccountId: input.sellerAccountId,
      enabled: true,
    },
  });
  for (const ch of channels) {
    // Respeta filtros por tipo según los flags configurados en el canal
    if (!shouldDispatchToChannel(ch, input.category)) continue;
    try {
      await dispatch(ch.kind as ChannelKind, ch.webhookUrl, ch.extraTarget, input.text, input.payload);
      await prisma.notificationChannel.update({
        where: { id: ch.id },
        data: { lastSentAt: new Date(), lastError: null },
      });
      sent++;
    } catch (e) {
      failed++;
      // Loguea el fallo del canal con contexto (qué canal, qué tipo, qué error).
      // El throw NO se propaga: un canal roto no debe romper otros canales del
      // mismo seller, ni el ciclo de reprice que dispara la notificación.
      log.warn(
        {
          channelId: ch.id,
          sellerAccountId: ch.sellerAccountId,
          kind: ch.kind,
          category: input.category,
          err: e,
        },
        "external_channel_dispatch_failed",
      );
      try {
        await prisma.notificationChannel.update({
          where: { id: ch.id },
          data: { lastError: e instanceof Error ? e.message.slice(0, 300) : "error" },
        });
      } catch (dbErr) {
        // Si NI siquiera podemos guardar el error en BD, eso es escalable:
        // típicamente significa que la BD está caída. Lo logueamos como error
        // para que aparezca en stderr / Sentry / Vercel logs.
        log.error(
          { channelId: ch.id, originalErr: e, dbErr },
          "external_channel_lastError_save_failed",
        );
      }
    }
  }
  return { sent, failed };
}

async function dispatch(
  kind: ChannelKind,
  webhookUrl: string,
  extraTarget: string,
  text: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    let url = webhookUrl;
    let body: unknown;
    if (kind === "telegram") {
      // webhookUrl = base bot URL (con token), extraTarget = chat_id
      const base = webhookUrl.endsWith("/") ? webhookUrl.slice(0, -1) : webhookUrl;
      url = `${base}/sendMessage`;
      body = {
        chat_id: extraTarget,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      };
    } else if (kind === "discord") {
      body = { content: text };
    } else if (kind === "slack") {
      body = { text };
    } else {
      // webhook genérico
      body = { text, payload: payload ?? {} };
    }
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      throw new Error(`http_${r.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// ─── CRUD canales (server actions friendly) ────────────────────────────────
export async function createChannel(input: {
  sellerAccountId: string;
  kind: ChannelKind;
  label: string;
  webhookUrl: string;
  extraTarget?: string;
}) {
  return prisma.notificationChannel.create({
    data: {
      sellerAccountId: input.sellerAccountId,
      kind: input.kind,
      label: input.label.slice(0, 60) || "Canal",
      webhookUrl: input.webhookUrl,
      extraTarget: input.extraTarget ?? "",
    },
  });
}

export async function listChannels(sellerAccountId: string) {
  return prisma.notificationChannel.findMany({
    where: { sellerAccountId },
    orderBy: { createdAt: "desc" },
  });
}

export async function testChannel(channelId: string) {
  const ch = await prisma.notificationChannel.findUnique({ where: { id: channelId } });
  if (!ch) throw new Error("not_found");
  await dispatch(
    ch.kind as ChannelKind,
    ch.webhookUrl,
    ch.extraTarget,
    "Prueba de notificación · Orvexia Repricer · " + new Date().toLocaleString("es-ES"),
  );
}
