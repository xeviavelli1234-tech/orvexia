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

  const body = await req.json().catch(() => null);
  const productId = body?.productId;
  const store = body?.store;
  const target = Number(body?.targetPrice);
  if (!productId || !store) {
    return NextResponse.json({ error: "productId y store requeridos" }, { status: 400 });
  }
  // targetPrice debe ser un número finito y positivo (antes "abc" → NaN se
  // persistía y un productId inexistente lanzaba un FK 500).
  if (!Number.isFinite(target) || target <= 0) {
    return NextResponse.json({ error: "targetPrice debe ser un número positivo" }, { status: 400 });
  }
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const alert = await prisma.priceAlert.create({
    data: { userId: session.userId, productId, store, targetPrice: target },
  });

  return NextResponse.json({ ok: true, id: alert.id });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const alertId = body?.alertId;
  if (!alertId) return NextResponse.json({ error: "alertId requerido" }, { status: 400 });

  await prisma.priceAlert.deleteMany({
    where: { id: alertId, userId: session.userId },
  });

  return NextResponse.json({ ok: true });
}
