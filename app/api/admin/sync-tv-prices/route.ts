import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Update = {
  slug: string;
  rating?: number;
  reviewCount?: number;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
};

const UPDATES: Update[] = [
  { slug: "lg-32lr60006la-fhd-webos-32",       rating: 4.4, reviewCount: 116,  priceCurrent: 229.0,  priceOld: 289.0,  discountPercent: 21 },
  { slug: "lg-50ua73006la-uhd-webos25-50",     rating: 4.4, reviewCount: 3556, priceCurrent: 316.9,  priceOld: null,   discountPercent: null },
  { slug: "lg-43ua73006la-uhd-webos25-43",     rating: 4.4, reviewCount: 3556, priceCurrent: 269.0,  priceOld: null,   discountPercent: null },
  { slug: "td-systems-prime32c22tizen-32",     rating: 4.4, reviewCount: 2218, priceCurrent: 119.89, priceOld: null,   discountPercent: null },
  { slug: "tcl-50v6c-google-tv-50",            rating: 4.4, reviewCount: 2583, priceCurrent: 299.0,  priceOld: 399.0,  discountPercent: 25 },
  { slug: "tcl-65t69c-qled-google-tv-65",      rating: 4.2, reviewCount: 460,  priceCurrent: 492.31, priceOld: 649.0,  discountPercent: 24 },
  { slug: "xiaomi-tv-f-32-2026",               rating: 4.4, reviewCount: 4917, priceCurrent: 138.99, priceOld: 149.0,  discountPercent: 7 },
  { slug: "xiaomi-tv-f-50-2026",               rating: 4.4, reviewCount: 4917, priceCurrent: 299.0,  priceOld: null,   discountPercent: null },
  { slug: "hisense-43e63qt-4k-43",             rating: 4.4, reviewCount: 499,  priceCurrent: 207.0,  priceOld: 252.99, discountPercent: 18 },
];

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results: { slug: string; ok: boolean; reason?: string }[] = [];

  for (const u of UPDATES) {
    const product = await prisma.product.findUnique({ where: { slug: u.slug }, select: { id: true } });
    if (!product) {
      results.push({ slug: u.slug, ok: false, reason: "product not found" });
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { rating: u.rating, reviewCount: u.reviewCount },
    });

    const offer = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: "Amazon" } },
      select: { priceCurrent: true },
    });

    if (offer) {
      await prisma.offer.update({
        where: { productId_store: { productId: product.id, store: "Amazon" } },
        data: {
          priceCurrent: u.priceCurrent,
          priceOld: u.priceOld,
          discountPercent: u.discountPercent,
          inStock: true,
        },
      });

      if (offer.priceCurrent !== u.priceCurrent) {
        await prisma.priceHistory.create({
          data: { productId: product.id, store: "Amazon", price: u.priceCurrent },
        });
      }
    }

    results.push({ slug: u.slug, ok: true });
  }

  return NextResponse.json({ updated: results.filter((r) => r.ok).length, results });
}
