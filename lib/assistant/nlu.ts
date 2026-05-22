/**
 * NLU determinístico del Asistente Orvexia.
 *
 * Sin LLM externo: detecta `intent` de la pregunta y extrae `slots`
 * (precio, producto, estrategia, on/off, categoría). Cuando matchea
 * un intent ejecutable, el dispatcher invoca la TOOL correspondiente
 * y devuelve la respuesta. Cuando no, cae al matcher de la KB.
 *
 * Pensado para Vercel serverless: 0 deps externas, 0 modelos descargados,
 * 0 latencia de red. Determinista — testable con node:test.
 */
import { normalize } from "./matcher";

// ── Tipos públicos ──────────────────────────────────────────────────────────

export type Intent =
  | "set_range"
  | "set_strategy"
  | "toggle_on"
  | "toggle_off"
  | "run_now"
  | "find_products"
  | "search_catalog"
  | "product_detail"
  | "best_deals"
  | "list_categories"
  | "list_guides"
  | "greeting"
  | "thanks"
  | "info"
  | "unknown";

export interface Slots {
  /** Texto del producto al que se refiere ("Roomba 705", "el último"). */
  productRef?: string;
  /** Precio mínimo (€). */
  priceMin?: number;
  /** Precio máximo (€). */
  priceMax?: number;
  /** Estrategia detectada (BUYBOX/MATCH/FIXED/MARGIN). */
  strategy?: "BUYBOX" | "MATCH" | "FIXED" | "MARGIN";
  /** Categoría detectada para búsquedas de catálogo. */
  category?: string;
  /** Tipo de orden detectado en búsquedas ("price"|"rating"|"discount"). */
  sort?: "price" | "rating" | "discount";
  /** Filtro para find_products: "all" | "unconfigured" | "active" | "noprice". */
  filter?: "all" | "unconfigured" | "active" | "noprice";
  /** Si la pregunta menciona "todo/todos" sin un producto concreto. */
  scopeAll?: boolean;
}

export interface ConversationContext {
  /** Último producto sobre el que se actuó/preguntó (para "súbele", "pausalo"). */
  lastProductRef?: string;
  /** Última categoría tratada (para "más como esos"). */
  lastCategory?: string;
}

export interface NluResult {
  intent: Intent;
  slots: Slots;
  /** 0–1, confianza del match. <0.4 → considerar caída a KB. */
  confidence: number;
  /** Para logging/debug: qué regla matchó. */
  matchedRule?: string;
}

// ── Utilidades ──────────────────────────────────────────────────────────────

function hasAny(q: string, words: string[]): string | null {
  for (const w of words) {
    const nw = normalize(w);
    if (q.includes(nw)) return w;
  }
  return null;
}

function hasAnyWord(q: string, words: string[]): string | null {
  for (const w of words) {
    const nw = normalize(w);
    const re = new RegExp(`(?:^|[^a-z0-9])${nw}(?:[^a-z0-9]|$)`);
    if (re.test(q)) return w;
  }
  return null;
}

// "10€", "10 €", "10 eur", "10 euros", "10.50", "10,50"
const PRICE_RE = /(\d+(?:[.,]\d+)?)\s*(?:€|eur(?:os?)?)?/gi;

function extractAllPrices(q: string): number[] {
  const out: number[] = [];
  PRICE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PRICE_RE.exec(q))) {
    const n = parseFloat(m[1].replace(",", "."));
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) out.push(n);
  }
  return out;
}

// "min/máximo/mínimo X" y "max/máximo Y" en cualquier orden.
function extractMinMax(qRaw: string): { min?: number; max?: number } {
  const q = normalize(qRaw);
  const minMatch = q.match(/\b(?:min(?:imo)?|suelo|floor|menos)\s*(?:a|en|de|=|:)?\s*(\d+(?:[.,]\d+)?)/);
  const maxMatch = q.match(/\b(?:max(?:imo)?|techo|tope|ceiling|cap|mas)\s*(?:a|en|de|=|:)?\s*(\d+(?:[.,]\d+)?)/);
  const min = minMatch ? parseFloat(minMatch[1].replace(",", ".")) : undefined;
  const max = maxMatch ? parseFloat(maxMatch[1].replace(",", ".")) : undefined;
  if (min != null || max != null) return { min, max };

  // Patrones rango: "entre 10 y 20", "de 10 a 20", "10-20"
  const range = q.match(/\b(?:entre|de|del|rango)\s+(\d+(?:[.,]\d+)?)\s+(?:y|a|al|hasta)\s+(\d+(?:[.,]\d+)?)/);
  if (range) {
    const a = parseFloat(range[1].replace(",", "."));
    const b = parseFloat(range[2].replace(",", "."));
    if (a <= b) return { min: a, max: b };
    return { min: b, max: a };
  }
  const dash = qRaw.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)/);
  if (dash) {
    const a = parseFloat(dash[1].replace(",", "."));
    const b = parseFloat(dash[2].replace(",", "."));
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
      if (a <= b) return { min: a, max: b };
      return { min: b, max: a };
    }
  }
  return {};
}

