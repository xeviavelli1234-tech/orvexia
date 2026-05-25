import { NextRequest, NextResponse } from "next/server";
import { purgeStaleDisconnectedAccounts } from "@/lib/db/sellerAccount";

export const maxDuration = 60;

/**
 * GET /api/cron/purge-disconnected
 *
 * Cumple Amazon DPP §6 (retención) y RGPD: elimina las SellerAccount
 * desconectadas hace más de 30 días. La cascada borra listings, runs,
 * eventos, auditoría y el refresh token cifrado. En vercel.json se
 * lanza diariamente. Protegido con x-cron-secret = CRON_SECRET.
 *
 * El umbral puede ajustarse con la query ?days=N (mínimo 30) por si
 * algún día Amazon endurece la política.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const daysParam = Number(req.nextUrl.searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam >= 30 ? Math.floor(daysParam) : 30;
  try {
    const result = await purgeStaleDisconnectedAccounts(days);
    return NextResponse.json({ ok: true, thresholdDays: days, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
