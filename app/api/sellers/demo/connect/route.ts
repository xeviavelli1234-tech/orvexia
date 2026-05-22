import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { upsertSellerAccount } from "@/lib/db/sellerAccount";

/**
 * Modo DEMO: crea un SellerAccount en modo fixtures (sin OAuth de Amazon).
 * Permite probar todo el flujo (sync, reprecio, dashboards) end-to-end
 * mientras la verificación de identidad de developer está pendiente.
 *
 * spApiEnv = "sandbox" → isFixtureMode = true → cero llamadas a Amazon real.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await upsertSellerAccount({
      userId: session.userId,
      amazonSellerId: `DEMO-${session.userId.slice(0, 12)}`,
      refreshToken: "FIXTURE_NO_TOKEN",
      spApiEnv: "sandbox",
    });
  } catch (e) {
    console.error("[demo/connect] failed:", e);
    return NextResponse.json({ error: "demo_connect_failed" }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/dashboard/repricer?status=demo_connected", req.url));
}
