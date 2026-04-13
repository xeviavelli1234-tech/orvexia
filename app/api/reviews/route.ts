import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  const session = await getSession();

  // ── Global listing (no productId) ────────────────────────────────────────
  if (!productId) {
    const ratingFilter = req.nextUrl.searchParams.get("rating");
    const orden = req.nextUrl.searchParams.get("orden") ?? "reciente";
    const where = ratingFilter ? { rating: parseInt(ratingFilter) } : {};

    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true } },
        product: { select: { id: true, name: true, slug: true, image: true, brand: true } },
      },
      orderBy: orden === "valoracion"
        ? [{ rating: "desc" }, { createdAt: "desc" }]
        : { createdAt: "desc" },
      take: 100,
    });

    const totalReviews = await prisma.review.count();
    const aggAvg = await prisma.review.aggregate({ _avg: { rating: true } });
    const totalProducts = await prisma.review.groupBy({ by: ["productId"] }).then((g) => g.length);

    return NextResponse.json({ reviews, total: totalReviews, avg: aggAvg._avg.rating, totalProducts });
  }

  // ── Per-product listing ───────────────────────────────────────────────────
  const reviews = await prisma.review.findMany({
    where: { productId },
    include: {
      user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const dist = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const avg = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return NextResponse.json({
    reviews,
    avg,
    total: reviews.length,
    dist,
    myReviewId: session ? reviews.find((r) => r.user.id === session.userId)?.id ?? null : null,
  });
}

const schema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  content: z.string().min(10).max(1000),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.flatten() }, { status: 422 });

  const { productId, rating, title, content } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const review = await prisma.review.upsert({
    where: { productId_userId: { productId, userId: session.userId } },
    update: { rating, title: title ?? null, content, updatedAt: new Date() },
    create: { productId, userId: session.userId, rating, title: title ?? null, content },
    include: { user: { select: { id: true, name: true, avatarColor: true, avatarEmoji: true, avatarUrl: true } } },
  });

  return NextResponse.json({ review });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const reviewId = req.nextUrl.searchParams.get("id");
  if (!reviewId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { userId: true } });
  if (!review) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (review.userId !== session.userId) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  await prisma.review.delete({ where: { id: reviewId } });
  return NextResponse.json({ ok: true });
}
