import { NextRequest, NextResponse } from "next/server";
import { runRepricer } from "@/lib/reprice/runner";
import { getSession } from "@/lib/session";
import { cronAuthError } from "@/lib/cron/auth";

export const maxDuration = 60;

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // 1) Cron de Vercel: secret válido (fail-closed en producción si no está
  //    configurado — ver lib/cron/auth.ts).
  if (cronAuthError(req) === null) return true;

  // 2) Disparo manual desde el dashboard: basta con sesión iniciada.
  const session = await getSession();
  return !!session;
}

async function handle(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // POST = disparo manual desde el panel → fuerza el ciclo (ignora el
    // intervalo y el horario). GET = cron de Vercel → respeta intervalo.
    const force = req.method === "POST";
    const summary = await runRepricer(new Date(), { force });
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
