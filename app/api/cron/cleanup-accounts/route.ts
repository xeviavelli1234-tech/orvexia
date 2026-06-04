import { NextRequest, NextResponse } from "next/server";
import { deleteExpiredUnverified } from "@/lib/db/user";
import { cronAuthError } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/cleanup-accounts
 *
 * Elimina cuentas no verificadas cuyo token de verificación ha caducado.
 *
 * Antes esto se disparaba desde el middleware en CADA navegación (una DELETE
 * por visita a la home), lo que quemaba cuota de cómputo de la BD sin necesidad.
 * Ahora corre una vez al día como cron. Protegido con x-cron-secret = CRON_SECRET
 * (fail-closed en producción, ver lib/cron/auth.ts). Idempotente.
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
    const { count } = await deleteExpiredUnverified();
    return NextResponse.json({ ok: true, removed: count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
