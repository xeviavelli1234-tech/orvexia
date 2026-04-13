import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const products = await prisma.product.findMany({
    where: {
      offers: { some: {} },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      brand: true,
      category: true,
      image: true,
      offers: {
        orderBy: { priceCurrent: "asc" },
        take: 1,
        select: { priceCurrent: true, discountPercent: true },
      },
    },
    take: 6,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ results: products });
}
