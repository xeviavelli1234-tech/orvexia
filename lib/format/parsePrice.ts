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
