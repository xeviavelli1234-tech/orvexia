import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}
function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** GET /api/admin/leads/export — descarga todos los leads en CSV (solo admin). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdminUser(session.userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });

  const header = [
    "createdAt",
    "email",
    "source",
    "product",
    "currentPrice",
    "recommendedPrice",
    "ip",
  ];
  const lines = leads.map((l) => {
    const ctx = asRecord(l.context);
    const result = asRecord(ctx.result);
    return [
      l.createdAt.toISOString(),
      l.email,
      l.source,
      ctx.product ?? "",
      ctx.currentPrice ?? "",
      result.recommended_price ?? "",
      l.ip ?? "",
    ]
      .map(cell)
      .join(",");
  });

  // BOM para que Excel reconozca UTF-8.
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="orvexia-leads.csv"',
    },
  });
}
