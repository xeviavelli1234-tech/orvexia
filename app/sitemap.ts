import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, CATEGORY_SLUGS, PRICE_THRESHOLDS, brandToSlug } from "@/lib/catalog/categories";

const BASE_URL = "https://www.orvexia.es";

// Regenera el sitemap cada hora para reflejar productos nuevos y cambios de precio.
export const revalidate = 3600;

const GUIDE_SLUGS = [
  "mejor-aire-acondicionado",
  "mejor-aspiradora",
  "mejor-cafetera",
  "mejor-frigorifico",
  "mejor-horno",
  "mejor-lavadora",
  "mejor-lavavajillas",
  "mejor-microondas",
  "mejor-secadora",
  "mejor-televisor",
] as const;

type Entry = MetadataRoute.Sitemap[number];

const STATIC_ENTRIES: Entry[] = [
  { url: BASE_URL, changeFrequency: "daily", priority: 1.0 },
  { url: `${BASE_URL}/buscar`, changeFrequency: "daily", priority: 0.8 },
  { url: `${BASE_URL}/categorias`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${BASE_URL}/ofertas-destacadas`, changeFrequency: "daily", priority: 0.9 },
  { url: `${BASE_URL}/bajadas-recientes`, changeFrequency: "daily", priority: 0.9 },
  { url: `${BASE_URL}/popularidad`, changeFrequency: "daily", priority: 0.7 },
  { url: `${BASE_URL}/recomendados`, changeFrequency: "daily", priority: 0.7 },
  { url: `${BASE_URL}/comunidad`, changeFrequency: "daily", priority: 0.7 },
  { url: `${BASE_URL}/opiniones`, changeFrequency: "weekly", priority: 0.6 },
  { url: `${BASE_URL}/guias`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${BASE_URL}/sobre-nosotros`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/aviso-legal`, changeFrequency: "monthly", priority: 0.3 },
  { url: `${BASE_URL}/politica-privacidad`, changeFrequency: "monthly", priority: 0.3 },
  { url: `${BASE_URL}/politica-cookies`, changeFrequency: "monthly", priority: 0.3 },
];

async function getProductEntries(): Promise<Entry[]> {
  const products = await prisma.product.findMany({
    where: { offers: { some: { inStock: true } } },
    select: {
      slug: true,
      updatedAt: true,
      offers: { select: { updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  return products.map((p) => {
    const lastOffer = p.offers[0]?.updatedAt;
    const lastModified = lastOffer && lastOffer > p.updatedAt ? lastOffer : p.updatedAt;
    return {
      url: `${BASE_URL}/productos/${p.slug}`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.7,
    };
  });
}

// Devuelve `[categorySlug, brandSlug, realBrand]` solo para marcas con >=3 productos en stock.
async function getBrandEntriesPerCategory(): Promise<Array<{ catSlug: string; brandSlug: string }>> {
  const rows = await prisma.product.groupBy({
    by: ["category", "brand"],
    where: { offers: { some: { inStock: true } } },
    _count: { _all: true },
  });
  const out: Array<{ catSlug: string; brandSlug: string }> = [];
  for (const r of rows) {
    if (r._count._all < 3) continue;
    const catSlug = CATEGORY_SLUGS.find((s) => CATEGORIES[s].key === r.category);
    if (!catSlug) continue;
    out.push({ catSlug, brandSlug: brandToSlug(r.brand) });
  }
  return out;
}

// Top N pares de productos para comparativas — el más popular de cada categoría
// emparejado con sus 3 vecinos más cercanos en precio (mismo brand u otro).
async function getComparePairs(): Promise<string[]> {
  const pairs: string[] = [];
  for (const slug of CATEGORY_SLUGS) {
    const products = await prisma.product.findMany({
      where: {
        category: CATEGORIES[slug].key,
        offers: { some: { inStock: true } },
      },
      include: { offers: { where: { inStock: true }, orderBy: { priceCurrent: "asc" }, take: 1 } },
      orderBy: [{ reviewCount: "desc" }, { rating: "desc" }],
      take: 12,
    });
    const withPrice = products
      .map((p) => ({ slug: p.slug, price: p.offers[0]?.priceCurrent ?? null }))
      .filter((p): p is { slug: string; price: number } => p.price !== null);

    for (let i = 0; i < Math.min(6, withPrice.length); i++) {
      // Empareja con el siguiente más caro y el siguiente más barato.
      const a = withPrice[i];
      const closest = withPrice
        .filter((x) => x.slug !== a.slug)
        .sort((x, y) => Math.abs(x.price - a.price) - Math.abs(y.price - a.price))
        .slice(0, 2);
      for (const b of closest) {
        // Determinismo: orden alfabético para evitar duplicados a-vs-b / b-vs-a.
        const [s1, s2] = [a.slug, b.slug].sort();
        pairs.push(`${s1}-vs-${s2}`);
      }
    }
  }
  return [...new Set(pairs)];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const categoryEntries: Entry[] = CATEGORY_SLUGS.map((slug) => ({
    url: `${BASE_URL}/categorias/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const seoCategoryEntries: Entry[] = CATEGORY_SLUGS.flatMap((slug) => [
    {
      url: `${BASE_URL}/categorias/${slug}/ofertas-hoy`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/categorias/${slug}/mejor-precio`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    ...PRICE_THRESHOLDS[slug].map((p) => ({
      url: `${BASE_URL}/categorias/${slug}/menos-de-${p}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ]);

  const guideEntries: Entry[] = GUIDE_SLUGS.map((slug) => ({
    url: `${BASE_URL}/guias/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  let productEntries: Entry[] = [];
  let brandEntries: Entry[] = [];
  let compareEntries: Entry[] = [];

  try {
    productEntries = await getProductEntries();
  } catch (err) {
    console.error("[sitemap] Error productos:", err);
  }

  try {
    const brands = await getBrandEntriesPerCategory();
    brandEntries = brands.map((b) => ({
      url: `${BASE_URL}/categorias/${b.catSlug}/${b.brandSlug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    }));
  } catch (err) {
    console.error("[sitemap] Error marcas:", err);
  }

  try {
    const pairs = await getComparePairs();
    compareEntries = pairs.map((s) => ({
      url: `${BASE_URL}/comparar/${s}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch (err) {
    console.error("[sitemap] Error comparativas:", err);
  }

  return [
    ...STATIC_ENTRIES.map((e) => ({ ...e, lastModified: e.lastModified ?? now })),
    ...categoryEntries,
    ...seoCategoryEntries,
    ...brandEntries,
    ...guideEntries,
    ...productEntries,
    ...compareEntries,
  ];
}
