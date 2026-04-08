import { NextRequest, NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
        avatarEmoji: true,
        avatarUrl: true,
        bio: true,
        googleId: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.error("[/api/profile GET] Prisma error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json({
    ...user,
    hasPassword: false, // resolved below
    isGoogleUser: !!user.googleId,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, avatarColor, avatarEmoji, bio } = body;

  // Validate name
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 });
    }
    if (name.trim().length > 50) {
      return NextResponse.json({ error: "El nombre no puede superar 50 caracteres" }, { status: 400 });
    }
  }

  // Validate avatarColor
  if (avatarColor !== undefined) {
    if (typeof avatarColor !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(avatarColor)) {
      return NextResponse.json({ error: "Color inválido" }, { status: 400 });
    }
  }

  // Validate bio
  if (bio !== undefined && bio !== null) {
    if (typeof bio !== "string" || bio.length > 160) {
      return NextResponse.json({ error: "La bio no puede superar 160 caracteres" }, { status: 400 });
    }
  }

  const updateData: Record<string, string | null> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (avatarColor !== undefined) updateData.avatarColor = avatarColor;
  if (avatarEmoji !== undefined) updateData.avatarEmoji = avatarEmoji || null;
  if (bio !== undefined) updateData.bio = bio || null;

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: updateData,
    select: { id: true, name: true, email: true, avatarColor: true, avatarEmoji: true, bio: true },
  });

  // Refresh session if name changed
  if (name !== undefined) {
    await createSession({ userId: session.userId, name: updated.name, email: updated.email });
  }

  return NextResponse.json({ ok: true, user: updated });
}
