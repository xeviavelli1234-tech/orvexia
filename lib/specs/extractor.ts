/**
 * Extracción de specs estructuradas a partir de `name + description` de un
 * producto. Reemplaza el revoltijo de regex sueltos repartidos por el front.
 *
 * El objetivo es guardar `Product.specs` (JSONB) en BD y filtrar/buscar
 * sobre esa columna, no sobre la cadena cruda.
 *
 * Nuevas specs se añaden aquí. La estructura es deliberadamente plana
 * (sin nested) para que sea fácil de indexar/filtrar y de mostrar.
 */
import type { Category } from "@/app/generated/prisma/client";

export interface ProductSpecs {
  // ── Comunes ──────────────────────────────────────────────────────────
  /** "A", "A+", "A++", "A+++", "B", "C", "D" */
  energyClass?: string;
  wifi?: boolean;
  bluetooth?: boolean;
  alexa?: boolean;

  // ── TVs ──────────────────────────────────────────────────────────────
  sizeInches?: number;
  tech?: "OLED" | "QLED" | "Mini LED" | "QNED" | "AMOLED" | "LED";
  resolution?: "Full HD" | "4K UHD" | "8K";
  hdr?: ("HDR10" | "HDR10+" | "Dolby Vision")[];
  refreshHz?: number;
  os?: "Google TV" | "Android TV" | "Tizen" | "webOS" | "Fire TV";

  // ── Lavadoras / Secadoras ────────────────────────────────────────────
  capacityKg?: number;
  rpm?: number;
  inverter?: boolean;
  bombaCalor?: boolean;

  // ── Lavavajillas ─────────────────────────────────────────────────────
  cubiertos?: number;
  noiseDb?: number;

  // ── Frigoríficos ─────────────────────────────────────────────────────
  capacityLiters?: number;
  noFrost?: boolean;
  fridgeType?: "Combi" | "Side by Side" | "Americano" | "Bajo encimera" | "Una puerta";

  // ── Hornos / Microondas ──────────────────────────────────────────────
  volumeLiters?: number;
  pyrolytic?: boolean;
  convection?: boolean;

  // ── Cafeteras ────────────────────────────────────────────────────────
  bars?: number;
  capsule?: "Nespresso" | "Dolce Gusto" | "Tassimo" | "Senseo";

  // ── Aspiradoras ──────────────────────────────────────────────────────
  suctionPa?: number;
  batteryMin?: number;
  hepa?: boolean;
  bagless?: boolean;

  // ── Aires acondicionados ─────────────────────────────────────────────
  btu?: number;
  frigorias?: number;
}

