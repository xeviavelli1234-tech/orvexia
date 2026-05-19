/**
 * Variaciones de producto (ASIN padre/hijo) — PURO, testeable.
 * Familia = conjunto de variaciones que comparten ASIN padre.
 */

export function normalizeAsin(s: string | null | undefined): string {
  return (s ?? "").trim().toUpperCase();
}

export interface VarItem {
  asin: string;
  parentAsin?: string | null;
}

/** Clave de familia: ASIN padre si existe; si no, el propio ASIN. */
export function familyKey(l: VarItem): string {
  const p = normalizeAsin(l.parentAsin);
  return p || normalizeAsin(l.asin);
}

/** ¿Es una variación hija (tiene padre distinto de su propio ASIN)? */
export function isVariationChild(l: VarItem): boolean {
  const p = normalizeAsin(l.parentAsin);
  return p !== "" && p !== normalizeAsin(l.asin);
}

/** Agrupa por familia. Devuelve grupos con ≥1 item, orden estable. */
export function groupByParent<T extends VarItem>(
  items: T[],
): Array<{ key: string; items: T[] }> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = familyKey(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return [...m.entries()].map(([key, group]) => ({ key, items: group }));
}
