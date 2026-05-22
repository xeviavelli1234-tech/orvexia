import { NextRequest, NextResponse } from "next/server";
import { syncAllAccountsOrders } from "@/lib/reprice/orders-sync";

export const maxDuration = 300;

/**
 * GET /api/cron/sync-orders
 *
 * Sincroniza los pedidos SP-API de todas las cuentas activas. Idempotente.
 * Protegido con x-cron-secret = CRON_SECRET. En vercel.json se lanza una
 * vez al día (3:00 UTC).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await syncAllAccountsOrders({ sinceDays: 14 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
