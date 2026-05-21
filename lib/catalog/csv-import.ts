/**
 * Importador CSV del catálogo (Producto + Oferta por tienda).
 *
 * Núcleo puro: parseo, normalización, validación y deduplicación.
 * Sin dependencias de BD para que sea testeable con node:test.
 *
 * Esquema esperado (cabeceras case-insensitive, orden libre):
 *   brand, model, name, category, asin (opcional), image_url (opcional),
 *   description (opcional), store, price, price_old (opcional),
 *   external_url, in_stock (opcional, def. true)
 *
 * Una fila = una OFERTA. Dos filas con el mismo (brand,model,name) generan
 * UN producto con dos ofertas.
 */

export type CsvCategory =
  | "TELEVISORES"
  | "LAVADORAS"
  | "FRIGORIFICOS"
  | "LAVAVAJILLAS"
  | "SECADORAS"
  | "HORNOS"
  | "MICROONDAS"
  | "ASPIRADORAS"
  | "CAFETERAS"
  | "AIRES_ACONDICIONADOS"
  | "OTROS";

export interface CsvRow {
  brand: string;
  model: string;
  name: string;
  category: CsvCategory;
  asin: string | null;
  imageUrl: string | null;
  description: string | null;
  // store/price/externalUrl pueden faltar si la fila es "solo producto"
  // (catálogo sin oferta todavía). Si llegan, los tres son obligatorios.
  store: string | null;
  price: number | null;
  priceOld: number | null;
  externalUrl: string | null;
  inStock: boolean;
  rowIndex: number; // 1-based, para mensajes de error
}

export interface RowError {
  rowIndex: number;
  field: string;
  message: string;
  raw?: string;
}

export interface ParseResult {
  rows: CsvRow[];
  errors: RowError[];
  totalLines: number;
}

// ─── CSV parser (sin dependencias) ──────────────────────────────────────────
// Soporta comillas dobles para campos con comas y saltos de línea, "" para
// escapar comilla interna. No es csv-parse industrial, pero cubre el 99%.
export function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += c;
      }
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (current.length > 0 || lines.length > 0) lines.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

export function splitCsvFields(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  out.push(current);
  return out.map((f) => f.trim());
}

// ─── Normalizadores ─────────────────────────────────────────────────────────
const CATEGORIES = new Set<CsvCategory>([
  "TELEVISORES",
  "LAVADORAS",
  "FRIGORIFICOS",
  "LAVAVAJILLAS",
  "SECADORAS",
  "HORNOS",
  "MICROONDAS",
  "ASPIRADORAS",
  "CAFETERAS",
  "AIRES_ACONDICIONADOS",
  "OTROS",
]);

const CATEGORY_ALIASES: Record<string, CsvCategory> = {
  tv: "TELEVISORES",
  television: "TELEVISORES",
  televisor: "TELEVISORES",
  televisores: "TELEVISORES",
  smarttv: "TELEVISORES",
  lavadora: "LAVADORAS",
  lavadoras: "LAVADORAS",
  washer: "LAVADORAS",
  frigorifico: "FRIGORIFICOS",
  frigoríficos: "FRIGORIFICOS",
  frigorificos: "FRIGORIFICOS",
  nevera: "FRIGORIFICOS",
  fridge: "FRIGORIFICOS",
  lavavajillas: "LAVAVAJILLAS",
  dishwasher: "LAVAVAJILLAS",
  secadora: "SECADORAS",
  secadoras: "SECADORAS",
  dryer: "SECADORAS",
  horno: "HORNOS",
  hornos: "HORNOS",
  oven: "HORNOS",
  microondas: "MICROONDAS",
  microwave: "MICROONDAS",
  aspiradora: "ASPIRADORAS",
  aspiradoras: "ASPIRADORAS",
  vacuum: "ASPIRADORAS",
  cafetera: "CAFETERAS",
  cafeteras: "CAFETERAS",
  coffee: "CAFETERAS",
  aire: "AIRES_ACONDICIONADOS",
  aires: "AIRES_ACONDICIONADOS",
  ac: "AIRES_ACONDICIONADOS",
  aircon: "AIRES_ACONDICIONADOS",
  aireacondicionado: "AIRES_ACONDICIONADOS",
};

