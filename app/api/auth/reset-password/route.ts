import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { strongPassword } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = body?.token as string | undefined;
  const password = body?.password as string | undefined;

  if (!token || !password) {
    return NextResponse.json(
      { message: "Token y contraseña son obligatorios" },
      { status: 400 }
    );
  }

  // Misma fuerza que en el registro (antes solo exigía 6 caracteres).
  const pwCheck = strongPassword.safeParse(password);
  if (!pwCheck.success) {
    return NextResponse.json(
      { message: pwCheck.error.issues[0]?.message ?? "Contraseña no válida" },
      { status: 400 }
    );
  }

  const hashedToken = hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "Enlace inválido o expirado" },
      { status: 400 }
    );
  }

  const newPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: newPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      verificationToken: null,
      verificationTokenExpires: null,
      emailVerified: true,
    },
  });

  return NextResponse.json({ ok: true });
}
