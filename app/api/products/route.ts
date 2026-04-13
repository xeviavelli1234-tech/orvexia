import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  // Cliente fresco — sin singleton — para evitar caché de esquema antiguo
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    const full = searchParams.get("full") === "1";

    if (full) {
      const product = await prisma.product.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          name: true,
          brand: true,
          category: true,
          description: true,
          image: true,
          images: true,
          rating: true,
          reviewCount: true,
          offers: {
            select: {
              store: true,
              priceCurrent: true,
              priceOld: true,
              discountPercent: true,
              externalUrl: true,
            },
            orderBy: { priceCurrent: "asc" },
          },
        },
      });
      return NextResponse.json(product ?? null);
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      select: { images: true, rating: true, reviewCount: true },
    });
    return NextResponse.json(product ?? { images: [], rating: null, reviewCount: null });
  } finally {
    await prisma.$disconnect();
  }
}
