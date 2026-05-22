/**
 * Motor de búsqueda de productos para Orvexia.
 *
 * Hace tres cosas que la query `contains` plana no hace:
 *
 *   1. **Normaliza** (minúsculas + sin tildes + tokens) para que "frigorifico"
 *      encuentre "Frigorífico" y "samnsung" se autocorrija a "samsung".
 *   2. **Aplica sinónimos**: "nevera"→FRIGORIFICOS, "tele"→TELEVISORES,
 *      "micro"→MICROONDAS… amplía la query con términos relacionados Y
 *      añade una categoría sugerida al WHERE.
 *   3. **Puntúa relevancia** después del fetch (marca exacta > modelo > nombre
 *      con todos los tokens > nombre parcial > descripción) y descarta hits
 *      accidentales por debajo de un umbral mínimo.
 */
import { prisma } from "@/lib/prisma";
import type { Category, Prisma } from "@/app/generated/prisma/client";

// ── Normalización ───────────────────────────────────────────────────────────

export function normalize(s: string): string {
  // NFD descompone "á" en "a" + combining acute (U+0301). Borrando el
  // bloque de combining diacritical marks (U+0300–U+036F) queda "a".
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Sinónimos y correcciones ────────────────────────────────────────────────
// Cada clave debe ser su forma NORMALIZADA (sin tildes, minúscula).
//
// Multi-idioma: además del castellano coloquial, cubrimos catalán, inglés
// común y términos básicos en gallego y euskera. El catálogo está en
// castellano, así que `expand` añade siempre el equivalente castellano para
// que el match contra `name/description` siga funcionando.

interface SynonymEntry {
  /** Si el usuario escribe esto, la categoría es muy probable que sea X. */
  categoryHint?: Category;
  /** Términos adicionales para meter en el OR del SQL. */
  expand?: string[];
}

const SYNONYMS: Record<string, SynonymEntry> = {
  // ── Categorías y coloquialismos (castellano) ─────────────────────────
  "nevera":              { categoryHint: "FRIGORIFICOS", expand: ["frigorifico"] },
  "frigo":               { categoryHint: "FRIGORIFICOS", expand: ["frigorifico"] },
  "frigorifico":         { categoryHint: "FRIGORIFICOS" },
  "congelador":          { categoryHint: "FRIGORIFICOS" },
  "side by side":        { categoryHint: "FRIGORIFICOS" },
  "americano":           { categoryHint: "FRIGORIFICOS" },

  "tele":                { categoryHint: "TELEVISORES", expand: ["televisor", "tv"] },
  "tv":                  { categoryHint: "TELEVISORES", expand: ["televisor"] },
  "televisor":           { categoryHint: "TELEVISORES" },
  "television":          { categoryHint: "TELEVISORES" },
  "smart tv":            { categoryHint: "TELEVISORES" },
  "oled":                { categoryHint: "TELEVISORES" },
  "qled":                { categoryHint: "TELEVISORES" },

  "lavadora":            { categoryHint: "LAVADORAS" },
  "secadora":            { categoryHint: "SECADORAS" },
  "lavasecadora":        { expand: ["lavadora", "secadora"] },

  "lavavajillas":        { categoryHint: "LAVAVAJILLAS" },
  "lavaplatos":          { categoryHint: "LAVAVAJILLAS", expand: ["lavavajillas"] },

  "horno":               { categoryHint: "HORNOS" },
  "pirolitico":          { categoryHint: "HORNOS" },

  "micro":               { categoryHint: "MICROONDAS", expand: ["microondas"] },
  "microondas":          { categoryHint: "MICROONDAS" },

  "aspirador":           { categoryHint: "ASPIRADORAS", expand: ["aspiradora"] },
  "aspiradora":          { categoryHint: "ASPIRADORAS" },
  "robot aspirador":     { categoryHint: "ASPIRADORAS", expand: ["roomba"] },
  "roomba":              { categoryHint: "ASPIRADORAS" },
  "escoba":              { categoryHint: "ASPIRADORAS" },

  "cafetera":            { categoryHint: "CAFETERAS" },
  "espresso":            { categoryHint: "CAFETERAS", expand: ["cafetera"] },
  "nespresso":           { categoryHint: "CAFETERAS" },
  "dolce gusto":         { categoryHint: "CAFETERAS" },

  "aire":                { categoryHint: "AIRES_ACONDICIONADOS", expand: ["aire acondicionado"] },
  "aire acondicionado":  { categoryHint: "AIRES_ACONDICIONADOS" },
  "ac":                  { categoryHint: "AIRES_ACONDICIONADOS" },
  "split":               { categoryHint: "AIRES_ACONDICIONADOS" },

  // ── Catalán ──────────────────────────────────────────────────────────
  // "nevera" y "congelador" ya cubren CAT también (mismo lema).
  "frigorific":          { categoryHint: "FRIGORIFICOS", expand: ["frigorifico"] },   // frigorífic
  "televisio":           { categoryHint: "TELEVISORES", expand: ["televisor"] },      // televisió
  "rentadora":           { categoryHint: "LAVADORAS", expand: ["lavadora"] },
  "assecadora":          { categoryHint: "SECADORAS", expand: ["secadora"] },
  "rentaplats":          { categoryHint: "LAVAVAJILLAS", expand: ["lavavajillas"] },
  "rentavaixella":       { categoryHint: "LAVAVAJILLAS", expand: ["lavavajillas"] },
  "forn":                { categoryHint: "HORNOS", expand: ["horno"] },
  "pirolitic":           { categoryHint: "HORNOS", expand: ["horno", "pirolitico"] }, // piròlitic
  "microones":           { categoryHint: "MICROONDAS", expand: ["microondas"] },
  // "aspiradora" y "cafetera" son idénticas a las castellanas → ya cubiertas.
  "escombra":            { categoryHint: "ASPIRADORAS", expand: ["aspiradora", "escoba"] },
  "aire condicionat":    { categoryHint: "AIRES_ACONDICIONADOS", expand: ["aire acondicionado"] },

  // ── Inglés (mezcla habitual en queries de usuarios) ──────────────────
  "fridge":              { categoryHint: "FRIGORIFICOS", expand: ["frigorifico"] },
  "freezer":             { categoryHint: "FRIGORIFICOS", expand: ["congelador"] },
  // "television" en inglés ya está cubierto por la entrada castellana.
  "washer":              { categoryHint: "LAVADORAS", expand: ["lavadora"] },
  "washing machine":     { categoryHint: "LAVADORAS", expand: ["lavadora"] },
  "dryer":               { categoryHint: "SECADORAS", expand: ["secadora"] },
  "tumble dryer":        { categoryHint: "SECADORAS", expand: ["secadora"] },
  "dishwasher":          { categoryHint: "LAVAVAJILLAS", expand: ["lavavajillas"] },
  "oven":                { categoryHint: "HORNOS", expand: ["horno"] },
  "microwave":           { categoryHint: "MICROONDAS", expand: ["microondas"] },
  "vacuum":              { categoryHint: "ASPIRADORAS", expand: ["aspiradora"] },
  "vacuum cleaner":      { categoryHint: "ASPIRADORAS", expand: ["aspiradora"] },
  "robot vacuum":        { categoryHint: "ASPIRADORAS", expand: ["aspiradora", "roomba"] },
  "coffee maker":        { categoryHint: "CAFETERAS", expand: ["cafetera"] },
  "coffee machine":      { categoryHint: "CAFETERAS", expand: ["cafetera"] },
  "espresso machine":    { categoryHint: "CAFETERAS", expand: ["cafetera"] },
  "air conditioner":     { categoryHint: "AIRES_ACONDICIONADOS", expand: ["aire acondicionado"] },
  "air conditioning":    { categoryHint: "AIRES_ACONDICIONADOS", expand: ["aire acondicionado"] },

  // ── Gallego ──────────────────────────────────────────────────────────
  // "frigorifico", "lavadora", "secadora", "microondas", "cafetera" coinciden con ES.
  "neveira":             { categoryHint: "FRIGORIFICOS", expand: ["frigorifico", "nevera"] },
  // "televisor" es igual en gallego → ya cubierto por la entrada castellana.
  "lavalouza":           { categoryHint: "LAVAVAJILLAS", expand: ["lavavajillas"] },
  "lavalouzas":          { categoryHint: "LAVAVAJILLAS", expand: ["lavavajillas"] },
  "forno":               { categoryHint: "HORNOS", expand: ["horno"] }, // también catalán/portugués

  // ── Euskera (vasco) ──────────────────────────────────────────────────
  "hozkailu":            { categoryHint: "FRIGORIFICOS", expand: ["frigorifico", "nevera"] },
  "izozkailu":           { categoryHint: "FRIGORIFICOS", expand: ["congelador"] },
  "telebista":           { categoryHint: "TELEVISORES", expand: ["televisor", "tv"] },
  "garbigailu":          { categoryHint: "LAVADORAS", expand: ["lavadora"] },
  "lehorgailu":          { categoryHint: "SECADORAS", expand: ["secadora"] },
  "ontzi garbigailu":    { categoryHint: "LAVAVAJILLAS", expand: ["lavavajillas"] },
  "labe":                { categoryHint: "HORNOS", expand: ["horno"] },
  "mikrouhin":           { categoryHint: "MICROONDAS", expand: ["microondas"] },
  "xurgagailu":          { categoryHint: "ASPIRADORAS", expand: ["aspiradora"] },
  "kafe makina":         { categoryHint: "CAFETERAS", expand: ["cafetera"] },
  "aire girotu":         { categoryHint: "AIRES_ACONDICIONADOS", expand: ["aire acondicionado"] },

  // ── Erratas comunes de marca ─────────────────────────────────────────
  "samnsung":            { expand: ["samsung"] },
  "samusng":             { expand: ["samsung"] },
  "sansung":             { expand: ["samsung"] },
  "phillips":            { expand: ["philips"] },
  "bosh":                { expand: ["bosch"] },
  "siemmens":            { expand: ["siemens"] },
  "balay":               { expand: ["balay"] },
  "wirpool":             { expand: ["whirlpool"] },
  "wirhpool":            { expand: ["whirlpool"] },
};

// ── Expansión de query ──────────────────────────────────────────────────────

export interface ExpandedQuery {
  raw: string;
  normalized: string;
  /** Tokens del query original, normalizados. */
  tokens: string[];
  /** Tokens + términos expandidos por sinónimos. */
  expandedTerms: string[];
  /** Categorías sugeridas detectadas en el query. */
  categoryHints: Category[];
}

function applySynonyms(
  candidate: string,
  outExpanded: Set<string>,
  outCategories: Set<Category>,
): void {
  const entry = SYNONYMS[candidate];
  if (!entry) return;
  if (entry.categoryHint) outCategories.add(entry.categoryHint);
  if (entry.expand) for (const e of entry.expand) outExpanded.add(normalize(e));
}

export function expandQuery(q: string): ExpandedQuery {
  const normalized = normalize(q);
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);

  const expanded = new Set<string>(tokens);
  const categories = new Set<Category>();

  // El query completo puede ser un sinónimo (ej. "aire acondicionado").
  applySynonyms(normalized, expanded, categories);
  // Bigramas: "smart tv", "robot aspirador"…
  for (let i = 0; i < tokens.length - 1; i++) {
    applySynonyms(`${tokens[i]} ${tokens[i + 1]}`, expanded, categories);
  }
  // Tokens sueltos.
  for (const t of tokens) applySynonyms(t, expanded, categories);

  return {
    raw: q,
    normalized,
    tokens,
    expandedTerms: [...expanded].filter((t) => t.length >= 2),
    categoryHints: [...categories],
  };
}

