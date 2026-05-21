import { NextRequest, NextResponse } from "next/server";
import { runLearningCycle } from "@/lib/assistant/store";

/**
 * GET /api/cron/assistant-learn
 *
 * Ejecuta un ciclo del motor de aprendizaje del asistente: agrupa
 * interacciones recientes con baja confianza o feedback negativo y
 * crea candidatos AssistantLearnedTopic (approved=false) para que el
 * admin los revise.
 *
 * Protegido con `x-cron-secret = CRON_SECRET`. Sin secret, se puede
 * llamar manualmente (útil en local).
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
    const result = await runLearningCycle();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
