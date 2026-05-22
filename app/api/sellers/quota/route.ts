import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getTodayUsage, getLastDaysUsage } from "@/lib/reprice/quota";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const acc = await prisma.sellerAccount.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  if (!acc) return NextResponse.json({ ok: true, today: null, series: [] });
  const [today, series] = await Promise.all([
    getTodayUsage(acc.id),
    getLastDaysUsage(acc.id, 14),
  ]);
  return NextResponse.json({
    ok: true,
    today: today
      ? {
          day: today.day.toISOString().slice(0, 10),
          patchCount: today.patchCount,
          patchRetries: today.patchRetries,
          errorCount: today.errorCount,
          rateLimitedCount: today.rateLimitedCount,
        }
      : null,
    series: series.map((s) => ({
      day: s.day.toISOString().slice(0, 10),
      patchCount: s.patchCount,
      patchRetries: s.patchRetries,
      errorCount: s.errorCount,
      rateLimitedCount: s.rateLimitedCount,
    })),
  });
}
