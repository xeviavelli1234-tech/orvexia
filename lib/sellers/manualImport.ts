import "server-only";
import { splitCsvFields, splitCsvLines } from "@/lib/catalog/csv-import";

export interface ManualListingRow {
  sku: string;
  title: string;
  priceCurrent: number;
  priceMin: number | null;
  priceMax: number | null;
  cost: number | null;
  currency: string;
  imageUrl: string | null;
}

export interface ParseResult {
  rows: ManualListingRow[];
  errors: { line: number; message: string }[];
}

const HEADER_ALIASES: Record<string, string> = {
  sku: "sku",
  reference: "sku",
  referencia: "sku",
  codigo: "sku",
  "código": "sku",
  ref: "sku",

  title: "title",
  titulo: "title",
  "título": "title",
  name: "title",
  nombre: "title",
  producto: "title",
  descripcion: "title",
  "descripción": "title",

  price: "priceCurrent",
  precio: "priceCurrent",
  precio_actual: "priceCurrent",
  "precio actual": "priceCurrent",
  pvp: "priceCurrent",

  min: "priceMin",
  price_min: "priceMin",
  precio_min: "priceMin",
  precio_minimo: "priceMin",
  "precio mínimo": "priceMin",
  minimo: "priceMin",
  "mínimo": "priceMin",

  max: "priceMax",
  price_max: "priceMax",
  precio_max: "priceMax",
  precio_maximo: "priceMax",
  "precio máximo": "priceMax",
  maximo: "priceMax",
  "máximo": "priceMax",

  cost: "cost",
  coste: "cost",
  costo: "cost",
  "coste unitario": "cost",

  currency: "currency",
  moneda: "currency",
  divisa: "currency",

  image: "imageUrl",
  image_url: "imageUrl",
  imagen: "imageUrl",
  url_imagen: "imageUrl",
  foto: "imageUrl",
};

const REQUIRED = ["sku", "title", "priceCurrent"] as const;

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/^﻿/, "") // strip BOM
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/\s+/g, " ");
}

function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.trim().replace(/^"|"$/g, "");
  if (!s) return null;
  // Accept both "1.234,56" (Spanish) and "1234.56" (English).
  // Heuristic: if there's a comma and no dot, treat comma as decimal. If both
  // present, the comma is thousands and the dot decimal.
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized = s;
  if (hasComma && !hasDot) normalized = s.replace(/\./g, "").replace(",", ".");
  else if (hasComma && hasDot) normalized = s.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function unquote(s: string): string {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/""/g, '"');
  }
  return t;
}

/**
 * Parse a CSV file representing a manual-mode seller catalog.
 *
 * Headers are matched case-insensitively against {@link HEADER_ALIASES} so the
 * vendor can paste a Shopify / WooCommerce / homegrown export with sensible
 * column names in Spanish or English.
 *
 * Returns rows already coerced to the right types plus a list of per-line
 * errors. Errors are non-fatal: the caller can choose to upsert valid rows and
 * surface the rest to the user.
 */
export function parseManualCatalogCsv(text: string): ParseResult {
  const errors: { line: number; message: string }[] = [];
  const rows: ManualListingRow[] = [];

  const lines = splitCsvLines(text);
  if (lines.length === 0) {
    return {
      rows,
      errors: [{ line: 0, message: "El archivo está vacío." }],
    };
  }

  const headerCells = splitCsvFields(lines[0]).map((c) => normalizeHeader(unquote(c)));
  const colIndex = new Map<string, number>();
  for (let i = 0; i < headerCells.length; i++) {
    const canonical = HEADER_ALIASES[headerCells[i]];
    if (canonical && !colIndex.has(canonical)) colIndex.set(canonical, i);
  }

  for (const req of REQUIRED) {
    if (!colIndex.has(req)) {
      errors.push({
        line: 1,
        message: `Falta la columna obligatoria "${req}". Cabeceras detectadas: ${headerCells.join(", ")}`,
      });
    }
  }
  if (errors.length > 0) return { rows, errors };

  for (let li = 1; li < lines.length; li++) {
    const raw = lines[li];
    if (!raw.trim()) continue;
    const cells = splitCsvFields(raw).map(unquote);
    const get = (key: string): string | undefined => {
      const idx = colIndex.get(key);
      return idx === undefined ? undefined : cells[idx];
    };

    const sku = (get("sku") ?? "").trim();
    const title = (get("title") ?? "").trim();
    const priceCurrent = parseNumber(get("priceCurrent"));
    const priceMin = parseNumber(get("priceMin"));
    const priceMax = parseNumber(get("priceMax"));
    const cost = parseNumber(get("cost"));
    const currency = ((get("currency") ?? "EUR").trim().toUpperCase() || "EUR").slice(0, 3);
    const imageUrl = (get("imageUrl") ?? "").trim() || null;

    if (!sku) {
      errors.push({ line: li + 1, message: "SKU vacío" });
      continue;
    }
    if (!title) {
      errors.push({ line: li + 1, message: `${sku}: título vacío` });
      continue;
    }
    if (priceCurrent === null || priceCurrent < 0) {
      errors.push({ line: li + 1, message: `${sku}: precio inválido` });
      continue;
    }
    if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
      errors.push({
        line: li + 1,
        message: `${sku}: el mínimo (${priceMin}) supera al máximo (${priceMax})`,
      });
      continue;
    }

    rows.push({
      sku: sku.slice(0, 64),
      title: title.slice(0, 500),
      priceCurrent,
      priceMin,
      priceMax,
      cost,
      currency,
      imageUrl,
    });
  }

  return { rows, errors };
}

/**
 * Build a sample CSV that users can download and fill in. Mirrors exactly the
 * format {@link parseManualCatalogCsv} accepts.
 */
export function buildSampleCatalogCsv(): string {
  const lines = [
    "sku,title,price,min,max,cost,currency,image_url",
    "SKU-001,Lavadora 8kg modelo demo,449.00,399.00,499.00,310.00,EUR,",
    "SKU-002,Frigorífico combi 180cm,629.99,579.00,699.00,420.00,EUR,",
    'SKU-003,"Televisor 55"" 4K UHD",499.00,449.00,599.00,310.00,EUR,',
  ];
  return lines.join("\n") + "\n";
}
