import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isSellerIpDenied } from "@/lib/security/seller-access";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Expone los webhookUrl (secretos de los canales): respeta la allowlist de IP.
  if (await isSellerIpDenied(session.userId)) {
    return NextResponse.json({ error: "ip_not_allowed" }, { status: 403 });
  }
  const acc = await prisma.sellerAccount.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!acc) return NextResponse.json({ channels: [] });
  const channels = await prisma.notificationChannel.findMany({
    where: { sellerAccountId: acc.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    channels: channels.map((c) => ({
      id: c.id,
      kind: c.kind,
      label: c.label,
      webhookUrl: c.webhookUrl,
      extraTarget: c.extraTarget,
      enabled: c.enabled,
      lastSentAt: c.lastSentAt ? c.lastSentAt.toISOString() : null,
      lastError: c.lastError,
    })),
  });
}