// ── Scoring ─────────────────────────────────────────────────────────────────

export interface Scorable {
  name: string;
  brand: string;
  model?: string | null;
  description: string | null;
  category: string;
}

export function scoreProduct(p: Scorable, eq: ExpandedQuery): number {
  const name = normalize(p.name);
  const brand = normalize(p.brand);
  const model = normalize(p.model ?? "");
  const desc = normalize(p.description ?? "");

  let score = 0;

  // Categoría sugerida coincide → boost notable.
  if (eq.categoryHints.includes(p.category as Category)) score += 200;

  // Brand exacto en tokens del usuario → fuerte señal.
  if (eq.tokens.includes(brand)) score += 400;
  else if (eq.tokens.some((t) => t.length >= 3 && brand.includes(t))) score += 250;

  // Modelo: si el usuario escribió el modelo o gran parte de él, dispara.
  if (model) {
    if (eq.expandedTerms.some((t) => t.length >= 4 && model === t)) score += 600;
    else if (eq.expandedTerms.some((t) => t.length >= 4 && model.includes(t))) score += 350;
  }

  // Nombre: contar tokens del query expandido que aparecen.
  let nameTokenMatches = 0;
  for (const t of eq.expandedTerms) {
    if (t.length < 2) continue;
    if (name.includes(t)) nameTokenMatches++;
  }
  score += nameTokenMatches * 50;

  // Si TODOS los tokens originales aparecen en el nombre → match completo.
  if (eq.tokens.length > 0 && eq.tokens.every((t) => name.includes(t))) {
    score += 200;
  }

  // Descripción: peso pequeño, cap por evitar dominar.
  let descMatches = 0;
  for (const t of eq.expandedTerms) {
    if (t.length < 3) continue;
    if (desc.includes(t)) descMatches++;
  }
  score += Math.min(descMatches * 10, 50);

  return score;
}

