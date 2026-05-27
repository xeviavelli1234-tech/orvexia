/**
 * Logger estructurado mínimo (sin deps externas).
 *
 * Formato:
 *   - Producción / Vercel: JSON por línea en stdout. Logflare/Vercel los
 *     parsean automáticamente y permiten filtrar por campo.
 *   - Desarrollo local:    una línea legible con timestamp + nivel + campos.
 *
 * Uso:
 *   import { logger } from "@/lib/logger";
 *   const log = logger.child("reprice:runner");
 *   log.info({ accountId, runId }, "ciclo iniciado");
 *   log.warn({ accountId, listingId, err }, "PATCH falló");
 *   log.error({ err }, "ciclo abortado");
 *
 * Llamamos a este logger desde lo CRÍTICO (runner, resilience, notify-external).
 * Para debug temporal sigue usando console.log normalmente.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL: Level =
  (process.env.LOG_LEVEL as Level) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const isProd = process.env.NODE_ENV === "production";

interface LogFields {
  [k: string]: unknown;
}

function serialize(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v instanceof Error) {
      out[k] = {
        message: v.message.slice(0, 500),
        name: v.name,
        // stack se incluye solo si NO es prod, para no inflar logs.
        ...(!isProd && v.stack ? { stack: v.stack.slice(0, 1500) } : {}),
      };
    } else if (v === undefined) {
      // omitir undefined para no ensuciar JSON
    } else {
      out[k] = v;
    }
  }
  return out;
}

function emit(level: Level, scope: string, fields: LogFields, msg: string) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[MIN_LEVEL]) return;
  const payload = {
    time: new Date().toISOString(),
    level,
    scope,
    msg,
    ...serialize(fields),
  };
  const line = isProd
    ? JSON.stringify(payload)
    : prettyLine(payload, level, scope);

  // Mapeamos al método correcto para que Vercel los clasifique:
  //  warn/error van por stderr; info/debug por stdout.
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function prettyLine(p: Record<string, unknown>, level: Level, scope: string) {
  const tag =
    level === "error"
      ? "ERR"
      : level === "warn"
        ? "WRN"
        : level === "info"
          ? "INF"
          : "DBG";
  const { time, msg, ...rest } = p;
  // eliminamos las claves ya impresas para que el resto vaya como contexto
  delete (rest as Record<string, unknown>).level;
  delete (rest as Record<string, unknown>).scope;
  const ctxKeys = Object.keys(rest);
  const ctx =
    ctxKeys.length > 0
      ? " " +
        ctxKeys
          .map(
            (k) => `${k}=${JSON.stringify((rest as Record<string, unknown>)[k])}`,
          )
          .join(" ")
      : "";
  return `${time} ${tag} [${scope}] ${msg}${ctx}`;
}

export interface ScopedLogger {
  debug: (fields: LogFields, msg: string) => void;
  info: (fields: LogFields, msg: string) => void;
  warn: (fields: LogFields, msg: string) => void;
  error: (fields: LogFields, msg: string) => void;
  child: (subscope: string) => ScopedLogger;
}

function make(scope: string): ScopedLogger {
  return {
    debug: (f, m) => emit("debug", scope, f, m),
    info: (f, m) => emit("info", scope, f, m),
    warn: (f, m) => emit("warn", scope, f, m),
    error: (f, m) => emit("error", scope, f, m),
    child: (sub) => make(`${scope}:${sub}`),
  };
}

/** Logger raíz: prefiere logger.child("scope") para tener contexto. */
export const logger: ScopedLogger = make("orvexia");
