import { NextRequest, NextResponse } from "next/server";
import { auditAllAccountsReimbursements } from "@/lib/reimbursements/audit";
import { cronAuthError } from "@/lib/cron/auth";

export const maxDuration = 300;

/**
 * GET /api/cron/audit-reimbursements
 *
 * Audita los eventos financieros SP-API de todas las cuentas activas en busca
 * de dinero que Amazon debe (inventario perdido/dañado, devoluciones no
 * repuestas, tarifas duplicadas). Idempotente: dedupeKey por cuenta evita
 * duplicar reclamaciones entre ejecuciones. Protegido con CRON_SECRET.
 * En vercel.json se lanza una vez al día.
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
    const result = await auditAllAccountsReimbursements();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
