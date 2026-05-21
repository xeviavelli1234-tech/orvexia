import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendMagicLinkEmail } from "@/lib/email";
import { readRequestMeta } from "@/lib/security/request";

const HITS = new Map<string, number[]>();
const LIMIT = 5;
const WINDOW = 10 * 60_000; // 5 envíos / 10 min por email
function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (HITS.get(key) ?? []).filter((t) => now - t < WINDOW);
  arr.push(now);
  HITS.set(key, arr);
  return arr.length > LIMIT;
}

function baseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

/**
 * POST /api/auth/magic/request
 * Body: { email: string }
 *
 * Genera un token cripto-aleatorio, lo guarda hasheado (bcrypt) y manda el
 * enlace por email. SIEMPRE devuelve ok=true (incluso si el email no existe)
 * para no revelar qué cuentas hay registradas.
 */
export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }
  const meta = readRequestMeta(req);
  // Doble rate-limit: por email Y por IP. Frena tanto spam de cuentas
  // como abusos masivos desde una misma IP.
  if (rateLimited(`email:${email}`)) {
    return NextResponse.json({ ok: true, throttled: true });
  }
  if (meta.ip && rateLimited(`ip:${meta.ip}`)) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true },
  });
  if (!user || !user.emailVerified) {
    // No filtramos existencia; respondemos ok=true igualmente.
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString("base64url"); // 256 bits
  const tokenHash = await bcrypt.hash(token, 10);

  await prisma.magicLink.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ipAtRequest: meta.ip ?? null,
    },
  });

  const url = `${baseUrl()}/login/magic?token=${encodeURIComponent(token)}&id=${user.id}`;
  sendMagicLinkEmail({ to: user.email, name: user.name, url }).catch(() => {});

  return NextResponse.json({ ok: true });
}
