import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://www.orvexia.es";

// Regenera el sitemap cada hora para reflejar productos nuevos y cambios de precio.
export const revalidate = 3600;

const CATEGORY_SLUGS = [
  "televisores",
  "lavadoras",
  "frigorificos",
  "lavavajillas",
  "secadoras",
  "hornos",
  "microondas",
  "aspiradoras",
  "cafeteras",
  "aires_acondicionados",
] as const;

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
    where: {
      // Solo productos con al menos una oferta en stock — evita listar fichas vacías.
      offers: { some: { inStock: true } },
    },
    select: {
      slug: true,
      updatedAt: true,
      offers: {
        select: { updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  return products.map((p) => {
    const lastOfferUpdate = p.offers[0]?.updatedAt;
    const lastModified =
      lastOfferUpdate && lastOfferUpdate > p.updatedAt ? lastOfferUpdate : p.updatedAt;
    return {
      url: `${BASE_URL}/productos/${p.slug}`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.7,
    };
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const categoryEntries: Entry[] = CATEGORY_SLUGS.map((slug) => ({
    url: `${BASE_URL}/categorias/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const guideEntries: Entry[] = GUIDE_SLUGS.map((slug) => ({
    url: `${BASE_URL}/guias/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  let productEntries: Entry[] = [];
  try {
    productEntries = await getProductEntries();
  } catch (err) {
    // Si la BD no está accesible durante el build no rompemos el sitemap;
    // las URLs estáticas, categorías y guías siguen indexándose.
    console.error("[sitemap] Error cargando productos:", err);
  }

  return [
    ...STATIC_ENTRIES.map((e) => ({ ...e, lastModified: e.lastModified ?? now })),
    ...categoryEntries,
    ...guideEntries,
    ...productEntries,
  ];
}
