import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { affiliateClickSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const payload = affiliateClickSchema.parse(await req.json());
    const session = await getSession();

    await prisma.affiliateClickEvent.create({
      data: {
        productId: payload.productId,
        userId: session?.userId ?? null,
        selectedRetailer: payload.selectedRetailer,
        retailerPosition: payload.retailerPosition,
        isPrimary: payload.isPrimary,
        pageContext: payload.pageContext ?? null,
        placement: payload.placement ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[affiliate-click] failed:", err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
