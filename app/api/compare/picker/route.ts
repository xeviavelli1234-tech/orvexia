import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalize } from "@/lib/search";
import type { Category, Prisma } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

/**
 * Picker de productos para la comparadora del Dashboard.
 *
 * GET /api/compare/picker?category=<Category>&q=<opcional>&limit=<opcional>
 *
 * Sin `q`: lista los productos top de la categoría (rating · reseñas · ofertas).
 * Con `q`: filtra por nombre/marca/modelo dentro de esa categoría.
 *
 * El shape devuelto es compatible con `CompareProduct` del componente cliente.
 */

const VALID_CATEGORIES: ReadonlySet<Category> = new Set<Category>([
  "TELEVISORES", "LAVADORAS", "FRIGORIFICOS", "LAVAVAJILLAS",
  "SECADORAS", "HORNOS", "MICROONDAS", "ASPIRADORAS",
  "CAFETERAS", "AIRES_ACONDICIONADOS", "OTROS",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categoryParam = searchParams.get("category") ?? "";
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "24", 10) || 24, 1), 60);

  if (!VALID_CATEGORIES.has(categoryParam as Category)) {
    return NextResponse.json({ error: "Categoría inválida", products: [] }, { status: 400 });
  }
  const category = categoryParam as Category;

  // Tokens normalizados para que "samnsung" o "frigorífico" no fallen por tildes.
  const tokens = q
    ? normalize(q).split(/\s+/).filter((t) => t.length >= 2)
    : [];

  const where: Prisma.ProductWhereInput = {
    category,
    offers: { some: {} },
    ...(tokens.length > 0
      ? {
          AND: tokens.map<Prisma.ProductWhereInput>((t) => ({
            OR: [
              { name:  { contains: t, mode: "insensitive" } },
              { brand: { contains: t, mode: "insensitive" } },
              { model: { contains: t, mode: "insensitive" } },
            ],
          })),
        }
      : {}),
  };

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true, slug: true, name: true, brand: true, category: true,
      description: true, image: true, images: true,
      rating: true, reviewCount: true,
      offers: {
        orderBy: { priceCurrent: "asc" },
        select: {
          store: true, priceCurrent: true, priceOld: true,
          discountPercent: true, externalUrl: true, inStock: true,
        },
      },
    },
    // Sin query: ordenamos por señales de calidad. Con query: igualmente
    // — un rating alto sigue siendo señal útil, y el filtro ya hizo su trabajo.
    orderBy: [
      { rating:      { sort: "desc", nulls: "last" } },
      { reviewCount: { sort: "desc", nulls: "last" } },
    ],
    take: limit,
  });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      image: p.image,
      images: p.images,
      rating: p.rating,
      reviewCount: p.reviewCount,
      offers: p.offers,
    })),
  });
}
