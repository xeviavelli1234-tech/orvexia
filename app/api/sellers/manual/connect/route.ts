import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { upsertManualSellerAccount } from "@/lib/db/sellerAccount";

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
  try {
    await upsertManualSellerAccount(session.userId);
  } catch (e) {
    console.error("[manual/connect] failed:", e);
    return NextResponse.json({ error: "manual_connect_failed" }, { status: 500 });
  }
  return NextResponse.redirect(
    new URL("/dashboard/repricer?status=manual_connected", req.url),
  );
}
