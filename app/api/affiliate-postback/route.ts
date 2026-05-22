import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { affiliatePostbackSchema } from "@/lib/validations";
import type { AffiliateConversionStatus } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

function statusMap(s: string): AffiliateConversionStatus {
  switch (s.toLowerCase()) {
    case "approved": return "APPROVED";
    case "rejected":
    case "declined": return "REJECTED";
    default:         return "PENDING";
  }
}

function checkSecret(provided: string | null): boolean {
  const expected = process.env.AFFILIATE_POSTBACK_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handle(req: NextRequest, params: Record<string, string>) {
  if (!checkSecret(params.secret ?? null)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = affiliatePostbackSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const { secret: _drop, ...raw } = params; // no guardar el secret en BD
  void _drop;

  try {
    const conv = await prisma.affiliateConversion.upsert({
      where: {
        network_transactionId: {
          network:       data.network,
          transactionId: data.transactionId,
        },
      },
      create: {
        network:       data.network,
        transactionId: data.transactionId,
        store:         data.store,
        amount:        data.amount,
        commission:    data.commission,
        currency:      data.currency,
        status:        statusMap(data.status),
        clickEventId:  data.clickref ?? null,
        rawPayload:    raw,
      },
      update: {
        amount:       data.amount,
        commission:   data.commission,
        currency:     data.currency,
        status:       statusMap(data.status),
        clickEventId: data.clickref ?? undefined,
        rawPayload:   raw,
      },
      select: { id: true, status: true },
    });
    return NextResponse.json({ ok: true, id: conv.id, status: conv.status });
  } catch (err) {
    console.error("[affiliate-postback] failed:", err);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  return handle(req, params);
}

export async function POST(req: NextRequest) {
  const fromQuery = Object.fromEntries(req.nextUrl.searchParams.entries());
  const ct = req.headers.get("content-type") ?? "";
  let fromBody: Record<string, string> = {};
  try {
    if (ct.includes("application/json")) {
      const j = (await req.json()) as Record<string, unknown>;
      fromBody = Object.fromEntries(
        Object.entries(j).map(([k, v]) => [k, String(v)]),
      );
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const fd = await req.formData();
      fromBody = Object.fromEntries(
        Array.from(fd.entries()).map(([k, v]) => [k, String(v)]),
      );
    }
  } catch {
    /* ignore */
  }
  return handle(req, { ...fromBody, ...fromQuery });
}
