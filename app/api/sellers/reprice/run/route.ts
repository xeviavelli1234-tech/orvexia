import { NextRequest, NextResponse } from "next/server";
import { runRepricer } from "@/lib/reprice/runner";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { cronAuthError } from "@/lib/cron/auth";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * GET = cron de Vercel: ciclo GLOBAL (todas las cuentas), respeta intervalo y
 * horario de cada una. Autorización fail-closed por CRON_SECRET
 * (ver lib/cron/auth.ts). NO se permite con solo sesión: un ciclo global
 * consume cuota SP-API real de TODAS las cuentas y no debe poder dispararlo
 * un usuario cualquiera.
 */
export async function GET(req: NextRequest) {
  const authErr = cronAuthError(req);
  if (authErr !== null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authErr });
  }
  try {
    const summary = await runRepricer(new Date(), { force: false });
    return NextResponse.json({ ok: true, ...summary, ranAt: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reprice/run] cron failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * POST = disparo manual desde el panel ("Ejecutar reprecio ahora"). SOLO la
 * cuenta del usuario autenticado y fuerza el ciclo (ignora intervalo y
 * horario; sigue respetando plan, vacaciones y el lock). Nunca toca otras
 * cuentas.
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Un ciclo completo de cuenta cuesta cuota SP-API: defendemos el endpoint
  // contra clicks rápidos / scripting (el botón ya se desactiva mientras corre).
  if (rateLimit("reprice-run", session.userId, 6, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const account = await getSellerAccountByUserId(session.userId);
  if (!account || !account.active) {
    return NextResponse.json({ error: "no_active_account" }, { status: 400 });
  }
  if (account.mode === "manual") {
    return NextResponse.json({ error: "manual_mode" }, { status: 400 });
  }
  try {
    const summary = await runRepricer(new Date(), { force: true, accountId: account.id });
    return NextResponse.json({ ok: true, ...summary, ranAt: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reprice/run] manual failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