// Categoría a partir de menciones libres.
const CATS: Array<[RegExp, string]> = [
  [/televis|\btv\b|smart\s*tv/i, "televisor"],
  [/lavadora/i, "lavadora"],
  [/secadora/i, "secadora"],
  [/lavavaj/i, "lavavajillas"],
  [/frigor|nevera|combi/i, "frigorifico"],
  [/horno/i, "horno"],
  [/microond/i, "microondas"],
  [/aspirador/i, "aspiradora"],
  [/cafeter/i, "cafetera"],
  [/aire|aacc|acondicion/i, "aire acondicionado"],
];
function extractCategory(q: string): string | undefined {
  for (const [re, c] of CATS) if (re.test(q)) return c;
  return undefined;
}

// "el primero", "el último", "el de antes", "eso", "ese", "le", "lo", "el mismo".
// También verbos imperativos con clíticos: "súbele", "ponle", "bajale",
// "actívalo", "pásale", "cámbiale".
function isAnaphoric(q: string): boolean {
  if (/\b(?:el\s+(?:mismo|de\s+antes|último|ultimo|anterior)|eso|ese\s+producto|esta?\b|misma|ese)\b/.test(q)) {
    return true;
  }
  // Verbo imperativo + clítico le/lo/la/los/las/se al final de la palabra.
  // (Mínimo 4 letras para evitar matches espurios tipo "tele".)
  if (/\b\w{2,}(?:le|lo|la|los|las|se|me|nos)\b/.test(q)) {
    // Asegura que es un verbo y no un sustantivo: el "verb-pronombre" suele
    // ser la primera palabra de la pregunta tras normalizar.
    const first = q.trim().split(/\s+/)[0] ?? "";
    if (/(?:bele|nele|gale|tele|sele|jale|male|pale|cale|dale|hale|vale|yelo|zalo)$/.test(first)) {
      return true;
    }
    if (/(?:lo|la|los|las|le|nos|me|se)$/.test(first) && first.length >= 5) return true;
  }
  return false;
}

// Extrae texto que parece nombre de producto. Estrategia: quitar palabras
// "instructivas" (verbos imperativos, números, € y palabras-función comunes)
// y devolver el resto como query.
const STOP = new Set([
  "el","la","los","las","de","del","en","con","por","para","a","al",
  "pon","ponme","ponle","ponla","ponlos","ponlas","sube","subele","subelo","subela",
  "baja","bajale","bajalo","bajala","cambia","cambiale","cambialo","cambiala",
  "activa","activale","activalo","activala","desactiva","desactivale","desactivalo",
  "pausa","pausale","pausalo","pausala","arranca","arrancale","arrancalo",
  "pasa","pasale","pasalo","pasame","dame","dime","dimelo","dimela",
  "lanza","lanzale","ejecuta","ejecutale","reprecia","reprecio","ya","ahora","ciclo",
  "min","minimo","mínimo","max","maximo","máximo","suelo","techo","tope","rango",
  "estrategia","modo","precio","precios","euro","euros",
  "y","o","u","si","no","que","qué","como","cómo","cuanto","cuánto",
  "buybox","match","fixed","margin","ganar","igualar","fijo","margen",
  "es","esta","este","estas","estos","mi","mis","tu","tus",
  "el","mio","mía","todo","todos","toda","todas",
]);

function extractProductRef(qRaw: string): string | undefined {
  const tokens = normalize(qRaw)
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const kept = tokens.filter((t) => {
    if (STOP.has(t)) return false;
    if (/^\d+(?:[.,]\d+)?$/.test(t)) return false;
    return t.length >= 2;
  });
  if (kept.length === 0) return undefined;
  // Devolver original (no normalizado) si encaja, para mejor display.
  return kept.join(" ");
}

// ── Detector de intents ────────────────────────────────────────────────────

interface RuleResult {
  intent: Intent;
  confidence: number;
  matchedRule: string;
  slots?: Slots;
}

function detectGreeting(q: string): RuleResult | null {
  if (/^\s*(hola|buenas|hey|hi|hello|qué tal|que tal|saludos)\b/.test(q)) {
    return { intent: "greeting", confidence: 0.95, matchedRule: "greeting" };
  }
  return null;
}

function detectThanks(q: string): RuleResult | null {
  if (/^\s*(gracias|thx|thanks|mil gracias|muchas gracias|ok\s*$)/.test(q)) {
    return { intent: "thanks", confidence: 0.95, matchedRule: "thanks" };
  }
  return null;
}

