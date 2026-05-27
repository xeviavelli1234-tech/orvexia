/**
 * Núcleo PURO del modo fixtures — sin "server-only" para poder testearlo
 * en Node directamente. lib/amazon/fixtures.ts re-exporta desde aquí con
 * el `server-only` puesto delante.
 *
 * Estas funciones generan datos sintéticos deterministas pero variables en
 * el tiempo (ventanas de 5 min) para que el reprecio pueda demostrarse sin
 * tocar Amazon real.
 */

import type { NormalizedListing } from "./listings";

export function isFixtureMode(spApiEnv: string): boolean {
  return spApiEnv !== "production";
}

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
 * tiempo). nowMs es inyectable para tests; en producción se usa Date.now().
 * Devuelve null ~1 de cada 5 ventanas (simula "sin competencia").
 */
export function getFixtureCompetitivePrice(
  asin: string,
  base: number,
  nowMs: number = Date.now(),
): number | null {
  let h = 0;
  for (let i = 0; i < asin.length; i++) h = (h * 31 + asin.charCodeAt(i)) | 0;
  h = Math.abs(h);

  const window = Math.floor(nowMs / (5 * 60 * 1000));
  const seed = (h + window) % 100;

  if (seed % 5 === 0) return null;

  const pct = ((seed % 21) - 12) / 100; // -0.12 .. +0.08
  const price = base * (1 + pct);
  return Math.round(price * 100) / 100;
}

export interface FixtureOffer {
  sellerId: string;
  price: number;
  isAmazon: boolean;
  isFba: boolean;
  rating: number | null;
  isBuyBoxWinner: boolean;
}

/**
 * Ofertas mock deterministas (varían con el tiempo) para demostrar los
 * filtros de competencia y el estado de Buy Box sin tocar Amazon.
 */
export function getFixtureOffers(
  asin: string,
  base: number,
  ourSellerId: string,
  nowMs: number = Date.now(),
): FixtureOffer[] {
  let h = 0;
  for (let i = 0; i < asin.length; i++) h = (h * 31 + asin.charCodeAt(i)) | 0;
  h = Math.abs(h);
  const window = Math.floor(nowMs / (5 * 60 * 1000));
  const seed = (h + window) % 100;
  const r = (n: number) => Math.round(n * 100) / 100;

  if (seed % 6 === 0) {
    return [
      {
        sellerId: ourSellerId,
        price: r(base),
        isAmazon: false,
        isFba: false,
        rating: 4.7,
        isBuyBoxWinner: true,
      },
    ];
  }

  const pct = ((seed % 21) - 12) / 100;
  const fbm = r(base * (1 + pct));
  const fba = r(base * (1 + pct + 0.03));
  const amzn = r(base * 0.94);
  const lowSeller = r(base * (1 + pct - 0.05));

  const offers: FixtureOffer[] = [
    { sellerId: "FBM-22", price: fbm, isAmazon: false, isFba: false, rating: 4.6, isBuyBoxWinner: false },
    { sellerId: "FBA-31", price: fba, isAmazon: false, isFba: true, rating: 4.9, isBuyBoxWinner: false },
    { sellerId: "SELL-09", price: lowSeller, isAmazon: false, isFba: false, rating: 3.1, isBuyBoxWinner: false },
    { sellerId: ourSellerId, price: r(base), isAmazon: false, isFba: false, rating: 4.7, isBuyBoxWinner: false },
  ];
  if (seed % 2 === 0) {
    offers.push({
      sellerId: "ATVPDKIKX0DER",
      price: amzn,
      isAmazon: true,
      isFba: true,
      rating: 5,
      isBuyBoxWinner: false,
    });
  }
  let winner = offers[0];
  for (const o of offers) if (o.price < winner.price) winner = o;
  winner.isBuyBoxWinner = true;
  return offers;
}
