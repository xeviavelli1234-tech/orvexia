import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getCatalogHealth } from "@/lib/reprice/health";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await getCatalogHealth(session.userId);
  return NextResponse.json(data);
}