function detectRunNow(q: string): RuleResult | null {
  // "lanza ciclo", "reprecia ya", "ejecuta el reprecio ahora"
  const m =
    /\b(lanza|ejecuta|arranca|corre|dispara|inicia|ejecutar|lanzar)\b.*\b(ciclo|reprecio|reprecia|ahora|ya)\b/.test(q) ||
    /\b(reprecia|reprecio)\b.*\b(ahora|ya|inmediato|al instante)\b/.test(q) ||
    /^\s*(repreciar|reprecia|ejecutar|lanzar)\s+(ya|ahora|ciclo)\s*$/.test(q);
  if (m) return { intent: "run_now", confidence: 0.9, matchedRule: "run_now" };
  return null;
}

function detectToggle(q: string): RuleResult | null {
  const wantOff =
    hasAnyWord(q, ["pausa", "pausar", "para", "parar", "desactiva", "desactivar", "stop", "off", "apaga", "apagar"]);
  const wantOn =
    hasAnyWord(q, ["activa", "activar", "enciende", "encender", "arranca", "arrancar", "on", "habilita", "habilitar"]);
  if (!wantOff && !wantOn) return null;
  // Excluir falsos positivos: "para que sirve" etc.
  if (/^\s*para\s+(qu[eé]|cu[aá]l|cu[aá]ndo|qui[eé]n)/.test(q)) return null;
  const intent: Intent = wantOff ? "toggle_off" : "toggle_on";
  const productRef = extractProductRef(q);
  const scopeAll = /\b(todos|todas|todo|todo el catalogo|catalogo entero)\b/.test(q);
  return {
    intent,
    confidence: scopeAll || productRef ? 0.85 : 0.55,
    matchedRule: "toggle",
    slots: { productRef, scopeAll },
  };
}

function detectSetStrategy(q: string): RuleResult | null {
  let strategy: Slots["strategy"] | undefined;
  if (/\b(buy\s*box|buybox|ganar(\s+la)?\s+(buy)?\s*box|ganar)\b/.test(q)) strategy = "BUYBOX";
  else if (/\bigual(ar|a|alo|ale)\b|\bmatch\b/.test(q)) strategy = "MATCH";
  else if (/\bfij(o|ar|a)\b|\bprecio\s*fijo\b|\bfixed\b/.test(q)) strategy = "FIXED";
  else if (/\bmargen\b|\bpor\s*margen\b|\bmargin\b/.test(q)) strategy = "MARGIN";

  if (!strategy) return null;

  // Verbo introductorio opcional: si no aparece, basta con que la frase tenga
  // un objetivo claro (mención de estrategia o competidor) para considerar
  // la intención válida. Esto cubre formas naturales como "igualar al
  // competidor para el producto Y".
  const verb = hasAnyWord(q, [
    "cambia", "cambiale", "cambialo", "pon", "ponle", "ponme",
    "configura", "usar", "usa", "aplica", "estrategia", "modo",
  ]);
  const directMention = /\b(estrategia|al\s+competidor|competencia|al\s+m[aá]s\s+barato)\b/.test(q);
  if (!verb && !directMention) return null;

  const productRef = extractProductRef(q);
  return {
    intent: "set_strategy",
    confidence: productRef && (verb || directMention) ? 0.85 : 0.55,
    matchedRule: "set_strategy",
    slots: { strategy, productRef },
  };
}

function detectSetRange(q: string): RuleResult | null {
  const { min, max } = extractMinMax(q);
  if (min == null && max == null) {
    // Patrón implícito "ponle el rango de X a Y" sin min/max keyword.
    const rangeLike = /\b(rango|limites|límites|min|max|m[ií]nimo|m[aá]ximo)\b/.test(q);
    const prices = extractAllPrices(q);
    if (rangeLike && prices.length >= 2) {
      const [a, b] = prices.slice(0, 2).sort((x, y) => x - y);
      const productRef = extractProductRef(q);
      return {
        intent: "set_range",
        confidence: 0.7,
        matchedRule: "set_range_implicit",
        slots: { priceMin: a, priceMax: b, productRef },
      };
    }
    return null;
  }
  const productRef = extractProductRef(q);
  return {
    intent: "set_range",
    confidence: min != null && max != null ? 0.9 : 0.7,
    matchedRule: "set_range",
    slots: { priceMin: min, priceMax: max, productRef },
  };
}

