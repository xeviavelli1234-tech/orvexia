import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { deactivateSellerAccount, getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { isSellerIpDenied } from "@/lib/security/seller-access";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (await isSellerIpDenied(session.userId)) {
    return NextResponse.redirect(new URL("/sellers/productos", req.url));
  }

  const account = await getSellerAccountByUserId(session.userId);
  if (!account) {
    return NextResponse.redirect(new URL("/dashboard/repricer", req.url));
  }

  await deactivateSellerAccount(session.userId);
  return NextResponse.redirect(new URL("/dashboard/repricer?status=disconnected", req.url));
}