export function normalizeCategory(raw: string): CsvCategory | null {
  const upper = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (CATEGORIES.has(upper as CsvCategory)) return upper as CsvCategory;
  const ascii = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
  return CATEGORY_ALIASES[ascii] ?? null;
}

export function normalizeBoolean(raw: string, defaultValue = true): boolean {
  if (raw == null) return defaultValue;
  const s = raw.trim().toLowerCase();
  if (s === "") return defaultValue;
  return ["true", "1", "yes", "sí", "si", "y"].includes(s);
}

export function parsePrice(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  // tolera "1.299,99 €", "1299.99", "1.299", "1,299.99"
  const clean = s
    .replace(/€|\$|£/g, "")
    .replace(/\s/g, "")
    .replace(/'/g, "");
  // Heurística: si tiene coma y punto, asumimos formato es: punto miles, coma decimal
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
    // solo coma → decimal
    const decimals = clean.split(",")[1] ?? "";
    if (decimals.length <= 2) {
      normalized = clean.replace(",", ".");
    } else {
      // probablemente separador de miles "1,234"
      normalized = clean.replace(/,/g, "");
    }
  } else {
    normalized = clean;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function slugify(brand: string, model: string, name: string): string {
  const base = [brand, model, name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "producto";
}

// ─── Parser principal ───────────────────────────────────────────────────────
// Obligatorias siempre: las 4 que identifican el producto.
const REQUIRED_HEADERS = ["brand", "model", "name", "category"];
// Tríada de oferta: opcional pero "todo o nada" por fila.
const OFFER_HEADERS = ["store", "price", "external_url"];
const OPTIONAL_HEADERS = [
  "asin",
  "image_url",
  "description",
  "price_old",
  "in_stock",
];

export function parseCsv(text: string): ParseResult {
  const errors: RowError[] = [];
  const rows: CsvRow[] = [];
  // Limpia BOM
  const clean = text.replace(/^﻿/, "").trim();
  if (!clean) return { rows: [], errors: [{ rowIndex: 0, field: "_", message: "El CSV está vacío" }], totalLines: 0 };

  const lines = splitCsvLines(clean);
  if (lines.length === 0) {
    return {
      rows: [],
      errors: [{ rowIndex: 0, field: "_", message: "El CSV no tiene líneas" }],
      totalLines: 0,
    };
  }

  const headers = splitCsvFields(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z_]/g, ""));
  const idx: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) idx[headers[i]] = i;

  for (const req of REQUIRED_HEADERS) {
    if (!(req in idx)) {
      errors.push({
        rowIndex: 0,
        field: req,
        message: `Falta columna obligatoria: ${req}`,
      });
    }
  }
  if (errors.length > 0) return { rows: [], errors, totalLines: lines.length };

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const fields = splitCsvFields(raw);
    const cell = (key: string) =>
      idx[key] != null && idx[key] < fields.length ? fields[idx[key]] : "";

    const rowIndex = i + 1; // human (1-based con cabecera)
    const brand = cell("brand").trim();
    const model = cell("model").trim();
    const name = cell("name").trim();
    const categoryRaw = cell("category").trim();
    const storeRaw = cell("store").trim();
    const priceRaw = cell("price").trim();
    const externalUrl = cell("external_url").trim();

    const rowErrors: RowError[] = [];
    if (!brand) rowErrors.push({ rowIndex, field: "brand", message: "Vacío" });
    if (!model) rowErrors.push({ rowIndex, field: "model", message: "Vacío" });
    if (!name) rowErrors.push({ rowIndex, field: "name", message: "Vacío" });
    const category = normalizeCategory(categoryRaw);
    if (!category) rowErrors.push({ rowIndex, field: "category", message: `Categoría no válida: ${categoryRaw}`, raw: categoryRaw });

    // Triada de oferta: o están las 3 o ninguna
    const offerFields = [storeRaw, priceRaw, externalUrl];
    const filledOffer = offerFields.filter((s) => s.length > 0).length;
    const hasOffer = filledOffer === 3;
    if (filledOffer > 0 && filledOffer < 3) {
      rowErrors.push({
        rowIndex,
        field: "offer",
        message:
          "Si añades oferta, debes rellenar las tres columnas: store, price y external_url (o dejarlas las tres vacías para importar solo el producto).",
      });
    }

    let price: number | null = null;
    if (hasOffer) {
      price = parsePrice(priceRaw);
      if (price == null || price <= 0) {
        rowErrors.push({ rowIndex, field: "price", message: "Precio inválido o ≤ 0", raw: priceRaw });
      }
      if (!/^https?:\/\//i.test(externalUrl)) {
        rowErrors.push({ rowIndex, field: "external_url", message: "URL inválida", raw: externalUrl });
      }
    }

    const imageUrl = cell("image_url").trim() || null;
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      rowErrors.push({ rowIndex, field: "image_url", message: "URL inválida", raw: imageUrl });
    }
    const priceOldRaw = cell("price_old").trim();
    const priceOld = priceOldRaw ? parsePrice(priceOldRaw) : null;
    if (priceOldRaw && (priceOld == null || priceOld <= 0)) {
      rowErrors.push({ rowIndex, field: "price_old", message: "Precio anterior inválido", raw: priceOldRaw });
    }
    if (priceOldRaw && !hasOffer) {
      rowErrors.push({ rowIndex, field: "price_old", message: "price_old requiere también store, price y external_url" });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    rows.push({
      brand,
      model,
      name,
      category: category!,
      asin: (cell("asin").trim() || null),
      imageUrl,
      description: cell("description").trim() || null,
      store: hasOffer ? storeRaw : null,
      price: hasOffer ? price : null,
      priceOld: hasOffer && priceOld && price && priceOld > price ? priceOld : null,
      externalUrl: hasOffer ? externalUrl : null,
      inStock: normalizeBoolean(cell("in_stock"), true),
      rowIndex,
    });
  }

  return { rows, errors, totalLines: lines.length };
}

