import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { affiliateClickSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { readRequestMeta } from "@/lib/security/request";

export async function POST(req: NextRequest) {
  try {
    // Endpoint público: limita por IP para no inundar AffiliateClickEvent
    // (DoS de escritura + envenenamiento de la analítica de afiliación).
    const { ip } = readRequestMeta(req);
    if (rateLimit("affiliate-click", ip ?? "", 100, 60_000)) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
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
