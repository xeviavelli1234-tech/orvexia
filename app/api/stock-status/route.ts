import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const store = searchParams.get("store");

  if (!productId || !store) {
    return NextResponse.json({ error: "productId and store required" }, { status: 400 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const priceChanges24h = await prisma.priceHistory.count({
    where: {
      productId,
      store,
      recordedAt: { gte: since },
    },
  });

  return NextResponse.json({ priceChanges24h });
}