// ─── Agrupación: filas → productos con sus ofertas ──────────────────────────
export interface GroupedProduct {
  brand: string;
  model: string;
  name: string;
  category: CsvCategory;
  imageUrl: string | null;
  description: string | null;
  slug: string;
  offers: Array<{
    store: string;
    price: number;
    priceOld: number | null;
    externalUrl: string;
    inStock: boolean;
  }>;
}

export function groupProductsFromRows(rows: CsvRow[]): GroupedProduct[] {
  const map = new Map<string, GroupedProduct>();
  for (const r of rows) {
    const slug = slugify(r.brand, r.model, r.name);
    const key = `${r.brand.toLowerCase()}__${r.model.toLowerCase()}`;
    let p = map.get(key);
    if (!p) {
      p = {
        brand: r.brand,
        model: r.model,
        name: r.name,
        category: r.category,
        imageUrl: r.imageUrl,
        description: r.description,
        slug,
        offers: [],
      };
      map.set(key, p);
    } else {
      // si una fila tiene imagen y la anterior no, usar la nueva
      if (!p.imageUrl && r.imageUrl) p.imageUrl = r.imageUrl;
      if (!p.description && r.description) p.description = r.description;
    }
    // Si la fila no trae oferta (solo producto), no añadimos nada al array.
    if (r.store == null || r.price == null || r.externalUrl == null) continue;
    // dedupe: misma tienda en el mismo producto → mantener la más reciente
    const existing = p.offers.findIndex(
      (o) => o.store.toLowerCase() === r.store!.toLowerCase(),
    );
    const entry = {
      store: r.store,
      price: r.price,
      priceOld: r.priceOld,
      externalUrl: r.externalUrl,
      inStock: r.inStock,
    };
    if (existing >= 0) p.offers[existing] = entry;
    else p.offers.push(entry);
  }
  return Array.from(map.values());
}

// ─── Plantilla CSV ──────────────────────────────────────────────────────────
export const CSV_TEMPLATE_HEADERS = [
  ...REQUIRED_HEADERS, // brand, model, name, category
  "asin",
  "image_url",
  "description",
  ...OFFER_HEADERS, // store, price, external_url (opcionales en bloque)
  "price_old",
  "in_stock",
];

export function generateTemplate(): string {
  return CSV_TEMPLATE_HEADERS.join(",") + "\n";
}

export { REQUIRED_HEADERS, OFFER_HEADERS, OPTIONAL_HEADERS };
