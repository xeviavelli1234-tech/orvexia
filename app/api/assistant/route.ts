import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { answerPublic } from "@/lib/assistant/public";

export const dynamic = "force-dynamic";

/**
 * POST /api/assistant
 *
 * Body: { question: string }
 *
 * Devuelve una respuesta del asistente público (sin LLM externo): cubre la
 * web del comparador entera (búsqueda, ofertas, guías, cuenta, RGPD…). Si
 * el usuario está logueado, lee su userId de la cookie para responder
 * a intents tipo "mis guardados / mis alertas".
 */
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const question = typeof (body as { question?: unknown }).question === "string"
    ? ((body as { question: string }).question).slice(0, 500)
    : "";

  if (!question.trim()) {
    return NextResponse.json({ error: "Falta 'question'" }, { status: 400 });
  }

  const session = await getSession().catch(() => null);
  const answer = await answerPublic({ question, userId: session?.userId ?? null });

  return NextResponse.json(answer);
}
