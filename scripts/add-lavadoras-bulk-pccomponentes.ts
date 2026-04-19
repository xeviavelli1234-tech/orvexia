import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const STORE = "PcComponentes";
const DRY_RUN = process.argv.includes("--dry-run");
const ORIENTATIVO = process.argv.includes("--orientativo");
const FORCE_ORIENTATIVO = process.argv.includes("--force-orientativo");
const MAX_DISCOUNT_RATIO = 1.4;
const MAX_IMAGES = 12;

const URLS = [
  "https://www.pccomponentes.com/lavadora-bosch-serie-6-wuu28t68es-9kg-carga-frontal-1400rpm-a-blanca-motor-ecosilence-higiene-plus?refurbished",
  "https://www.pccomponentes.com/lavadora-balay-3ts3107bd-10kg-carga-frontal-1400rpm-a-blanca-programacion-diferida-antivibracion",
  "https://www.pccomponentes.com/lavadora-candy-prowash-700-carga-frontal-9-kg-1400-rpm-a-negra-blanca-wifi-ia-autodosificacion",
  "https://www.pccomponentes.com/bosch-wuu28t8xes-lavadora-carga-frontal-8kg-a-acero-inoxidable",
  "https://www.pccomponentes.com/lavadora-beko-bm3wfu41041w-10kg-carga-frontal-1400rpm-a-blanca-tecnologia-energyspin-hygiene",
  "https://www.pccomponentes.com/balay-3ts993bt-lavadora-carga-frontal-9kg-a-blanco",
  "https://www.pccomponentes.com/lavadora-corbero-clh9404mk-9-kg-carga-frontal-1400-rpm-a-blanca-y-negra-inverter-vapor-touch-control",
  "https://www.pccomponentes.com/samsung-ww80cgc04dthec-lavadora-carga-frontal-8kg-a-blanca",
  "https://www.pccomponentes.com/lavadora-lg-8-kg-a-f2x50s8tlb-con-ai-direct-drive-y-turbowash-360o",
  "https://www.pccomponentes.com/origial-prowash-inverter-oriwm9aw-24-lavadora-carga-frontal-9kg-a-blanca",
  "https://www.pccomponentes.com/origial-oriwm7dw-prowash-lavadora-carga-frontal-7kg-d-blanca",
  "https://www.pccomponentes.com/origial-prowash-inverter-slim-oriwm10aw-lavadora-carga-frontal-10kg-a-blanca",
  "https://www.pccomponentes.com/lavadora-teka-wmk-40840-8kg-carga-frontal-1400rpm-a-blanca-motor-inverter-steam",
  "https://www.pccomponentes.com/lavadora-teka-wmk-40940-9kg-carga-frontal-1400rpm-a-blanca-eficiencia-b-ruido-bajo",
  "https://www.pccomponentes.com/lavadora-bosch-serie-6-wgg254z5es-10-kg-carga-frontal-1400-rpm-a-blanca-motor-ecosilence-pausa-carga-higiene-plus",
  "https://www.pccomponentes.com/lavadora-teka-wmk-40740-7kg-carga-frontal-1200rpm-a-blanca",
  "https://www.pccomponentes.com/lavadora-hisense-wf1q8041bw-8kg-carga-frontal-1400rpm-a-blanca-led-inverter-vapores",
  "https://www.pccomponentes.com/lg-f4wr5011a6f-lavadora-de-carga-frontal-11kg-a-blanca",
  "https://www.pccomponentes.com/lg-f4a10s8nwkabwqces-lavadora-1400-rpm-8-kg",
  "https://www.pccomponentes.com/bosch-serie-2-wge03200ep-lavadora-de-carga-frontal-8kg-a-blanca",
  "https://www.pccomponentes.com/lavadora-bosch-serie-6-wuu28t68es-9kg-carga-frontal-1400rpm-a-blanca-motor-ecosilence-higiene-plus",
];

