import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { Prisma } from "@/app/generated/prisma/client";
import { deleteExpiredUnverified } from "@/lib/db/user";

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

  await cleanupExpiredUnverified();
  await deleteExpiredUnverified(); // ensure 1m expirations are removed

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json(
      { message: "No encontramos una cuenta con ese correo" },
      { status: 404 }
    );
  }

  if (user.emailVerified) {
    return NextResponse.json(
      { message: "Este correo ya está verificado" },
      { status: 400 }
    );
  }

  let code: string | null = null;
  const expiresAt = new Date(Date.now() + 1000 * 60 * 1); // 1 minuto
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

  let emailSent = true;
  try {
    await sendVerificationEmail({ to: user.email, code });
  } catch (err) {
    emailSent = false;
    console.error("Error reenviando el correo de verificación:", err);
  }

  return NextResponse.json({
    ok: true,
    emailSent,
    code: !emailSent ? code : undefined,
  });
}
