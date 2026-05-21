import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { listListingsByAccount } from "@/lib/db/sellerListing";
import {
  SYSTEM_PROMPT,
  TOOLS_GUIDE,
  answerLocally,
  followUps,
  matchTopic,
} from "@/lib/assistant/kb";
import { TOOLS, executeTool } from "@/lib/assistant/tools";
import {
  lookupLearned,
  recordInteraction,
  getApprovedLearnedTopics,
} from "@/lib/assistant/store";
import { parseFollowUps } from "@/lib/assistant/learning";

export const maxDuration = 45;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const HITS = new Map<string, number[]>();
const LIMIT = 20;
const WINDOW = 60_000;
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (HITS.get(userId) ?? []).filter((t) => now - t < WINDOW);
  arr.push(now);
  HITS.set(userId, arr);
  return arr.length > LIMIT;
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

function eur(n: number, c: string) {
  const s = c === "USD" ? "$" : c === "GBP" ? "£" : "€";
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${s}`;
}

async function buildContext(userId: string): Promise<string> {
  try {
    const acc = await getSellerAccountByUserId(userId);
    if (!acc || !acc.active) return "El usuario aún no tiene una cuenta de Amazon conectada.";
    const items = await listListingsByAccount(acc.id);
    const withPrice = items.filter((l) => l.priceCurrent > 0).length;
    const active = items.filter((l) => l.repricingEnabled).length;
    const plan = acc.plan === "PRO" ? "PRO" : "TRIAL";
    const cycle = Math.round((acc.intervalSeconds ?? 900) / 60);
    const lastSync = acc.lastSyncAt
      ? new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(
          acc.lastSyncAt,
        )
      : "nunca";
    const sample = items
      .slice(0, 8)
      .map((l) => {
        const st =
          l.priceCurrent <= 0 || !l.asin
            ? "gris"
            : l.repricingEnabled
              ? "verde"
              : "azul";
        const range =
          l.priceMin != null && l.priceMax != null ? `${l.priceMin}-${l.priceMax}` : "sin rango";
        return `  - "${l.title.slice(0, 50)}" [SKU ${l.sku}]: ${eur(l.priceCurrent, l.currency)}, ${l.strategy}, ${range}, ${st}`;
      })
      .join("\n");
    return [
      `Plan: ${plan} (ciclo cada ${cycle} min). Última sincronización: ${lastSync}.`,
      `Catálogo: ${items.length} productos, ${withPrice} con precio, ${active} repreciando.`,
      items.length ? `Muestra:\n${sample}` : "Sin productos sincronizados todavía.",
    ].join("\n");
  } catch {
    return "No se pudo cargar el contexto del usuario.";
  }
}

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

interface Block {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}
interface AnthropicMsg {
  role: "user" | "assistant";
  content: string | Block[] | Array<Record<string, unknown>>;
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

  // 1) Intento: topic aprendido (DB, cacheado 5 min, ya aprobado por humano)
  const learned = await lookupLearned(lastUser.content);
  if (learned) {
    const lfu = parseFollowUps(learned.followUps);
    const fu = lfu.length > 0 ? lfu : followUps(lastUser.content);
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
        "x-followups": Buffer.from(JSON.stringify(fu), "utf-8").toString("base64"),
        ...(interactionId ? { "x-interaction-id": interactionId } : {}),
      },
    });
  }

  const fuHeader = Buffer.from(JSON.stringify(followUps(lastUser.content)), "utf-8").toString(
    "base64",
  );
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const context = await buildContext(session.userId);

  // Topics aprendidos como bloque adicional para el modelo (pocas líneas).
  const learnedTopics = await getApprovedLearnedTopics();
  const learnedBlock =
    learnedTopics.length > 0
      ? `\n\nCONOCIMIENTO APRENDIDO (aprobado manualmente, prioritario):\n${learnedTopics
          .slice(0, 30)
          .map((t) => `- [${t.keywords}] ${t.answer.slice(0, 300).replace(/\n+/g, " ")}`)
          .join("\n")}`
      : "";

  const system = `${SYSTEM_PROMPT}\n\n${TOOLS_GUIDE}${learnedBlock}\n\nDATOS DEL USUARIO (úsalos para responder concreto; no los recites literalmente):\n${context}`;

  if (!apiKey) {
    // 2) Sin API key: caemos al matcher estático y registramos (matchedScore=0 si no hay topic)
    const m = matchTopic(lastUser.content);
    const answer = m?.answer ?? answerLocally(lastUser.content);
    const interactionId = await recordInteraction({
      userId: session.userId,
      question: lastUser.content,
      answer,
      matchedKind: m ? "static" : "none",
      matchedKey: m?.matchedKey ?? null,
      matchedScore: m?.matchedScore ?? 0,
    });
    return new Response(streamText(answer), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-followups": fuHeader,
        ...(interactionId ? { "x-interaction-id": interactionId } : {}),
      },
    });
  }

  const model = process.env.ASSISTANT_MODEL ?? "claude-3-5-haiku-latest";
  const convo: AnthropicMsg[] = messages.map((m) => ({ role: m.role, content: m.content }));

  async function callAnthropic() {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey as string,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        system,
        tools: TOOLS,
        messages: convo,
      }),
    });
    if (!r.ok) throw new Error(`anthropic_${r.status}`);
    return (await r.json()) as {
      content: Block[];
      stop_reason: string;
    };
  }

  try {
    let finalText = "";
    for (let step = 0; step < 5; step++) {
      const data = await callAnthropic();
      const toolUses = data.content.filter((b) => b.type === "tool_use");
      const text = data.content
        .filter((b) => b.type === "text" && b.text)
        .map((b) => b.text)
        .join("\n")
        .trim();

      if (data.stop_reason === "tool_use" && toolUses.length > 0) {
        convo.push({ role: "assistant", content: data.content });
        const results: Array<Record<string, unknown>> = [];
        for (const tu of toolUses) {
          const out = await executeTool(session.userId, tu.name ?? "", tu.input ?? {});
          results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
        }
        convo.push({ role: "user", content: results });
        continue;
      }

      finalText = text || "Hecho.";
      break;
    }
    if (!finalText) finalText = "He completado la operación.";
    const interactionId = await recordInteraction({
      userId: session.userId,
      question: lastUser.content,
      answer: finalText,
      matchedKind: "model",
    });
    return new Response(streamText(finalText), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-followups": fuHeader,
        ...(interactionId ? { "x-interaction-id": interactionId } : {}),
      },
    });
  } catch {
    const m = matchTopic(lastUser.content);
    const answer = m?.answer ?? answerLocally(lastUser.content);
    const interactionId = await recordInteraction({
      userId: session.userId,
      question: lastUser.content,
      answer,
      matchedKind: m ? "static" : "none",
      matchedKey: m?.matchedKey ?? null,
      matchedScore: m?.matchedScore ?? 0,
    });
    return new Response(streamText(answer), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-followups": fuHeader,
        ...(interactionId ? { "x-interaction-id": interactionId } : {}),
      },
    });
  }
}