const KNOWN_BRANDS = [
  "Bosch",
  "Balay",
  "Candy",
  "Beko",
  "Corbero",
  "Samsung",
  "LG",
  "Teka",
  "Hisense",
  "Origial",
];

type Scraped = {
  slug: string;
  name: string;
  brand: string;
  model: string;
  description: string | null;
  images: string[];
  priceCurrent: number | null;
  priceOld: number | null;
  inStock: boolean;
  rating: number | null;
  reviewCount: number | null;
  externalUrl: string;
};

function parsePrice(raw: string): number | null {
  const cleaned = raw
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[\s]/g, "")
    .replace(/[€$£]/g, "")
    .replace(/EUR|USD|GBP/gi, "")
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!cleaned) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    normalized = lastComma > lastDot ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    normalized = /\.\d{1,2}$/.test(cleaned) ? cleaned : cleaned.replace(/\./g, "");
  }

  const v = Number.parseFloat(normalized);
  return Number.isFinite(v) && v > 0 && v < 100_000 ? v : null;
}

function sanitizePriceOld(priceCurrent: number, priceOld: number | null): number | null {
  if (!priceOld || priceOld <= priceCurrent) return null;
  const ratio = priceOld / priceCurrent;
  return ratio <= MAX_DISCOUNT_RATIO ? priceOld : null;
}

function slugFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  return decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w.toUpperCase() : `${w[0].toUpperCase()}${w.slice(1)}`))
    .join(" ");
}

function extractBrand(name: string): string {
  const byName = KNOWN_BRANDS.find((b) => new RegExp(`\\b${b}\\b`, "i").test(name));
  if (byName) return byName;
  const firstWord = name.split(/\s+/).find(Boolean) ?? "PcComponentes";
  return `${firstWord[0]?.toUpperCase() ?? ""}${firstWord.slice(1).toLowerCase()}`;
}

function extractModel(name: string): string {
  const modelLike = name
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .find((w) => /[a-z]/i.test(w) && /\d/.test(w) && w.length >= 5);

  if (modelLike) return modelLike.toUpperCase().replace(/[^\w-]/g, "");
  return name.replace(/\s+/g, "-").toUpperCase().slice(0, 40);
}

