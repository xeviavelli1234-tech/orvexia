import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/passkey/delete
 * Body: { id: string }
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let id: string;
  try {
    const body = await req.json();
    if (typeof body?.id !== "string") throw new Error("bad");
    id = body.id;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const pk = await prisma.passkey.findUnique({ where: { id }, select: { userId: true } });
  if (!pk || pk.userId !== session.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await prisma.passkey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
