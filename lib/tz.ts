/**
 * Conversión entre la hora de pared de Europe/Madrid (lo que el vendedor
 * escribe en un <input type="datetime-local">) y un instante UTC.
 *
 * Sin librerías: usamos Intl para conocer el offset de Madrid en una fecha
 * concreta (respeta el horario de verano/invierno). El parseo nativo
 * `new Date("2026-08-01T00:00")` de un datetime-local SIN offset lo interpreta
 * como hora del servidor (UTC en Vercel), desplazando la ventana 1-2 h respecto
 * a lo que el vendedor quiso. Estas funciones lo corrigen.
 */

const MADRID = "Europe/Madrid";

/** Offset de Madrid respecto a UTC, en ms, para el instante dado. */
function madridOffsetMs(at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: MADRID,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) parts[p.type] = p.value;
  // "24" puede aparecer para medianoche en algunos entornos.
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - at.getTime();
}

/**
 * Interpreta un string "YYYY-MM-DDTHH:mm" como hora de pared de Madrid y
 * devuelve el Date (instante UTC) correspondiente. null si no parsea.
 */
export function madridLocalToUtc(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  // Asumimos primero que los componentes son UTC y corregimos por el offset de
  // Madrid en ESE instante. Una iteración basta salvo dentro de la hora de
  // solape del cambio de hora; iteramos dos veces para clavar el offset.
  const guessUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  let offset = madridOffsetMs(new Date(guessUtc));
  let result = guessUtc - offset;
  offset = madridOffsetMs(new Date(result));
  result = guessUtc - offset;
  const date = new Date(result);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Formatea un instante UTC como "YYYY-MM-DDTHH:mm" en hora de Madrid, apto para
 * el `value` de un <input type="datetime-local">.
 */
export function utcToMadridLocalInput(at: Date): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) parts[p.type] = p.value;
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}