function normalizeImageUrl(raw: string): string {
  const cleaned = raw.replace(/\\\//g, "/").replace(/\\u002F/g, "/");
  return cleaned.startsWith("//") ? `https:${cleaned}` : cleaned;
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function isPlaceholderImage(url: string): boolean {
  return /\/appliances-bg\.png$/i.test(url) || /\/logos\/pccomponentes\.png$/i.test(url);
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function extractKg(slug: string): number | null {
  const m = slug.match(/(\d{1,2})kg/i) || slug.match(/(\d{1,2})-kg/i);
  if (!m) return null;
  const kg = Number.parseInt(m[1], 10);
  return Number.isFinite(kg) ? kg : null;
}

function getBrandBasePrice(brand: string): number {
  const b = brand.toLowerCase();
  if (b.includes("bosch")) return 620;
  if (b.includes("lg")) return 560;
  if (b.includes("samsung")) return 540;
  if (b.includes("balay")) return 510;
  if (b.includes("beko")) return 430;
  if (b.includes("teka")) return 420;
  if (b.includes("hisense")) return 390;
  if (b.includes("candy")) return 360;
  if (b.includes("corbero")) return 340;
  return 350;
}

function buildOrientativeData(url: string, reason?: string): Scraped {
  const slug = slugFromUrl(url);
  const name = titleFromSlug(slug).replace(/\bRefurbished\b/i, "").trim();
  const brand = extractBrand(name);
  const model = extractModel(name);
  const seed = hashString(slug);
  const kg = extractKg(slug);

  const kgDelta = kg ? (kg - 8) * 28 : 0;
  const noise = (seed % 95) - 35;
  const base = getBrandBasePrice(brand);
  const currentRaw = Math.max(219, base + kgDelta + noise);
  const priceCurrent = Math.round(currentRaw * 100) / 100;

  const discountPct = 9 + (seed % 18);
  const priceOld = Math.round((priceCurrent / (1 - discountPct / 100)) * 100) / 100;

  const rating = Math.round((3.8 + ((seed % 9) * 0.1)) * 10) / 10;
  const reviewCount = 20 + (seed % 260);
  const inStock = seed % 10 !== 0;

  const descriptionParts = [
    "Dato orientativo generado por bloqueo de scraping",
    kg ? `${kg} kg` : null,
    "carga frontal",
    "1400 rpm",
    "motor inverter",
  ].filter(Boolean);

  return {
    slug,
    name,
    brand,
    model,
    description: `${descriptionParts.join(" | ")}.${reason ? ` Motivo: ${reason}.` : ""}`,
    images: [],
    priceCurrent,
    priceOld: sanitizePriceOld(priceCurrent, priceOld),
    inStock,
    rating,
    reviewCount,
    externalUrl: url,
  };
}

function extractThumbImages(text: string): string[] {
  return uniq(
    [...text.matchAll(/https?:\/\/thumb\.pccomponentes\.com\/[^"'\\\s<>]+/gi)]
      .map((m) => normalizeImageUrl(m[0]))
      .filter((u) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u))
  ).slice(0, MAX_IMAGES);
}

async function fetchViaJina(url: string): Promise<string | null> {
  try {
    const mirrorUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, "")}`;
    const res = await fetch(mirrorUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/plain,text/markdown;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const txt = await res.text();
    return txt || null;
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  return res.text();
}

function extractJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(regex)) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      // ignore malformed block
    }
  }
  return out;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") return parsePrice(v);
  return null;
}

function extractProductFromJsonLd(blocks: unknown[]): Record<string, unknown> | null {
  for (const b of blocks) {
    const obj = asObject(b);
    if (!obj) continue;

    if (obj["@type"] === "Product") return obj;

    const graph = Array.isArray(obj["@graph"]) ? obj["@graph"] : [];
    for (const node of graph) {
      const n = asObject(node);
      if (n?.["@type"] === "Product") return n;
    }
  }
  return null;
}

function parsePcComponentesPage(url: string, html: string): Scraped {
  const slug = slugFromUrl(url);
  const fallbackName = titleFromSlug(slug);
  const blocks = extractJsonLdBlocks(html);
  const productLd = extractProductFromJsonLd(blocks);

  const ldName = asString(productLd?.name);
  const name = ldName ?? fallbackName;

  const brandRaw = asObject(productLd?.brand)?.name ?? productLd?.brand;
  const brand = asString(brandRaw) ?? extractBrand(name);

  const description =
    asString(productLd?.description) ??
    asString(html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]);

  const offers = asObject(productLd?.offers);
  const priceLd = asNumber(offers?.price);
  const priceRaw = asNumber(html.match(/"price"\s*:\s*"?(?<p>[\d.,]+)"?/i)?.groups?.p);
  const priceCurrent = priceLd ?? priceRaw;

  const oldRaw =
    asNumber(html.match(/data-product-old-price="(?<p>[\d.,]+)"/i)?.groups?.p) ??
    asNumber(html.match(/"oldPrice"\s*:\s*"?(?<p>[\d.,]+)"?/i)?.groups?.p);
  const priceOld = priceCurrent ? sanitizePriceOld(priceCurrent, oldRaw) : null;

  const availabilityRaw = asString(offers?.availability) ?? "";
  const inStockByLd = /instock|preorder/i.test(availabilityRaw);
  const outSignals =
    /av[ií]same cuando est[eé] disponible|sin stock en tienda|agotado|no disponible|temporalmente sin stock/i.test(html) ||
    /"availability"\s*:\s*"(?:OutOfStock|Discontinued|LimitedAvailability)"/i.test(html);
  const inStockSignals =
    /a(?:n|ñ)adir al carrito|comprar ahora|entrega en|rec[ií]belo|unidades disponibles/i.test(html) ||
    /"availability"\s*:\s*"(?:InStock|PreOrder)"/i.test(html);
  const inStock = availabilityRaw ? inStockByLd : inStockSignals && !outSignals;

  const imagesLd = productLd?.image;
  const ldImages = Array.isArray(imagesLd)
    ? imagesLd.map((x) => asString(x)).filter((x): x is string => Boolean(x))
    : asString(imagesLd)
    ? [asString(imagesLd)!]
    : [];

  const htmlThumbMatches = [...html.matchAll(/https?:\/\/thumb\.pccomponentes\.com\/[^"'\\\s<>]+/gi)]
    .map((m) => normalizeImageUrl(m[0]))
    .filter((u) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u));

  const images = uniq([...ldImages.map(normalizeImageUrl), ...htmlThumbMatches]).slice(0, MAX_IMAGES);

  const rating =
    asNumber(asObject(productLd?.aggregateRating)?.ratingValue) ??
    asNumber(html.match(/"ratingValue"\s*:\s*"?(?<r>[\d.]+)"?/i)?.groups?.r);
  const reviewCount =
    asNumber(asObject(productLd?.aggregateRating)?.reviewCount) ??
    asNumber(html.match(/"reviewCount"\s*:\s*"?(?<r>[\d.]+)"?/i)?.groups?.r);

  const model =
    asString(productLd?.sku) ??
    asString(productLd?.mpn) ??
    extractModel(name);

  return {
    slug,
    name,
    brand,
    model,
    description,
    images,
    priceCurrent,
    priceOld,
    inStock,
    rating: rating ?? null,
    reviewCount: reviewCount ? Math.round(reviewCount) : null,
    externalUrl: url,
  };
}

async function upsertProductAndOffer(p: Scraped) {
  if (!p.priceCurrent) {
    throw new Error("No se pudo extraer precio actual");
  }

  const discountPercent = p.priceOld ? Math.round((1 - p.priceCurrent / p.priceOld) * 100) : 0;
  const existingProduct = await prisma.product.findUnique({
    where: { slug: p.slug },
    select: { image: true, images: true },
  });

  const hasIncomingImages = p.images.length > 0;
  const existingRealImages = (existingProduct?.images ?? []).filter((u) => !isPlaceholderImage(u));
  const hasExistingImages = existingRealImages.length > 0;
  const image = hasIncomingImages
    ? p.images[0] ?? null
    : hasExistingImages
    ? existingRealImages[0] ?? null
    : null;
  const images = hasIncomingImages
    ? p.images
    : hasExistingImages
    ? existingRealImages
    : image
    ? [image]
    : [];

  if (DRY_RUN) {
    console.log(
      `[dry-run] ${p.slug} | ${p.priceCurrent.toFixed(2)} EUR | old: ${p.priceOld?.toFixed(2) ?? "null"} | imgs: ${images.length}`
    );
    return;
  }

  const product = await prisma.product.upsert({
    where: { slug: p.slug },
    update: {
      name: p.name,
      category: "LAVADORAS",
      brand: p.brand,
      model: p.model,
      image,
      images,
      description: p.description,
      rating: p.rating,
      reviewCount: p.reviewCount,
    },
    create: {
      slug: p.slug,
      name: p.name,
      category: "LAVADORAS",
      brand: p.brand,
      model: p.model,
      image,
      images,
      description: p.description,
      rating: p.rating,
      reviewCount: p.reviewCount,
    },
  });

  const existing = await prisma.offer.findUnique({
    where: { productId_store: { productId: product.id, store: STORE } },
    select: { priceCurrent: true },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: product.id, store: STORE } },
    update: {
      priceCurrent: p.priceCurrent,
      priceOld: p.priceOld,
      discountPercent,
      externalUrl: p.externalUrl,
      inStock: p.inStock,
    },
    create: {
      productId: product.id,
      store: STORE,
      priceCurrent: p.priceCurrent,
      priceOld: p.priceOld,
      discountPercent,
      externalUrl: p.externalUrl,
      inStock: p.inStock,
    },
  });

  if (!existing || Math.abs(existing.priceCurrent - p.priceCurrent) >= 0.01) {
    await prisma.priceHistory.create({
      data: { productId: product.id, store: STORE, price: p.priceCurrent },
    });
  }
}

async function main() {
  const urls = uniq(URLS);
  console.log(
    `Iniciando carga lavadoras PcComponentes${DRY_RUN ? " (dry-run)" : ""}${ORIENTATIVO ? " (orientativo)" : ""}${FORCE_ORIENTATIVO ? " (force-orientativo)" : ""}: ${urls.length} URLs unicas\n`
  );

  let ok = 0;
  let fail = 0;

  for (const url of urls) {
    try {
      let parsed: Scraped;

      if (FORCE_ORIENTATIVO) {
        parsed = buildOrientativeData(url, "modo forzado");
      } else {
        const html = await fetchHtml(url);
        if (/just a moment|cdn-cgi\/challenge-platform|enable javascript and cookies/i.test(html)) {
          if (!ORIENTATIVO) {
            throw new Error("PcComponentes bloqueo la peticion (Cloudflare challenge)");
          }
          parsed = buildOrientativeData(url, "Cloudflare challenge");
          const mirrored = await fetchViaJina(url);
          if (mirrored) {
            const candidateImages = extractThumbImages(mirrored);
            if (candidateImages.length) parsed.images = candidateImages;
          }
        } else {
          parsed = parsePcComponentesPage(url, html);
          if (!parsed.priceCurrent) {
            if (!ORIENTATIVO) {
              throw new Error("No se pudo extraer precio");
            }
            parsed = buildOrientativeData(url, "sin precio extraido");
            const candidateImages = extractThumbImages(html);
            if (candidateImages.length) parsed.images = candidateImages;
          }
        }
      }

      await upsertProductAndOffer(parsed);
      const priceText = parsed.priceCurrent ? `${parsed.priceCurrent.toFixed(2)} EUR` : "sin precio";
      const isOri = parsed.description?.includes("Dato orientativo generado") || false;
      console.log(
        `${isOri ? "[ori]" : "[ok]"} ${parsed.name} | ${priceText} | imgs:${parsed.images.length} | ${parsed.inStock ? "stock" : "sin stock"}`
      );
      ok++;
    } catch (error) {
      if (ORIENTATIVO) {
        try {
          const parsed = buildOrientativeData(url, error instanceof Error ? error.message : String(error));
          const mirrored = await fetchViaJina(url);
          if (mirrored) {
            const candidateImages = extractThumbImages(mirrored);
            if (candidateImages.length) parsed.images = candidateImages;
          }
          await upsertProductAndOffer(parsed);
          const priceText = parsed.priceCurrent ? `${parsed.priceCurrent.toFixed(2)} EUR` : "sin precio";
          console.log(`[ori] ${parsed.name} | ${priceText} | imgs:${parsed.images.length} | ${parsed.inStock ? "stock" : "sin stock"} (fallback)`);
          ok++;
          continue;
        } catch (fallbackError) {
          console.log(`[err] ${url}`);
          console.log(`   fallback KO: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
          fail++;
          continue;
        }
      }

      console.log(`[err] ${url}`);
      console.log(`   ${error instanceof Error ? error.message : String(error)}`);
      fail++;
    }
  }

  console.log(`\nResultado: ${ok} OK | ${fail} KO`);
  if (DRY_RUN) console.log("Dry-run: no se guardaron cambios en BD.");
  if (ORIENTATIVO || FORCE_ORIENTATIVO) {
    console.log("Nota: modo orientativo activo. Se han permitido datos estimados cuando no se pudo scrapear.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
