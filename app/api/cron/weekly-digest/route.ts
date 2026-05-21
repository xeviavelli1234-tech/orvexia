import { NextRequest, NextResponse } from "next/server";
import { runWeeklyDigestForAll } from "@/lib/reprice/weekly-digest";

export const maxDuration = 300;

/**
 * GET /api/cron/weekly-digest
 * Lunes a las 8 UTC envía el resumen semanal por cuenta.
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
    const result = await runWeeklyDigestForAll();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
