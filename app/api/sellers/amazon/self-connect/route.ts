import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { upsertSellerAccount } from "@/lib/db/sellerAccount";

/**
 * Self-authorization de producción (app privada, cuenta propia).
 *
 * El refresh token de producción se obtuvo vía "Autorizar" en el Solution
 * Provider Portal y se guarda como variable de entorno en Vercel
 * (SP_API_REFRESH_TOKEN) — NUNCA en git. El merchant token (sellerId) va
 * en SP_API_SELLER_ID. Este endpoint crea/actualiza el SellerAccount del
 * usuario logueado con esas credenciales reales, cifrando el token.
 *
 * Pensado para uso propio (un solo seller). Para multi-seller real se
 * volvería al flujo OAuth web.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?next=/dashboard/repricer", req.url));
  }

  const refreshToken = process.env.SP_API_REFRESH_TOKEN;
  const sellerId = process.env.SP_API_SELLER_ID;
  const env = (process.env.SP_API_ENV ?? "sandbox") as "sandbox" | "production";

  if (!refreshToken || !sellerId) {
    return NextResponse.redirect(
      new URL("/dashboard/repricer?status=error_selfconnect_env", req.url),
    );
  }
  if (env !== "production") {
    return NextResponse.redirect(
      new URL("/dashboard/repricer?status=error_not_production", req.url),
    );
  }

  try {
    await upsertSellerAccount({
      userId: session.userId,
      amazonSellerId: sellerId,
      refreshToken,
      spApiEnv: "production",
    });
  } catch (e) {
    console.error("[self-connect] failed:", e);
    return NextResponse.redirect(
      new URL("/dashboard/repricer?status=error_persist", req.url),
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard/repricer?status=connected", req.url),
  );
}
