import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { recordFeedback } from "@/lib/assistant/store";

export const maxDuration = 10;

/**
 * POST /api/sellers/assistant/feedback
 * Body: { interactionId: string, helpful: boolean }
 *
 * Marca la última respuesta del asistente como útil/no útil. Si la respuesta
 * provino de un topic aprendido, ajusta su reputación y refresca la caché.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { interactionId?: unknown; helpful?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const id = typeof body.interactionId === "string" ? body.interactionId : "";
  const helpful = typeof body.helpful === "boolean" ? body.helpful : null;
  if (!id || helpful === null) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  const ok = await recordFeedback(id, helpful);
  return NextResponse.json({ ok });
}
