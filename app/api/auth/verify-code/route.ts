import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { deleteExpiredUnverified } from "@/lib/db/user";

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
