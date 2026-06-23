import { NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readRequestMeta } from "@/lib/security/request";
import { rateLimit } from "@/lib/rate-limit";
import { sendLeadWelcomeEmail } from "@/lib/email";

export const maxDuration = 15;

// Validación de email sencilla y suficiente para captación (no es auth).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/leads  (PÚBLICO)
 * Captura de leads desde la web (simulador, lista de espera). Guarda el email
 * y un contexto opcional. Envío de confirmación best-effort (nunca bloquea).
 *
 * Body: { email (req), source?, context? }
 */
export async function POST(req: Request) {
  const meta = readRequestMeta(req);
  if (rateLimit("leads-capture", meta.ip ?? "anon", 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const source =
    typeof body.source === "string" && body.source.trim()
      ? body.source.trim().slice(0, 40)
      : "simulador";
  const context =
    body.context && typeof body.context === "object"
      ? (body.context as Prisma.InputJsonValue)
      : undefined;

  try {
    await prisma.lead.create({
      data: { email, source, context, ip: meta.ip ?? null },
    });
  } catch (err) {
    console.error("[leads] create_failed", err);
    return NextResponse.json({ error: "persist" }, { status: 500 });
  }

  // Confirmación best-effort: si Resend no está configurado, no pasa nada.
  await sendLeadWelcomeEmail({ to: email }).catch(() => {});

  return NextResponse.json({ ok: true });
}
