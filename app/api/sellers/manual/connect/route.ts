import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { upsertManualSellerAccount } from "@/lib/db/sellerAccount";
import { isSellerIpDenied } from "@/lib/security/seller-access";

/**
 * Modo MANUAL: crea una SellerAccount sin OAuth de Amazon.
 *
 * Pensado para vendedores que NO están en Amazon (Shopify, WooCommerce, tienda
 * física, web propia…). Después de aterrizar, suben su catálogo vía CSV y
 * usan el repricer como motor de sugerencias.
 *
 * El repricer en modo manual nunca escribe en Amazon: solo lee CSV y devuelve
 * un plan de precios para que el vendedor lo aplique manualmente donde venda.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Misma allowlist de IP que el resto de mutaciones de seller (sync/import/
  // disconnect): el layout no cubre /api, así que hay que comprobarlo aquí.
  if (await isSellerIpDenied(session.userId)) {
    return NextResponse.json({ error: "ip_not_allowed" }, { status: 403 });
  }

  // Pasar a CSV una cuenta Amazon ACTIVA es destructivo (para el sync). Solo se
  // permite con confirmación explícita; la UI la añade tras un confirm().
  const form = await req.formData().catch(() => null);
  const confirmSwitch = form?.get("confirm") === "switch-to-manual";

  try {
    await upsertManualSellerAccount(session.userId, { confirmSwitch });
  } catch (e) {
    if (e instanceof Error && e.message === "amazon_active_requires_confirm") {
      // Cuenta Amazon activa sin confirmar → no la degradamos; volvemos al hub
      // de revinculación con aviso, sin tocar nada.
      return NextResponse.redirect(
        new URL("/dashboard/repricer?relink=1&status=switch_needs_confirm", req.url),
      );
    }
    console.error("[manual/connect] failed:", e);
    return NextResponse.json({ error: "manual_connect_failed" }, { status: 500 });
  }
  return NextResponse.redirect(
    new URL("/dashboard/repricer?status=manual_connected", req.url),
  );
}
