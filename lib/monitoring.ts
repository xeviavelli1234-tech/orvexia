/**
 * Capa de monitorización de errores opt-in.
 *
 * Comportamiento:
 *   - Si NO hay `SENTRY_DSN` (o `NEXT_PUBLIC_SENTRY_DSN` en cliente),
 *     `captureException` / `captureMessage` delegan en logger.error
 *     y `track` en logger.info — no se hace ninguna llamada externa.
 *   - Si HAY DSN y el paquete @sentry/nextjs está instalado, se carga
 *     dinámicamente y se enruta al SDK real (con scope + tags).
 *
 * Diseñado para no añadir deps obligatorias: el bundle de prod no incluye
 * Sentry si no se instala. Para activarlo:
 *   1. npm i @sentry/nextjs
 *   2. set SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN en Vercel
 *   3. (opcional) crear sentry.server.config.ts y sentry.client.config.ts
 *
 * No tipamos contra `@sentry/nextjs` directamente: queremos compilar
 * limpiamente con o sin el paquete instalado.
 */

import { logger } from "./logger";

const log = logger.child("monitoring");

const DSN =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  null;

export interface MonitorContext {
  /** Etiquetas indexadas (Sentry tags). Filtrables en la UI. */
  tags?: Record<string, string | number | boolean>;
  /** Contexto adicional no indexado. */
  extra?: Record<string, unknown>;
  /** Usuario para asociar el evento. */
  user?: { id?: string; email?: string };
  /** Severidad: "error" (default), "warning", "info". */
  level?: "error" | "warning" | "info";
}

// Carga perezosa y memoizada del SDK; null si no está disponible.
let sentryPromise: Promise<unknown> | null = null;
function loadSentry(): Promise<unknown> | null {
  if (!DSN) return null;
  if (sentryPromise) return sentryPromise;
  sentryPromise = import(
    /* webpackIgnore: true */ "@sentry/nextjs" as string
  ).catch(() => null);
  return sentryPromise;
}

/**
 * Captura un error en Sentry (si activo) y siempre lo escribe en logger.
 * Nunca lanza.
 */
export async function captureException(
  err: unknown,
  ctx: MonitorContext = {},
): Promise<void> {
  // Log local siempre (telemetría no debería tragarse información). Respetamos
  // el nivel: una degradación MANEJADA (level: "warning") no debe registrarse
  // como error fatal —ni ensuciar la consola ni disparar el overlay de errores
  // de Next en dev—. Sentry sigue recibiendo el evento igualmente.
  const localLog =
    ctx.level === "warning"
      ? log.warn
      : ctx.level === "info"
        ? log.info
        : log.error;
  localLog(
    {
      err,
      tags: ctx.tags,
      extra: ctx.extra,
      userId: ctx.user?.id,
    },
    "captured exception",
  );
  const sentry = (await loadSentry()) as
    | {
        withScope: (cb: (scope: unknown) => void) => void;
        captureException: (e: unknown) => void;
      }
    | null;
  if (!sentry) return;
  try {
    sentry.withScope((scope) => {
      applyContext(scope, ctx);
      sentry.captureException(err);
    });
  } catch (e) {
    log.warn({ err: e }, "sentry captureException failed");
  }
}

/**
 * Mensaje informativo (no error) — útil para incidentes sin throw.
 */
export async function captureMessage(
  msg: string,
  ctx: MonitorContext = {},
): Promise<void> {
  log.info(
    {
      tags: ctx.tags,
      extra: ctx.extra,
      userId: ctx.user?.id,
      level: ctx.level,
    },
    msg,
  );
  const sentry = (await loadSentry()) as
    | {
        withScope: (cb: (scope: unknown) => void) => void;
        captureMessage: (m: string, level?: string) => void;
      }
    | null;
  if (!sentry) return;
  try {
    sentry.withScope((scope) => {
      applyContext(scope, ctx);
      sentry.captureMessage(msg, ctx.level ?? "info");
    });
  } catch (e) {
    log.warn({ err: e }, "sentry captureMessage failed");
  }
}

function applyContext(scope: unknown, ctx: MonitorContext) {
  const s = scope as {
    setTag: (k: string, v: unknown) => void;
    setExtra: (k: string, v: unknown) => void;
    setUser: (u: unknown) => void;
    setLevel?: (l: string) => void;
  };
  if (ctx.tags) for (const [k, v] of Object.entries(ctx.tags)) s.setTag(k, v);
  if (ctx.extra) for (const [k, v] of Object.entries(ctx.extra)) s.setExtra(k, v);
  if (ctx.user) s.setUser(ctx.user);
  if (ctx.level && s.setLevel) s.setLevel(ctx.level);
}

/** ¿Está activo Sentry en este runtime? Útil para tests / debug. */
export function isMonitoringActive(): boolean {
  return Boolean(DSN);
}
