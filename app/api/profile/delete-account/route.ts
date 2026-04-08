import { NextRequest, NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { password, confirmation } = body;

  if (confirmation !== "ELIMINAR") {
    return NextResponse.json({ error: "Debes escribir ELIMINAR para confirmar" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { password: true, googleId: true },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // If user has a password, require it
  if (user.password) {
    if (!password) {
      return NextResponse.json({ error: "Debes introducir tu contraseña para confirmar" }, { status: 400 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 400 });
    }
  }

  // Delete all user data (cascade handles saved products / alerts)
  await prisma.user.delete({ where: { id: session.userId } });

  // Clear session
  await deleteSession();

  return NextResponse.json({ ok: true });
}
