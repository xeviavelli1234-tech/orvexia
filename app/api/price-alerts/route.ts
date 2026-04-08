import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const productId = searchParams.get("productId");
  const store = searchParams.get("store");
  const all = searchParams.get("all");

  // Listado completo de alertas del usuario
  if (all === "1") {
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: session.userId, active: true },
      select: {
        id: true,
        productId: true,
        store: true,
        targetPrice: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ alerts });
  }

  if (!productId || !store) {
    return NextResponse.json({ error: "productId y store requeridos" }, { status: 400 });
  }

  const alert = await prisma.priceAlert.findFirst({
    where: { userId: session.userId, productId, store },
    select: { id: true, targetPrice: true },
  });

  if (!alert) return NextResponse.json({ alert: null });
  return NextResponse.json({ alert });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { productId, store, targetPrice } = await req.json();
  if (!productId || !store || !targetPrice) {
    return NextResponse.json({ error: "productId, store y targetPrice requeridos" }, { status: 400 });
  }

  const alert = await prisma.priceAlert.create({
    data: { userId: session.userId, productId, store, targetPrice: Number(targetPrice) },
  });

  return NextResponse.json({ ok: true, id: alert.id });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { alertId } = await req.json();
  if (!alertId) return NextResponse.json({ error: "alertId requerido" }, { status: 400 });

  await prisma.priceAlert.deleteMany({
    where: { id: alertId, userId: session.userId },
  });

  return NextResponse.json({ ok: true });
}