// ── Búsqueda completa ───────────────────────────────────────────────────────

export interface SearchOptions {
  /** Límite de resultados devueltos tras scoring. Por defecto 24. */
  limit?: number;
  /** Sólo productos con al menos una oferta. Por defecto true. */
  mustHaveOffer?: boolean;
  /** Mínimo de score para considerar un producto relevante. */
  minScore?: number;
}

export interface SearchHit {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  description: string | null;
  image: string | null;
  images: string[];
  rating: number | null;
  reviewCount: number | null;
  offers: {
    store: string;
    priceCurrent: number;
    priceOld: number | null;
    discountPercent: number | null;
    externalUrl: string;
    inStock: boolean;
  }[];
  score: number;
}

export async function searchProducts(
  q: string,
  opts: SearchOptions = {},
): Promise<SearchHit[]> {
  const limit = opts.limit ?? 24;
  const mustHaveOffer = opts.mustHaveOffer ?? true;
  const minScore = opts.minScore ?? 30;

  const eq = expandQuery(q);
  if (eq.expandedTerms.length === 0 && eq.categoryHints.length === 0) return [];

  // OR clauses: por cada término expandido, comparar contra name/brand/model/description.
  // Postgres ILIKE no es accent-insensitive, pero la mayoría de nombres del
  // catálogo no llevan tildes; los hits accent-sensitive los recuperamos con
  // los sinónimos (que añaden la variante sin tilde).
  const orClauses: Prisma.ProductWhereInput[] = [];
  for (const term of eq.expandedTerms) {
    orClauses.push({ name:        { contains: term, mode: "insensitive" } });
    orClauses.push({ brand:       { contains: term, mode: "insensitive" } });
    orClauses.push({ model:       { contains: term, mode: "insensitive" } });
    orClauses.push({ description: { contains: term, mode: "insensitive" } });
  }
  // La categoría sugerida también dispara candidatos (sin tener que aparecer
  // la palabra en el texto). Importante para "nevera samsung" → además del
  // match por "samsung" en brand, traemos frigoríficos genéricos que cuadren.
  for (const cat of eq.categoryHints) {
    orClauses.push({ category: cat });
  }

  const where: Prisma.ProductWhereInput = {
    ...(mustHaveOffer ? { offers: { some: {} } } : {}),
    OR: orClauses,
  };

  // Prefetch generoso para que el ranking en JS tenga margen.
  const candidates = await prisma.product.findMany({
    where,
    select: {
      id: true, slug: true, name: true, brand: true, model: true,
      category: true, description: true, image: true, images: true,
      rating: true, reviewCount: true,
      offers: {
        orderBy: { priceCurrent: "asc" },
        select: {
          store: true, priceCurrent: true, priceOld: true,
          discountPercent: true, externalUrl: true, inStock: true,
        },
      },
    },
    take: Math.max(limit * 4, 60),
  });

  const ranked: SearchHit[] = candidates
    .map((p) => ({ ...p, score: scoreProduct(p, eq) }))
    .filter((p) => p.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit);
}
