import { NextRequest, NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/auth";
import { ensureDestination } from "@/lib/amazon/notifications";

export const maxDuration = 30;

/**
 * Registra (una vez) la cola SQS como destino de notificaciones SP-API y
 * devuelve el destinationId. Protegido con CRON_SECRET (operación de ops).
 *
 *   curl -X POST -H "x-cron-secret: $CRON_SECRET" \
 *     https://www.orvexia.es/api/admin/notifications-setup
 *
 * Copia el destinationId a Vercel como SP_API_NOTIF_DESTINATION_ID.
 */
export async function POST(req: NextRequest) {
  const authErr = cronAuthError(req);
  if (authErr !== null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authErr });
  }
  const arn = process.env.SP_API_NOTIF_DESTINATION_ARN;
  if (!arn) {
    return NextResponse.json(
      { error: "missing_env", detail: "SP_API_NOTIF_DESTINATION_ARN" },
      { status: 400 },
    );
  }
  try {
    const destinationId = await ensureDestination(
      "orvexia-any-offer-changed",
      arn,
    );
    return NextResponse.json({ ok: true, destinationId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[notifications-setup] failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
