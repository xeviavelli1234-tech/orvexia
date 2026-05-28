import { NextRequest, NextResponse } from "next/server";
import { syncAllAccountsOrders } from "@/lib/reprice/orders-sync";
import { cronAuthError } from "@/lib/cron/auth";

export const maxDuration = 300;

/**
 * GET /api/cron/sync-orders
 *
 * Sincroniza los pedidos SP-API de todas las cuentas activas. Idempotente.
 * Protegido con x-cron-secret = CRON_SECRET (fail-closed en producción).
 * En vercel.json se lanza una vez al día (3:00 UTC).
 */
export async function GET(req: NextRequest) {
  const authErr = cronAuthError(req);
  if (authErr) {
    return NextResponse.json(
      { error: authErr === 503 ? "cron_not_configured" : "Unauthorized" },
      { status: authErr },
    );
  }
  try {
    const result = await syncAllAccountsOrders({ sinceDays: 14 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
