import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Registra un cambio de configuración (auditoría). Best-effort: nunca
 * lanza ni rompe la acción del usuario aunque falle el log.
 */
export async function recordAudit(
  userId: string,
  action: string,
  detail: string,
): Promise<void> {
  try {
    const acc = await prisma.sellerAccount.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!acc) return;
    await prisma.auditLog.create({
      data: {
        sellerAccountId: acc.id,
        action: action.slice(0, 60),
        detail: detail.slice(0, 500),
      },
    });
  } catch (e) {
    console.warn("[audit] no se pudo registrar:", e);
  }
}

export interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  createdAt: string; // ISO
}

export async function listAudit(
  userId: string,
  limit = 100,
): Promise<AuditEntry[]> {
  const acc = await prisma.sellerAccount.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!acc) return [];
  const rows = await prisma.auditLog.findMany({
    where: { sellerAccountId: acc.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(500, Math.max(1, limit)),
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    detail: r.detail,
    createdAt: r.createdAt.toISOString(),
  }));
}
