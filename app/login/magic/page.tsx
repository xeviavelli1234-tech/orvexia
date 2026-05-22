import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { readRequestMeta } from "@/lib/security/request";
import { headers } from "next/headers";
import {
  recordLoginAttempt,
  checkAndMarkLocation,
} from "@/lib/security/login-monitoring";

export const metadata = { title: "Acceso por enlace · Orvexia" };
export const dynamic = "force-dynamic";

interface SearchParams {
  token?: string;
  id?: string;
}

export default async function MagicLogin({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const userId = typeof sp.id === "string" ? sp.id : "";

  // Recrea metadata de la petición a partir de los headers (RSC)
  const h = await headers();
  const meta = readRequestMeta(new Request("http://x", { headers: h }));

  if (!token || !userId) return failure("Enlace inválido");

  const candidates = await prisma.magicLink.findMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  let match: { id: string } | null = null;
  for (const c of candidates) {
    if (await bcrypt.compare(token, c.tokenHash)) {
      match = { id: c.id };
      break;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!match || !user) {
    await recordLoginAttempt({
      ...meta,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      method: "magic",
      success: false,
      reason: "invalid_or_expired",
    });
    return failure("Enlace caducado o no válido. Pide uno nuevo desde la pantalla de inicio de sesión.");
  }

  // Consumimos el token
  await prisma.magicLink.update({
    where: { id: match.id },
    data: { usedAt: new Date() },
  });

  await createSession({ userId: user.id, email: user.email, name: user.name }, true);
  await recordLoginAttempt({
    ...meta,
    userId: user.id,
    email: user.email,
    method: "magic",
    success: true,
    reason: "ok",
  });
  await checkAndMarkLocation({
    userId: user.id,
    email: user.email,
    name: user.name,
    ip: meta.ip,
    country: meta.country,
    userAgent: meta.userAgent,
  });

  redirect("/dashboard");
}

function failure(text: string) {
  return (
    <main className="max-w-md mx-auto px-5 py-20 text-center">
      <h1 className="text-2xl font-bold text-white">No se ha podido entrar</h1>
      <p className="mt-3 text-sm text-white/60">{text}</p>
      <a
        href="/login"
        className="mt-6 inline-block rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-semibold text-white"
      >
        Volver al inicio de sesión
      </a>
    </main>
  );
}
