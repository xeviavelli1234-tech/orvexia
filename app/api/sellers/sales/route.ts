import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSalesKpisForUser } from "@/lib/reprice/orders-sync";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const days = Math.max(7, Math.min(180, Number(url.searchParams.get("days") ?? "30") || 30));
  const kpis = await getSalesKpisForUser(session.userId, days);
  return NextResponse.json({ ok: true, days, kpis });
}
