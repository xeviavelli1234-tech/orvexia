import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { SYSTEM_PROMPT, answerLocally } from "@/lib/assistant/kb";

export const maxDuration = 30;

interface Msg {
  role: "user" | "assistant";
  content: string;
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

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Sin API key → respuesta local con la base de conocimiento.
  if (!apiKey) {
    return NextResponse.json({
      reply: answerLocally(lastUser.content),
      source: "kb",
    });
  }

  // Con API key → responde Claude (cae a local si falla).
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ASSISTANT_MODEL ?? "claude-3-5-haiku-latest",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) throw new Error(`anthropic_${res.status}`);
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      data.content
        ?.filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("\n")
        .trim() || "";

    if (!text) throw new Error("empty");
    return NextResponse.json({ reply: text, source: "ai" });
  } catch {
    return NextResponse.json({
      reply: answerLocally(lastUser.content),
      source: "kb",
    });
  }
}
