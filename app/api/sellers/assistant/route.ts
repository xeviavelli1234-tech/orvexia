import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { dispatch } from "@/lib/assistant/dispatcher";
import {
  lookupLearned,
  recordInteraction,
} from "@/lib/assistant/store";
import { parseFollowUps } from "@/lib/assistant/learning";
import { followUps as kbFollowUps } from "@/lib/assistant/kb";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const ASSISTANT_LIMIT = 30;
const ASSISTANT_WINDOW = 60_000;
function rateLimited(userId: string): boolean {
  return rateLimit("assistant-user", userId, ASSISTANT_LIMIT, ASSISTANT_WINDOW);
}

function sanitize(input: unknown): Msg[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is Msg =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

/**
 * Stream pseudo-tipeo: emite la respuesta en trozos de 3 palabras con un
 * pequeño retardo. Mantiene la UX de "está escribiendo" sin necesidad de
 * un stream real del modelo.
 */
function streamText(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const w = text.split(/(\s+)/);
  let i = 0;
  return new ReadableStream({
    pull(c) {
      if (i >= w.length) {
        c.close();
        return;
      }
      c.enqueue(enc.encode(w.slice(i, i + 3).join("")));
      i += 3;
      return new Promise((r) => setTimeout(r, 20));
    },
  });
}

function fuHeader(fus: string[]): string {
  return Buffer.from(JSON.stringify(fus), "utf-8").toString("base64");
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(session.userId)) {
    return NextResponse.json(
      { error: "rate_limited", reply: "Vas muy rápido 🙂 Espera unos segundos y reinténtalo." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const messages = sanitize((body as { messages?: unknown })?.messages);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return NextResponse.json({ error: "no_question" }, { status: 400 });

  // 1) Topic aprendido (DB, ya aprobado por humano). Sigue teniendo prioridad
  //    porque suele ser la respuesta más refinada para esa pregunta concreta.
  const learned = await lookupLearned(lastUser.content);
  if (learned) {
    const lfu = parseFollowUps(learned.followUps);
    const fu = lfu.length > 0 ? lfu : kbFollowUps(lastUser.content);
    const interactionId = await recordInteraction({
      userId: session.userId,
      question: lastUser.content,
      answer: learned.answer,
      matchedKind: "learned",
      matchedKey: learned.id,
      matchedScore: 1,
      clusterId: learned.id,
    });
    return new Response(streamText(learned.answer), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-followups": fuHeader(fu),
        ...(interactionId ? { "x-interaction-id": interactionId } : {}),
      },
    });
  }

  // 2) NLU determinístico → tool / KB / fallback. Sin LLM externo.
  //    Recuperamos contexto multi-turno del último intercambio asistente,
  //    si lo trae el cliente (lo almacenamos en messages[].content como
  //    JSON-line al final, opcional; sin contexto, sigue funcionando).
  const ctx = extractContext(messages);
  const result = await dispatch(session.userId, lastUser.content, ctx);

  const interactionId = await recordInteraction({
    userId: session.userId,
    question: lastUser.content,
    answer: result.reply,
    matchedKind: result.source === "kb" ? "static" : result.source === "tool" ? "model" : "none",
    matchedKey: result.matchedKey,
    matchedScore: result.matchedScore,
  });

  return new Response(streamText(result.reply), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-followups": fuHeader(result.followUps),
      ...(result.contextUpdate.lastProductRef
        ? { "x-context-product": encodeURIComponent(result.contextUpdate.lastProductRef) }
        : {}),
      ...(interactionId ? { "x-interaction-id": interactionId } : {}),
    },
  });
}

/**
 * Lee del último mensaje del asistente si llegó con tag <!--ctx:{...}-->
 * (el cliente puede reinyectarlo). Si no hay nada, devuelve {}.
 */
function extractContext(messages: Msg[]): { lastProductRef?: string; lastCategory?: string } {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return {};
  const m = lastAssistant.content.match(/<!--ctx:({[^]*?})-->/);
  if (!m) return {};
  try {
    const parsed = JSON.parse(m[1]);
    return {
      lastProductRef: typeof parsed.product === "string" ? parsed.product : undefined,
      lastCategory: typeof parsed.category === "string" ? parsed.category : undefined,
    };
  } catch {
    return {};
  }
}
