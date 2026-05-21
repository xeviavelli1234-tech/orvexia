import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeIp } from "./request";
import { sendNewLocationEmail } from "@/lib/email";

export interface AttemptInput {
  userId: string | null;
  email: string | null;
  ip: string | null;
  country: string | null;
  userAgent: string | null;
  method: "password" | "passkey" | "magic" | "totp_verify" | "google";
  success: boolean;
  reason?: string;
}

/** Registra intento de inicio (best-effort: nunca lanza). */
export async function recordLoginAttempt(input: AttemptInput): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        userId: input.userId,
        email: input.email?.slice(0, 200) ?? null,
        ip: input.ip?.slice(0, 60) ?? null,
        country: input.country?.slice(0, 6) ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
        method: input.method,
        success: input.success,
        reason: input.reason?.slice(0, 100) ?? null,
      },
    });
  } catch (e) {
    console.warn("[security] recordLoginAttempt failed:", e);
  }
}

export interface CheckLocationInput {
  userId: string;
  email: string;
  name: string;
  ip: string | null;
  country: string | null;
  userAgent: string | null;
}

/**
 * Si la IP/ubicación es nueva para este usuario, guarda registro de
 * TrustedLocation y envía un email de aviso. Idempotente: la segunda
 * vez desde el mismo prefijo solo actualiza lastSeenAt.
 */
export async function checkAndMarkLocation(input: CheckLocationInput): Promise<{
  isNew: boolean;
}> {
  if (!input.ip) return { isNew: false };
  const key = normalizeIp(input.ip);

  try {
    const existing = await prisma.trustedLocation.findUnique({
      where: { userId_ip: { userId: input.userId, ip: key } },
      select: { id: true, label: true },
    });
    if (existing) {
      await prisma.trustedLocation.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      });
      return { isNew: false };
    }
    await prisma.trustedLocation.create({
      data: {
        userId: input.userId,
        ip: key,
        country: input.country ?? null,
      },
    });
    // Email de aviso (best-effort): si Resend no está configurado, no rompe.
    sendNewLocationEmail({
      to: input.email,
      name: input.name,
      ip: input.ip,
      country: input.country,
      userAgent: input.userAgent,
      when: new Date(),
    }).catch((e) => console.warn("[security] new-location email failed:", e));
    return { isNew: true };
  } catch (e) {
    console.warn("[security] checkAndMarkLocation failed:", e);
    return { isNew: false };
  }
}

export async function listLoginAttempts(userId: string, take = 30) {
  return prisma.loginAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function listTrustedLocations(userId: string) {
  return prisma.trustedLocation.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
  });
}
