import "server-only";
import type { NormalizedListing } from "./listings";

/**
 * Modo fixtures: permite que TODO el flujo (sync, reprecio, dashboards)
 * funcione end-to-end SIN depender de Amazon real, mientras la verificación
 * de identidad de developer está pendiente.
 *
 * Se activa cuando SP_API_ENV !== "production".
 */
export function isFixtureMode(spApiEnv: string): boolean {
  return spApiEnv !== "production";
}

/** Listings mock realistas (electrodomésticos, coherentes con el catálogo). */
export const FIXTURE_LISTINGS: NormalizedListing[] = [
  {
    asin: "B0FIXTURE01",
    sku: "ORX-LAV-001",
    title: "Lavadora Bosch Serie 6 WGG2440XES 9kg 1400rpm A",
    imageUrl: null,
    productType: "WASHER",
    priceCurrent: 529.0,
    currency: "EUR",
  },
  {
    asin: "B0FIXTURE02",
    sku: "ORX-TV-002",
    title: 'Samsung TV QLED 55" QE55Q60D 4K Smart TV 2024',
    imageUrl: null,
    productType: "TELEVISION",
    priceCurrent: 649.0,
    currency: "EUR",
  },
  {
    asin: "B0FIXTURE03",
    sku: "ORX-FRG-003",
    title: "Frigorífico LG GBV3100DEP Combi No Frost 186cm D",
    imageUrl: null,
    productType: "REFRIGERATOR",
    priceCurrent: 599.0,
    currency: "EUR",
  },
  {
    asin: "B0FIXTURE04",
    sku: "ORX-LVV-004",
    title: "Lavavajillas Balay 3VS5330BP 14 cubiertos C",
    imageUrl: null,
    productType: "DISHWASHER",
    priceCurrent: 449.0,
    currency: "EUR",
  },
];

/**
 * Precio del competidor más barato (mock determinista pero que VARÍA con el
 * tiempo, para que el reprecio haga algo distinto en cada ciclo y se pueda
 * demostrar de verdad).
 *
 * Devuelve null ~1 de cada 5 ASINs/ventanas (simula "sin competencia").
 */
export function getFixtureCompetitivePrice(asin: string, base: number): number | null {
  // hash estable del ASIN
  let h = 0;
  for (let i = 0; i < asin.length; i++) h = (h * 31 + asin.charCodeAt(i)) | 0;
  h = Math.abs(h);

  // ventana temporal de 5 min → el competidor "se mueve" cada ciclo de cron
  const window = Math.floor(Date.now() / (5 * 60 * 1000));
  const seed = (h + window) % 100;

  // ~20% de las veces no hay competencia
  if (seed % 5 === 0) return null;

  // competidor oscila entre -12% y +8% sobre el precio base
  const pct = ((seed % 21) - 12) / 100; // -0.12 .. +0.08
  const price = base * (1 + pct);
  return Math.round(price * 100) / 100;
}
