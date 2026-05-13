import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { deactivateSellerAccount, getSellerAccountByUserId } from "@/lib/db/sellerAccount";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const account = await getSellerAccountByUserId(session.userId);
  if (!account) {
    return NextResponse.redirect(new URL("/sellers/dashboard", req.url));
  }

  await deactivateSellerAccount(session.userId);
  return NextResponse.redirect(new URL("/sellers/dashboard?status=disconnected", req.url));
}
