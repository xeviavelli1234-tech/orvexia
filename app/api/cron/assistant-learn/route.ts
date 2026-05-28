import { NextRequest, NextResponse } from "next/server";
import { runLearningCycle } from "@/lib/assistant/store";
import { cronAuthError } from "@/lib/cron/auth";

/**
 * GET /api/cron/assistant-learn
 *
 * Ejecuta un ciclo del motor de aprendizaje del asistente: agrupa
 * interacciones recientes con baja confianza o feedback negativo y
 * crea candidatos AssistantLearnedTopic (approved=false) para que el
 * admin los revise.
 *
 * Protegido con `x-cron-secret = CRON_SECRET` (fail-closed en producción).
 * En dev sin secret se puede llamar manualmente (útil en local).
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
    const result = await runLearningCycle();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
