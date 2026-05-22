import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/**
 * GET /api/sellers/assistant/status
 *
 * Estado del asistente. Tras la migración a IA 100% local (NLU determinístico
 * + KB + tools), siempre devolvemos mode="local" — sin dependencia de cloud,
 * sin coste por token, sin latencia de red.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    ok: true,
    aiEnabled: true,
    mode: "local",
    model: "orvexia-local-nlu",
  });
}
