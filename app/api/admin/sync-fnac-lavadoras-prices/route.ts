import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Update = {
  slug: string;
  priceCurrent: number;
  priceOld: number | null;
  discountPercent: number | null;
};

const UPDATES: Update[] = [
  { slug: "lavadora-de-carga-frontal-aeg-lfa6i8472a-8-kg-1400-rpm-blanco-a-3-9404855-37592175046",                priceCurrent: 420.52, priceOld: null,    discountPercent: null },
  { slug: "lavadora-de-carga-frontal-aeg-lfa6i8272a-8-kg-1200-rpm-blanco-a-3-9404853-37592175044",                priceCurrent: 423.90, priceOld: 559.00,  discountPercent: 24 },
  { slug: "lavadora-de-carga-frontal-cecotec-bolero-dresscode-121000-steel-12kg-1400rpm-plata-a-3-9400656-40528620966", priceCurrent: 460.90, priceOld: 609.00,  discountPercent: 24 },
  { slug: "lavadora-de-carga-frontal-integrable-balay-3ti987b-8kg-1400rpm-clase-c-3-9366470-37592173604",         priceCurrent: 791.40, priceOld: 1109.50, discountPercent: 29 },
];

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results: { slug: string; ok: boolean; reason?: string }[] = [];

  for (const u of UPDATES) {
    const product = await prisma.product.findUnique({ where: { slug: u.slug }, select: { id: true } });
    if (!product) {
      results.push({ slug: u.slug, ok: false, reason: "product not found" });
      continue;
    }

    const offer = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: "Fnac" } },
      select: { priceCurrent: true },
    });

    if (!offer) {
      results.push({ slug: u.slug, ok: false, reason: "Fnac offer not found" });
      continue;
    }

    await prisma.offer.update({
      where: { productId_store: { productId: product.id, store: "Fnac" } },
      data: {
        priceCurrent: u.priceCurrent,
        priceOld: u.priceOld,
        discountPercent: u.discountPercent,
        inStock: true,
      },
    });

    if (offer.priceCurrent !== u.priceCurrent) {
      await prisma.priceHistory.create({
        data: { productId: product.id, store: "Fnac", price: u.priceCurrent },
      });
    }

    results.push({ slug: u.slug, ok: true });
  }

  return NextResponse.json({ updated: results.filter((r) => r.ok).length, results });
}
