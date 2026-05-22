import { prisma } from "@/lib/prisma";

export type DealOrder =
  | "savings_desc"
  | "discount_desc"
  | "price_asc"
  | "price_desc"
  | "most_stores";

export interface DealProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
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
}

type Row = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  description: string | null;
  image: string | null;
  images: string[];
  rating: number | null;
  reviewCount: number | null;
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
  inStock: boolean;
  offerCount: bigint;
};

const ORDER_BY_SQL: Record<DealOrder, string> = {
  savings_desc:  `(best."priceOld" - best."priceCurrent") DESC`,
  discount_desc: `((best."priceOld" - best."priceCurrent") / best."priceOld") DESC`,
  price_asc:     `best."priceCurrent" ASC`,
  price_desc:    `best."priceCurrent" DESC`,
  most_stores:   `"offerCount" DESC`,
};

interface Options {
  category?: string | null;
  order?: DealOrder;
  limit?: number;
  maxPerCategory?: number;
}

/**
 * Devuelve productos con "oferta real" (priceOld presente, ratio razonable,
 * ahorro mínimo). Filtra en BD, no en memoria. Diversifica opcionalmente
 * por categoría (máx N por categoría) tras ordenar.
 */
export async function getRealDeals(opts: Options = {}): Promise<DealProduct[]> {
  const order = opts.order ?? "savings_desc";
  const limit = opts.limit ?? 50;
  const category = opts.category ?? null;

  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `
    WITH best AS (
      SELECT DISTINCT ON (o."productId")
        o."productId",
        o."store",
        o."priceCurrent",
        o."priceOld",
        o."discountPercent",
        o."externalUrl",
        o."inStock"
      FROM "Offer" o
      WHERE o."priceOld" IS NOT NULL
        AND o."inStock" = true
        AND o."priceCurrent" < o."priceOld"
        AND (o."priceOld" / o."priceCurrent") <= 2.5
        AND (o."priceOld" - o."priceCurrent") >= 3
        AND ((o."priceOld" - o."priceCurrent") / o."priceOld") >= 0.03
      ORDER BY o."productId", o."priceCurrent" ASC
    ),
    counts AS (
      SELECT "productId", COUNT(*)::bigint AS "offerCount"
      FROM "Offer"
      GROUP BY "productId"
    )
    SELECT
      p.id, p.slug, p.name, p.brand, p.category::text AS category,
      p.description, p.image, p.images, p.rating, p."reviewCount",
      best.store, best."priceCurrent", best."priceOld",
      best."discountPercent", best."externalUrl", best."inStock",
      COALESCE(counts."offerCount", 1) AS "offerCount"
    FROM "Product" p
    JOIN best ON best."productId" = p.id
    LEFT JOIN counts ON counts."productId" = p.id
    ${category ? `WHERE p.category = '${category.replace(/'/g, "''")}'::"Category"` : ""}
    ORDER BY ${ORDER_BY_SQL[order]}
    LIMIT ${Math.max(1, Math.floor(limit))}
    `,
  );

  const products = rows.map<DealProduct>((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    brand: r.brand,
    category: r.category,
    description: r.description,
    image: r.image,
    images: r.images,
    rating: r.rating,
    reviewCount: r.reviewCount,
    offers: [
      {
        store: r.store,
        priceCurrent: r.priceCurrent,
        priceOld: r.priceOld,
        discountPercent: r.discountPercent,
        externalUrl: r.externalUrl,
        inStock: r.inStock,
      },
    ],
  }));

  if (!opts.maxPerCategory) return products;

  const counts: Record<string, number> = {};
  const diversified: DealProduct[] = [];
  for (const p of products) {
    if ((counts[p.category] ?? 0) >= opts.maxPerCategory) continue;
    counts[p.category] = (counts[p.category] ?? 0) + 1;
    diversified.push(p);
  }
  if (diversified.length < products.length) {
    const seen = new Set(diversified.map((p) => p.id));
    for (const p of products) {
      if (seen.has(p.id)) continue;
      diversified.push(p);
    }
  }
  return diversified;
}
