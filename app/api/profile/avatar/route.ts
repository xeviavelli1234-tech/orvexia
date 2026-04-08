import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 400_000; // ~400 KB base64 (≈300 KB raw)

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { dataUrl } = body as { dataUrl?: string };

  if (!dataUrl || typeof dataUrl !== "string") {
    return NextResponse.json({ error: "dataUrl requerido" }, { status: 400 });
  }

  if (!dataUrl.startsWith("data:image/jpeg;base64,") && !dataUrl.startsWith("data:image/png;base64,") && !dataUrl.startsWith("data:image/webp;base64,")) {
    return NextResponse.json({ error: "Formato de imagen no válido" }, { status: 400 });
  }

  if (dataUrl.length > MAX_BYTES) {
    return NextResponse.json({ error: "Imagen demasiado grande (máx. 300 KB)" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { avatarUrl: dataUrl },
  });

  return NextResponse.json({ ok: true, avatarUrl: dataUrl });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.userId },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ ok: true });
}
