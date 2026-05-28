import { NextRequest, NextResponse } from "next/server";
import { runWeeklyDigestForAll } from "@/lib/reprice/weekly-digest";
import { cronAuthError } from "@/lib/cron/auth";

export const maxDuration = 300;

/**
 * GET /api/cron/weekly-digest
 * Lunes a las 8 UTC envía el resumen semanal por cuenta.
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
    const result = await runWeeklyDigestForAll();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
