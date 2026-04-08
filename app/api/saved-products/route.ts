import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId requerido" }, { status: 400 });

  const saved = await prisma.savedProduct.upsert({
    where: { userId_productId: { userId: session.userId, productId } },
    create: { userId: session.userId, productId },
    update: {},
  });

  return NextResponse.json({ ok: true, id: saved.id });
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
