export function parsePrice(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const clean = s
    .replace(/€|\$|£/g, "")
    .replace(/\s/g, "")
    .replace(/'/g, "");
  let normalized: string;
  if (clean.includes(",") && clean.includes(".")) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = clean.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = clean.replace(/,/g, "");
    }
  } else if (clean.includes(",")) {
    const decimals = clean.split(",")[1] ?? "";
    if (decimals.length <= 2) {
      normalized = clean.replace(",", ".");
    } else {
      normalized = clean.replace(/,/g, "");
    }
  } else {
    normalized = clean;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function parsePricePositive(raw: string | null | undefined): number | null {
  const n = parsePrice(raw);
  return n != null && n > 0 ? n : null;
}

/**
 * Variante para FEEDS Awin / formatos europeos, donde el punto puede ser
 * separador de MILES y no decimal. A diferencia de `parsePrice` (orientado al
 * CSV de admin, que por diseño trata "1.299" como 1,30 €), aquí:
 *   - "1.299" / "2.500" (punto, sin coma, y NO termina en 1-2 decimales)
 *     → el punto es separador de miles → 1299 / 2500
 *   - "155.26" / "618.97" (termina en 1-2 decimales) → decimal real → 155.26
 *   - "1.299,99" (coma decimal) → delega en parsePrice → 1299.99
 * Replica la heurística /\.\d{1,2}$/ que ya usan los scripts de feed hermanos
 * (sync-fnac-feed, update-prices-awin); solo el cron de producción la omitía,
 * lo que ingería "EUR2.500" como 2,50 € y corrompía precio/priceOld/historial.
 */
export function parseFeedPrice(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  // Quita símbolo o código de moneda ("EUR", "€"…) y cualquier carácter no
  // numérico salvo punto, coma y signo menos, antes de decidir el rol del punto.
  // (Conservar el "-" deja que parsePricePositive rechace precios negativos,
  // como hacía el alias anterior.)
  const s = String(raw).replace(/[^\d.,-]/g, "");
  if (s.includes(".") && !s.includes(",") && !/\.\d{1,2}$/.test(s)) {
    return parsePricePositive(s.replace(/\./g, ""));
  }
  return parsePricePositive(s);
}
