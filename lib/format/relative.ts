/**
 * Tiempo relativo corto en español, pensado para metadatos densos
 * (chips, sublíneas de botones, micro-stats):
 *
 *   < 1 min  → "ahora"
 *   < 60 min → "N min"
 *   < 24 h   → "N h"
 *   < 30 d   → "N d"
 *   ≥ 30 d   → fecha corta es-ES "DD/MM/YY"
 *
 * El umbral en días evita que un "143 d" se quede colgando sin contexto.
 *
 * Pure: acepta Date, ISO string o ms. now() inyectable para tests.
 */

export function formatRelativeShort(
  when: Date | string | number | null | undefined,
  now: Date = new Date(),
): string {
  if (when == null) return "—";
  const t =
    when instanceof Date
      ? when.getTime()
      : typeof when === "number"
        ? when
        : new Date(when).getTime();
  if (!Number.isFinite(t)) return "—";

  const diffMs = now.getTime() - t;
  if (diffMs < 0) return "ahora"; // futuro cercano: tratamos como reciente

  // floor en vez de round: "hace 30s" debe ser "ahora", no "1 min".
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;

  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;

  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d`;

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(t));
}
