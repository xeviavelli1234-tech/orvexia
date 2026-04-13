import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId requerido" }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      offers: { orderBy: { priceCurrent: "asc" } },
    },
  });
  const discountedOffers = product?.offers.filter(o => (o.discountPercent ?? 0) > 0 && o.priceOld != null) ?? [];
  const notifyOnDiscount = discountedOffers.length === 0;
  const savedPriceCurrent = product?.offers[0]?.priceCurrent ?? null;

  const saved = await prisma.savedProduct.upsert({
    where: { userId_productId: { userId: session.userId, productId } },
    create: { userId: session.userId, productId, notifyOnDiscount, savedPriceCurrent },
    update: {},
  });

  return NextResponse.json({ ok: true, id: saved.id, notifyOnDiscount });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId requerido" }, { status: 400 });

  await prisma.savedProduct.deleteMany({
    where: { userId: session.userId, productId },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const saved = await prisma.savedProduct.findMany({
    where: { userId: session.userId },
    select: { productId: true },
  });

  return NextResponse.json({ savedIds: saved.map((s) => s.productId) });
}
