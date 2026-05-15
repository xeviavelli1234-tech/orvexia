import { NextRequest, NextResponse } from "next/server";
import { runRepricer } from "@/lib/reprice/runner";

export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sin secret configurado → permitir (dev)
  const header = req.headers.get("x-cron-secret");
  const bearer = req.headers.get("authorization");
  return header === secret || bearer === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runRepricer();
    return NextResponse.json({ ok: true, ...summary, ranAt: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reprice/run] failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Vercel cron usa GET. POST disponible para disparo manual desde el dashboard.
export const GET = handle;
export const POST = handle;
