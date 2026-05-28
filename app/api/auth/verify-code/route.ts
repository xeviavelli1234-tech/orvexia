import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { deleteExpiredUnverified } from "@/lib/db/user";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const code = body?.code as string | undefined;

  if (!email || !code) {
    return NextResponse.json(
      { message: "Email y código son requeridos" },
      { status: 400 }
    );
  }

  // El código es de 6 dígitos (900k combinaciones). Sin límite, sería
  // fuerza-brutable → toma de cuenta. 5 intentos por email cada 10 min hace
  // inviable el ataque (años para agotar el espacio dentro de la ventana de
  // validez del código).
  if (rateLimit("verify-code", email, 5, 10 * 60_000)) {
    return NextResponse.json(
      { message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  await cleanupExpiredUnverified();
  await deleteExpiredUnverified();

  const user = await prisma.user.findFirst({
    where: {
      email,
      verificationToken: code,
      verificationTokenExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "Código inválido o expirado" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
    },
  });

  await createSession({
    userId: user.id,
    name: user.name,
    email: user.email,
  });

  return NextResponse.json({ ok: true });
}
