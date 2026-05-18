import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { listListingsByAccount } from "@/lib/db/sellerListing";
import { SYSTEM_PROMPT, answerLocally, followUps } from "@/lib/assistant/kb";

export const maxDuration = 30;

interface Msg {
  role: "user" | "assistant";
  content: string;
}

// ── Rate limit en memoria (por usuario) ──
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
      .slice(0, 6)
      .map((l) => {
        const st =
          l.priceCurrent <= 0 || !l.asin
            ? "sin oferta (gris)"
            : l.repricingEnabled
              ? "repreciando (verde)"
              : "configurable (azul)";
        const range =
          l.priceMin != null && l.priceMax != null
            ? `rango ${l.priceMin}-${l.priceMax}`
            : "sin rango";
        return `  - "${l.title.slice(0, 50)}": ${eur(l.priceCurrent, l.currency)}, ${l.strategy}, ${range}, ${st}`;
      })
      .join("\n");

    return [
      `Plan: ${plan} (ciclo cada ${cycle} min). Última sincronización: ${lastSync}.`,
      `Catálogo: ${items.length} productos, ${withPrice} con precio, ${active} repreciando.`,
      items.length ? `Muestra de productos:\n${sample}` : "Sin productos sincronizados todavía.",
    ].join("\n");
  } catch {
    return "No se pudo cargar el contexto del usuario.";
  }
}

function localStream(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const words = text.split(/(\s+)/);
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= words.length) {
        controller.close();
        return;
      }
      // 2-3 tokens por tick para una cadencia natural
      const slice = words.slice(i, i + 3).join("");
      i += 3;
      controller.enqueue(enc.encode(slice));
      return new Promise((r) => setTimeout(r, 22));
    },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
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
  if (!lastUser) {
    return NextResponse.json({ error: "no_question" }, { status: 400 });
  }

  const fu = followUps(lastUser.content);
  const fuHeader = Buffer.from(JSON.stringify(fu), "utf-8").toString("base64");
  const headers = {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-followups": fuHeader,
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const context = await buildContext(session.userId);
  const system = `${SYSTEM_PROMPT}\n\nDATOS DEL USUARIO (úsalos para responder concreto; no los recites tal cual):\n${context}`;

  if (!apiKey) {
    return new Response(localStream(answerLocally(lastUser.content)), { headers });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emitted = false;
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.ASSISTANT_MODEL ?? "claude-3-5-haiku-latest",
            max_tokens: 600,
            system,
            stream: true,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        if (!r.ok || !r.body) throw new Error(`anthropic_${r.status}`);

        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const js = line.slice(5).trim();
            if (!js || js === "[DONE]") continue;
            try {
              const ev = JSON.parse(js) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };
              if (
                ev.type === "content_block_delta" &&
                ev.delta?.type === "text_delta" &&
                ev.delta.text
              ) {
                emitted = true;
                controller.enqueue(enc.encode(ev.delta.text));
              }
            } catch {
              /* línea SSE no-JSON */
            }
          }
        }
      } catch {
        /* cae a KB local abajo */
      }

      if (!emitted) {
        const fallback = answerLocally(lastUser.content);
        const words = fallback.split(/(\s+)/);
        for (let i = 0; i < words.length; i += 3) {
          controller.enqueue(enc.encode(words.slice(i, i + 3).join("")));
          await new Promise((res) => setTimeout(res, 22));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, { headers });
}
