import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * GET /api/sellers/assistant/status
 *
 * Devuelve el estado del asistente: si hay clave de IA (Anthropic), si
 * hay topics aprobados aprendidos, y si la BD de feedback responde. Lo
 * usa el chat para mostrar un badge "IA activa" vs "Respuestas locales".
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const aiEnabled = !!process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    ok: true,
    aiEnabled,
    mode: aiEnabled ? "ai" : "local",
    model: aiEnabled ? (process.env.ASSISTANT_MODEL ?? "claude-3-5-haiku-latest") : null,
  });
}
