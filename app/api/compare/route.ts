import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAnalysis, getCategoryStats, type ProductAnalysis } from "@/lib/productAnalysis";
import type { Category } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

interface OfferOut {
  store: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
  externalUrl: string;
  inStock: boolean;
}

interface ProductOut {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  category: Category;
  image: string | null;
  images: string[];
  description: string | null;
  rating: number | null;
  reviewCount: number | null;
  offers: OfferOut[];
  priceHistory: { price: number; date: string }[];
  analysis: ProductAnalysis;
}

async function fetchProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      offers: { orderBy: { priceCurrent: "asc" } },
      priceHistory: { orderBy: { recordedAt: "asc" }, take: 30 },
      reviews: { select: { rating: true } },
    },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const aId = searchParams.get("a");
  const bId = searchParams.get("b");

  if (!aId || !bId) {
    return NextResponse.json({ error: "Faltan parámetros a y b" }, { status: 400 });
  }
  if (aId === bId) {
    return NextResponse.json({ error: "Debes elegir dos productos distintos" }, { status: 400 });
  }

  const [a, b] = await Promise.all([fetchProduct(aId), fetchProduct(bId)]);

  if (!a || !b) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  if (a.category !== b.category) {
    return NextResponse.json(
      { error: "Sólo se pueden comparar productos de la misma categoría", aCategory: a.category, bCategory: b.category },
      { status: 400 }
    );
  }

  const stats = await getCategoryStats(a.category);

  function buildFor(product: NonNullable<Awaited<ReturnType<typeof fetchProduct>>>): ProductOut {
    const reviewsAvg = product.reviews.length > 0
      ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
      : null;
    const reviewsTotal = product.reviews.length;
    const analysis = buildAnalysis(
      {
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        rating: product.rating,
        reviewCount: product.reviewCount,
        offers: product.offers.map((o) => ({
          priceCurrent: o.priceCurrent,
          priceOld: o.priceOld,
          discountPercent: o.discountPercent,
          inStock: o.inStock,
          store: o.store,
        })),
        priceHistory: product.priceHistory.map((h) => ({
          price: h.price,
          date: h.recordedAt.toISOString(),
        })),
        reviewsAvg,
        reviewsTotal,
      },
      stats
    );
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      model: product.model,
      category: product.category,
      image: product.image,
      images: product.images,
      description: product.description,
      rating: product.rating,
      reviewCount: product.reviewCount,
      offers: product.offers.map((o) => ({
        store: o.store,
        priceCurrent: o.priceCurrent,
        priceOld: o.priceOld,
        discountPercent: o.discountPercent,
        externalUrl: o.externalUrl,
        inStock: o.inStock,
      })),
      priceHistory: product.priceHistory.map((h) => ({
        price: h.price,
        date: h.recordedAt.toISOString(),
      })),
      analysis,
    };
  }

  return NextResponse.json({
    a: buildFor(a),
    b: buildFor(b),
    category: a.category,
  });
}
