import { formatEUR } from "@/lib/format/eur";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Offer {
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
  inStock?: boolean;
}

export interface CompareProduct {
  id: string;
  productId?: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image: string | null;
  images: string[];
  rating: number | null;
  reviewCount: number | null;
  description: string | null;
  offers: Offer[];
}

export interface AnalysisHighlight { icon: string; label: string; value: string }
export interface ProductAnalysis {
  score: number;
  verdict: { label: string; tone: "great" | "good" | "ok" | "warn" };
  oneLiner: string;
  comparison: {
    priceVsAvg: number | null;
    ratingVsAvg: number | null;
    pricePercentile: number | null;
  };
  pros: string[];
  cons: string[];
  bestMoment: { isGood: boolean; reason: string } | null;
  highlights: AnalysisHighlight[];
}

export interface DetailedOffer extends Offer { inStock: boolean }

export interface DetailedProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  image: string | null;
  images: string[];
  description: string | null;
  rating: number | null;
  reviewCount: number | null;
  offers: DetailedOffer[];
  priceHistory: { price: number; date: string }[];
  analysis: ProductAnalysis;
}

export interface CompareApiResponse {
  a: DetailedProduct;
  b: DetailedProduct;
  category: string;
}

// ─── Metadatos de categorías ──────────────────────────────────────────────────

export const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  TELEVISORES:          { label: "Televisores",         icon: "📺" },
  LAVADORAS:            { label: "Lavadoras",           icon: "🫧" },
  FRIGORIFICOS:         { label: "Frigoríficos",        icon: "🧊" },
  LAVAVAJILLAS:         { label: "Lavavajillas",        icon: "🍽️" },
  SECADORAS:            { label: "Secadoras",           icon: "💨" },
  HORNOS:               { label: "Hornos",              icon: "🔥" },
  MICROONDAS:           { label: "Microondas",          icon: "📡" },
  ASPIRADORAS:          { label: "Aspiradoras",         icon: "🌀" },
  CAFETERAS:            { label: "Cafeteras",           icon: "☕" },
  AIRES_ACONDICIONADOS: { label: "Aire acondicionado",  icon: "❄️" },
  OTROS:                { label: "Otros",               icon: "📦" },
};

export function categoryLabel(c: string): string { return CATEGORY_META[c]?.label ?? c; }
export function categoryIcon(c: string): string  { return CATEGORY_META[c]?.icon ?? "📦"; }

// ─── Specs detectadas (regex sobre name+description) ──────────────────────────

const SPEC_PATTERNS: { regex: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { regex: /(\d+)\s*pulgadas/i,     label: (m) => `${m[1]}"` },
  { regex: /OLED/i,                  label: () => "OLED" },
  { regex: /QLED/i,                  label: () => "QLED" },
  { regex: /4K\s*UHD/i,              label: () => "4K UHD" },
  { regex: /Full\s*HD/i,             label: () => "Full HD" },
  { regex: /8K/i,                    label: () => "8K" },
  { regex: /HDR\s*10\+?/i,           label: () => "HDR10" },
  { regex: /Dolby\s*Vision/i,        label: () => "Dolby Vision" },
  { regex: /(\d+)\s*Hz/i,            label: (m) => `${m[1]} Hz` },
  { regex: /(\d+)\s*kg/i,            label: (m) => `${m[1]} kg` },
  { regex: /(\d+)\s*rpm/i,           label: (m) => `${m[1]} rpm` },
  { regex: /Inverter/i,              label: () => "Inverter" },
  { regex: /No\s*Frost/i,            label: () => "No Frost" },
  { regex: /Clase\s*([A-D][+]*)/i,   label: (m) => `Clase ${m[1]}` },
  { regex: /WiFi/i,                  label: () => "WiFi" },
  { regex: /Bluetooth/i,             label: () => "Bluetooth" },
  { regex: /Bomba\s*de\s*calor/i,    label: () => "Bomba calor" },
  { regex: /(\d+)\s*cubiertos/i,     label: (m) => `${m[1]} cubiertos` },
  { regex: /(\d+)\s*l(?:itros)?\b/i, label: (m) => `${m[1]} L` },
  { regex: /(\d+)\s*W\b/i,           label: (m) => `${m[1]} W` },
  { regex: /(\d+)\s*bar/i,           label: (m) => `${m[1]} bar` },
  { regex: /Google\s*TV/i,           label: () => "Google TV" },
  { regex: /Android\s*TV/i,          label: () => "Android TV" },
  { regex: /webOS/i,                 label: () => "webOS" },
  { regex: /Tizen/i,                 label: () => "Tizen" },
  { regex: /Alexa/i,                 label: () => "Alexa" },
  { regex: /HEPA/i,                  label: () => "HEPA" },
];

export function extractSpecs(name: string, description: string | null): string[] {
  const hay = `${name} ${description ?? ""}`;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const { regex, label } of SPEC_PATTERNS) {
    const m = hay.match(regex);
    if (m) {
      const v = label(m);
      if (!seen.has(v)) { seen.add(v); out.push(v); }
    }
  }
  return out;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatPrice(n: number | null | undefined): string {
  return formatEUR(n);
}

export function bestOffer<T extends Offer>(offers: T[]): T | null {
  if (offers.length === 0) return null;
  const inStock = offers.filter((o) => o.inStock !== false);
  const pool = inStock.length > 0 ? inStock : offers;
  return [...pool].sort((a, b) => a.priceCurrent - b.priceCurrent)[0];
}

export function productKey(p: CompareProduct): string {
  return p.productId ?? p.id;
}

// ─── Tono de veredicto ───────────────────────────────────────────────────────

export const VERDICT_TONE: Record<string, { bg: string; fg: string; border: string }> = {
  great: { bg: "var(--accent-50)",  fg: "var(--accent-700)", border: "var(--accent-100)" },
  good:  { bg: "var(--brand-50)",   fg: "var(--brand-700)",  border: "var(--brand-100)" },
  ok:    { bg: "#FFFBEB",            fg: "#B45309",           border: "#FDE68A" },
  warn:  { bg: "var(--danger-50)",   fg: "var(--danger-600)", border: "#FECACA" },
};
