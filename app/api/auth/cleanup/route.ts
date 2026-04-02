import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteExpiredUnverified } from "@/lib/db/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function removeExpired() {
  const now = new Date();
  // 1) Eliminar cuentas no verificadas con token vencido
  const res = await deleteExpiredUnverified(now);
  return res.count;
}

export async function POST() {
  const removed = await removeExpired();
  return NextResponse.json({ removed });
}

export const GET = POST;
