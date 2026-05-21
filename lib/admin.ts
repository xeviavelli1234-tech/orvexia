import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Admin = email del usuario presente en la env `ADMIN_EMAILS` (lista separada por comas).
 * Si la env no está definida, hay un único admin por defecto: el correo de soporte
 * (orvexiaesp@gmail.com), para que el panel funcione en local sin configurar nada.
 */
export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return ["orvexiaesp@gmail.com"];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!u) return false;
    return adminEmails().includes(u.email.toLowerCase());
  } catch {
    return false;
  }
}
