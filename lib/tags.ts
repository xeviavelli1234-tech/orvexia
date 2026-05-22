/**
 * Etiquetas / grupos de producto — FUNCIONES PURAS, testeables.
 * Se guardan como cadena separada por comas, normalizada:
 *  - sin espacios sobrantes ni vacíos
 *  - sin duplicados (case-insensitive, conserva la primera grafía)
 *  - máx. 24 chars por etiqueta, máx. 20 etiquetas
 */

const MAX_LEN = 24;
const MAX_TAGS = 20;

export function parseTags(input: string | null | undefined): string[] {
  if (!input) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input.split(",")) {
    const t = raw.trim().slice(0, MAX_LEN).trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function normalizeTags(input: string | string[] | null | undefined): string {
  const str = Array.isArray(input) ? input.join(",") : input ?? "";
  return parseTags(str).join(",");
}

export function addTag(current: string | null | undefined, tag: string): string {
  const t = tag.trim();
  if (!t) return normalizeTags(current);
  return normalizeTags([...parseTags(current), ...parseTags(t)]);
}

export function removeTag(current: string | null | undefined, tag: string): string {
  const key = tag.trim().toLowerCase();
  if (!key) return normalizeTags(current);
  return parseTags(current)
    .filter((x) => x.toLowerCase() !== key)
    .join(",");
}

/** Conjunto único de etiquetas (ordenado) a partir de varias cadenas. */
export function collectTags(values: Array<string | null | undefined>): string[] {
  const seen = new Map<string, string>();
  for (const v of values) {
    for (const t of parseTags(v)) {
      const k = t.toLowerCase();
      if (!seen.has(k)) seen.set(k, t);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "es"));
}
