import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESET_EXPIRATION_MS = 1000 * 60 * 30; // 30 minutos

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = body?.email as string | undefined;

  if (!email) {
    return NextResponse.json(
      { message: "El email es obligatorio" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { message: "Si el correo está registrado, enviaremos instrucciones." },
      { status: 200 }
    );
  }

  let token: string | null = null;
  let hashedToken: string | null = null;
  const expiresAt = new Date(Date.now() + RESET_EXPIRATION_MS);
  let attempts = 0;

  while (attempts < 5 && !hashedToken) {
    token = crypto.randomBytes(32).toString("hex");
    hashedToken = hashToken(token);
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: expiresAt,
        },
      });
      break;
    } catch (error) {
      attempts += 1;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        hashedToken = null;
        continue;
      }
      console.error("Error generando token de reseteo:", error);
      return NextResponse.json(
        { message: "No pudimos generar el enlace. Intenta más tarde." },
        { status: 500 }
      );
    }
  }

  if (!hashedToken || !token) {
    return NextResponse.json(
      { message: "No pudimos generar el enlace. Intenta de nuevo." },
      { status: 500 }
    );
  }

  let emailSent = true;
  try {
    await sendPasswordResetEmail({ to: user.email, token });
  } catch (err) {
    emailSent = false;
    console.error("Error enviando email de reseteo:", err);
  }

  return NextResponse.json({
    ok: true,
    message:
      "Si el correo está registrado, enviamos instrucciones para restablecer tu contraseña.",
    emailSent,
    token: !emailSent ? token : undefined,
  });
}
