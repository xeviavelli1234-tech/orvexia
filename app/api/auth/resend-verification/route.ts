import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { Prisma } from "@/app/generated/prisma/client";
import { deleteExpiredUnverified } from "@/lib/db/user";
import { rateLimit } from "@/lib/rate-limit";
import { VERIFICATION_CODE_TTL_MS } from "@/lib/auth-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateCode() {
  return String(randomInt(100000, 999999));
}

async function cleanupExpiredUnverified() {
  const now = new Date();
  await prisma.user.deleteMany({
    where: {
      emailVerified: false,
      verificationTokenExpires: { lt: now },
    },
  });
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

  // Sin límite, este endpoint permite spamear correos de verificación a
  // cualquier dirección. 3 reenvíos por email cada 10 min es suficiente.
  if (rateLimit("resend-verification", email, 3, 10 * 60_000)) {
    return NextResponse.json(
      { message: "Has pedido demasiados códigos. Espera unos minutos." },
      { status: 429 }
    );
  }

  await cleanupExpiredUnverified();
  await deleteExpiredUnverified(); // ensure 1m expirations are removed

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Anti-enumeración: respondemos igual exista o no la cuenta y esté o no
  // verificada, para no revelar qué emails están registrados. Solo enviamos
  // un código nuevo cuando realmente procede (cuenta existe sin verificar).
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  let code: string | null = null;
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);
  let attempts = 0;

  while (attempts < 5 && !code) {
    const candidate = generateCode();
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: candidate,
          verificationTokenExpires: expiresAt,
        },
      });
      code = candidate;
      break;
    } catch (error) {
      attempts += 1;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      console.error("Error al generar código:", error);
      return NextResponse.json(
        { message: "No pudimos generar un código nuevo. Inténtalo más tarde." },
        { status: 500 }
      );
    }
  }

  if (!code) {
    return NextResponse.json(
      { message: "No pudimos generar el código. Inténtalo en unos minutos." },
      { status: 500 }
    );
  }

  const { emailSent } = await sendVerificationEmail({ to: user.email, code });

  if (!emailSent) {
    console.warn(`[resend-verification] Email no enviado a ${user.email}, devolviendo código como fallback`);
  }

  return NextResponse.json({
    ok: true,
    emailSent,
    // NUNCA exponer el código en producción: permitiría verificar la cuenta
    // sin acceso al email. Solo se devuelve como fallback en desarrollo local.
    code:
      !emailSent && process.env.NODE_ENV !== "production" ? code : undefined,
  });
}
