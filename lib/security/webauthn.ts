import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Configuración del Relying Party (RP) de WebAuthn.
 *
 *  - rpName: nombre legible mostrado al usuario al registrar la passkey.
 *  - rpID: el DOMINIO (sin esquema, sin puerto) que aloja el frontend.
 *          Las credenciales quedan ligadas al rpID, así que cambiarlo
 *          invalida todas las passkeys existentes.
 *  - origin: orígenes válidos para la operación (con esquema y puerto).
 *
 * En producción configura `RP_ID` y `RP_ORIGINS` en Vercel. En local usa
 * "localhost" para que funcione sin certificado.
 */
export function rpConfig() {
  const rpName = process.env.NEXT_PUBLIC_APP_NAME || "Orvexia";
  const rpID =
    process.env.RP_ID ||
    (process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost");
  const originsEnv = process.env.RP_ORIGINS || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const origin = originsEnv.split(",").map((s) => s.trim()).filter(Boolean);
  return { rpName, rpID, origin };
}

/**
 * Guarda un challenge temporal en BD (5 min). En lugar de cookies, así
 * tolera ataques de cross-site y funciona en server actions/edge.
 */
export async function saveChallenge(
  challenge: string,
  type: "registration" | "authentication",
  userId: string | null = null,
): Promise<void> {
  await prisma.webAuthnChallenge.create({
    data: {
      userId,
      challenge,
      type,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });
}

export async function consumeChallenge(
  challenge: string,
  type: "registration" | "authentication",
): Promise<{ userId: string | null } | null> {
  const row = await prisma.webAuthnChallenge.findFirst({
    where: { challenge, type, expiresAt: { gt: new Date() } },
    select: { id: true, userId: true },
  });
  if (!row) return null;
  await prisma.webAuthnChallenge.delete({ where: { id: row.id } }).catch(() => {});
  return { userId: row.userId };
}

/** Limpieza periódica de challenges caducados (sin coste, idempotente). */
export async function purgeExpiredChallenges(): Promise<void> {
  await prisma.webAuthnChallenge
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});
}