function detectFindProducts(q: string): RuleResult | null {
  // "muéstrame", "lístame", "qué productos tengo", "mis productos sin rango"
  if (!/\b(mostrar|muestra|muestrame|lista|lístame|listame|enseñame|enseñame|cuales|cu[aá]les|qu[eé]\s+productos?|mis\s+productos?|catalogo)\b/.test(q)) {
    return null;
  }
  // Discriminar del catálogo público.
  if (extractCategory(q) && !/\b(mis|tengo|en mi cuenta|en mi catalogo)\b/.test(q)) {
    return null; // probable search_catalog
  }
  let filter: Slots["filter"] = "all";
  if (/\bsin\s+rango\b|sin\s+config|no\s+configurad/.test(q)) filter = "unconfigured";
  else if (/\brepreciando\b|activos|en\s+marcha/.test(q)) filter = "active";
  else if (/\bsin\s+oferta\b|sin\s+precio|gris(es)?/.test(q)) filter = "noprice";
  return { intent: "find_products", confidence: 0.8, matchedRule: "find_products", slots: { filter } };
}

function detectSearchCatalog(q: string): RuleResult | null {
  const verb = /\b(busca|buscame|enseñame|enseñame|recomienda|recomiendame|comparame|cu[aá]l(?:es)?\s+es\s+(?:el|la)\s+mejor)\b/.test(q);
  const category = extractCategory(q);
  // "mejores X", "X más baratas"
  const explicit = /\bmejores?\b|\bm[aá]s\s+barat/.test(q);
  if (!verb && !explicit) return null;
  if (!category && !verb) return null;
  let sort: Slots["sort"] = "price";
  if (/\bmejor\s+valorad|m[aá]s\s+valorad|mayor\s+rating|m[aá]s\s+puntuad/.test(q)) sort = "rating";
  if (/\bm[aá]s\s+descuent|mayor\s+descuent|chollo|chollos/.test(q)) sort = "discount";
  return {
    intent: "search_catalog",
    confidence: category ? 0.8 : 0.6,
    matchedRule: "search_catalog",
    slots: { category, sort, productRef: extractProductRef(q) },
  };
}

function detectProductDetail(q: string): RuleResult | null {
  // "info de X", "ficha de X", "cuanto cuesta X", "precio de X"
  if (!/\b(info(rmacion|rmaci[oó]n)?\s+(?:de|del|sobre)|ficha(\s+de)?|detalles?\s+(?:de|del)|cu[aá]nto\s+cuesta|precio\s+(?:de|del))\b/.test(q)) {
    return null;
  }
  const productRef = extractProductRef(q);
  if (!productRef || productRef.length < 3) return null;
  return {
    intent: "product_detail",
    confidence: 0.75,
    matchedRule: "product_detail",
    slots: { productRef },
  };
}

function detectBestDeals(q: string): RuleResult | null {
  if (!/\b(chollos?|mejores\s+ofertas|m[aá]s\s+descuent|grandes\s+descuent|ofertones|bajadas?\s+(?:de\s+precio|recientes))\b/.test(q)) {
    return null;
  }
  return {
    intent: "best_deals",
    confidence: 0.85,
    matchedRule: "best_deals",
    slots: { category: extractCategory(q) },
  };
}

function detectListCategories(q: string): RuleResult | null {
  if (/\b(categor[ií]as?(\s+disponibles)?|qu[eé]\s+categor)\b/.test(q)) {
    return { intent: "list_categories", confidence: 0.85, matchedRule: "list_categories" };
  }
  return null;
}

function detectListGuides(q: string): RuleResult | null {
  if (/\b(gu[ií]as?(\s+de\s+compra)?|qu[eé]\s+gu[ií]a)\b/.test(q)) {
    return { intent: "list_guides", confidence: 0.85, matchedRule: "list_guides" };
  }
  return null;
}

// ── API pública ────────────────────────────────────────────────────────────

const RULES = [
  detectGreeting,
  detectThanks,
  detectRunNow,
  detectSetRange,
  detectSetStrategy,
  detectToggle,
  detectFindProducts,
  detectBestDeals,
  detectListCategories,
  detectListGuides,
  detectProductDetail,
  detectSearchCatalog,
];

export function detectIntent(question: string, ctx: ConversationContext = {}): NluResult {
  const q = normalize(question);
  let best: RuleResult | null = null;
  for (const rule of RULES) {
    const r = rule(q);
    if (r && (!best || r.confidence > best.confidence)) best = r;
  }

  if (!best) {
    return { intent: "info", slots: { productRef: extractProductRef(question) }, confidence: 0.2 };
  }

  // Resolución anafórica: si la pregunta usa "le/lo/eso/el mismo" y NO hay
  // productRef explícito, hereda del contexto.
  const slots: Slots = { ...best.slots };
  if (!slots.productRef && ctx.lastProductRef && isAnaphoric(q)) {
    slots.productRef = ctx.lastProductRef;
  }
  return { intent: best.intent, slots, confidence: best.confidence, matchedRule: best.matchedRule };
}

// Re-export interno para tests.
export const _internals = {
  extractMinMax,
  extractAllPrices,
  extractCategory,
  extractProductRef,
  isAnaphoric,
};