interface Input {
  name: string;
  description?: string | null;
  category: Category | string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function intInRange(s: string | undefined, min: number, max: number): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

// ── Extractores por categoría ───────────────────────────────────────────────

function commonSpecs(text: string, out: ProductSpecs): void {
  const eMatch = text.match(/Clase\s*([A-D][+]*)/i);
  if (eMatch) out.energyClass = eMatch[1].toUpperCase();

  if (/\bWi[- ]?Fi\b/i.test(text)) out.wifi = true;
  if (/\bBluetooth\b/i.test(text)) out.bluetooth = true;
  if (/\bAlexa\b/i.test(text)) out.alexa = true;
}

function tvSpecs(text: string, out: ProductSpecs): void {
  // Pulgadas: "55 pulgadas", `55"`, `55''`, "(55 cm)"
  let size = intInRange(text.match(/(\d{2,3})\s*pulgadas/i)?.[1], 20, 110);
  if (!size) size = intInRange(text.match(/(\d{2,3})\s*(?:"|'')/)?.[1], 20, 110);
  // Fallback al código de modelo común: QE55Q80C, OLED65C3, NU7090 (último 2 dígitos = pulgadas)
  if (!size) {
    const m = text.match(/\b[A-Z]{1,4}(\d{2})[A-Z]/);
    size = intInRange(m?.[1], 20, 110);
  }
  if (size) out.sizeInches = size;

  // Tecnología: orden importa (Mini LED se solapa con LED, QNED con QLED)
  if (/\bOLED\s*evo\b/i.test(text)) out.tech = "OLED";
  else if (/\bMini\s*LED\b/i.test(text)) out.tech = "Mini LED";
  else if (/\bQNED\b/i.test(text)) out.tech = "QNED";
  else if (/\bQLED\b/i.test(text)) out.tech = "QLED";
  else if (/\bOLED\b/i.test(text)) out.tech = "OLED";
  else if (/\bAMOLED\b/i.test(text)) out.tech = "AMOLED";
  else if (/\bLED\b/i.test(text)) out.tech = "LED";

  // Resolución
  if (/\b8K\b/i.test(text)) out.resolution = "8K";
  else if (/4K\s*UHD/i.test(text) || /\bUHD\b/i.test(text) || /\b4K\b/i.test(text)) out.resolution = "4K UHD";
  else if (/Full\s*HD|\bFHD\b/i.test(text)) out.resolution = "Full HD";

  // HDR (puede ser varios a la vez)
  const hdr: Array<"HDR10" | "HDR10+" | "Dolby Vision"> = [];
  if (/HDR\s*10\+|HDR10\+/i.test(text)) hdr.push("HDR10+");
  else if (/HDR\s*10\b|HDR10\b/i.test(text)) hdr.push("HDR10");
  if (/Dolby\s*Vision/i.test(text)) hdr.push("Dolby Vision");
  if (hdr.length > 0) out.hdr = hdr;

  // Hz
  const hz = intInRange(text.match(/(\d+)\s*Hz/i)?.[1], 30, 480);
  if (hz) out.refreshHz = hz;

  // OS
  if (/Google\s*TV/i.test(text)) out.os = "Google TV";
  else if (/Fire\s*TV|Fire\s*OS/i.test(text)) out.os = "Fire TV";
  else if (/Android\s*TV/i.test(text)) out.os = "Android TV";
  else if (/\bTizen\b/i.test(text)) out.os = "Tizen";
  else if (/\bwebOS\b/i.test(text)) out.os = "webOS";
}

function washerSpecs(text: string, out: ProductSpecs): void {
  const kg = intInRange(text.match(/(\d{1,2})\s*kg/i)?.[1], 3, 20);
  if (kg) out.capacityKg = kg;

  const rpm = intInRange(text.match(/(\d{3,4})\s*rpm/i)?.[1], 400, 2000);
  if (rpm) out.rpm = rpm;

  if (/\bInverter\b/i.test(text)) out.inverter = true;
  if (/Bomba\s*de\s*calor/i.test(text)) out.bombaCalor = true;
}

function dishwasherSpecs(text: string, out: ProductSpecs): void {
  const cub = intInRange(text.match(/(\d{1,2})\s*cubiertos/i)?.[1], 4, 16);
  if (cub) out.cubiertos = cub;

  const db = intInRange(text.match(/(\d{2})\s*dB/i)?.[1], 35, 60);
  if (db) out.noiseDb = db;
}

function fridgeSpecs(text: string, out: ProductSpecs): void {
  const liters = intInRange(text.match(/(\d{2,3})\s*l(?:itros)?\b/i)?.[1], 50, 800);
  if (liters) out.capacityLiters = liters;

  if (/No\s*Frost/i.test(text)) out.noFrost = true;

  if (/Side\s*by\s*Side/i.test(text)) out.fridgeType = "Side by Side";
  else if (/Americano/i.test(text)) out.fridgeType = "Americano";
  else if (/Combi/i.test(text)) out.fridgeType = "Combi";
  else if (/Bajo\s*encimera/i.test(text)) out.fridgeType = "Bajo encimera";
  else if (/Una\s*puerta|1\s*puerta/i.test(text)) out.fridgeType = "Una puerta";
}

function ovenSpecs(text: string, out: ProductSpecs): void {
  const liters = intInRange(text.match(/(\d{2,3})\s*l(?:itros)?\b/i)?.[1], 15, 100);
  if (liters) out.volumeLiters = liters;

  if (/Pirol[ií]tic/i.test(text)) out.pyrolytic = true;
  if (/Convec[cs]i[óo]n|Aire\s*forzado/i.test(text)) out.convection = true;
}

function coffeeSpecs(text: string, out: ProductSpecs): void {
  const bars = intInRange(text.match(/(\d{1,2})\s*bar/i)?.[1], 1, 25);
  if (bars) out.bars = bars;

  if (/Nespresso/i.test(text)) out.capsule = "Nespresso";
  else if (/Dolce\s*Gusto/i.test(text)) out.capsule = "Dolce Gusto";
  else if (/Tassimo/i.test(text)) out.capsule = "Tassimo";
  else if (/Senseo/i.test(text)) out.capsule = "Senseo";
}

function vacuumSpecs(text: string, out: ProductSpecs): void {
  const pa = text.match(/(\d{3,5})\s*Pa\b/i)?.[1];
  if (pa) out.suctionPa = parseInt(pa, 10);

  const min = intInRange(text.match(/(\d{2,3})\s*min/i)?.[1], 10, 300);
  if (min) out.batteryMin = min;

  if (/\bHEPA\b/i.test(text)) out.hepa = true;
  if (/Sin\s*bolsa|\bBagless\b/i.test(text)) out.bagless = true;
}

function acSpecs(text: string, out: ProductSpecs): void {
  const btu = text.match(/(\d{4,5})\s*BTU/i)?.[1];
  if (btu) out.btu = parseInt(btu, 10);

  const frig = text.match(/(\d{3,5})\s*frigor[ií]as?/i)?.[1];
  if (frig) out.frigorias = parseInt(frig, 10);
}

// ── Entry point ─────────────────────────────────────────────────────────────

export function extractSpecs(p: Input): ProductSpecs {
  const text = `${p.name} ${p.description ?? ""}`;
  const out: ProductSpecs = {};

  commonSpecs(text, out);

  switch (p.category) {
    case "TELEVISORES":           tvSpecs(text, out);         break;
    case "LAVADORAS":
    case "SECADORAS":             washerSpecs(text, out);     break;
    case "LAVAVAJILLAS":          dishwasherSpecs(text, out); break;
    case "FRIGORIFICOS":          fridgeSpecs(text, out);     break;
    case "HORNOS":
    case "MICROONDAS":            ovenSpecs(text, out);       break;
    case "CAFETERAS":             coffeeSpecs(text, out);     break;
    case "ASPIRADORAS":           vacuumSpecs(text, out);     break;
    case "AIRES_ACONDICIONADOS":  acSpecs(text, out);         break;
  }

  return out;
}
