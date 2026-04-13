import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDiscountAvailableEmail, sendBetterDealEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 1. Products that went from no discount → discount ──────────────────
  const noDiscountCandidates = await prisma.savedProduct.findMany({
    where: { notifyOnDiscount: true },
    include: {
      user: { select: { email: true, name: true } },
      product: {
        include: {
          offers: {
            where: { discountPercent: { gt: 0 }, priceOld: { not: null } },
            orderBy: { priceCurrent: "asc" },
          },
        },
      },
    },
  });

  let notified = 0;
  const errors: string[] = [];

  for (const sp of noDiscountCandidates) {
    const bestOffer = sp.product.offers[0];
    if (!bestOffer) continue;
    try {
      await sendDiscountAvailableEmail({
        to: sp.user.email,
        userName: sp.user.name,
        productName: sp.product.name,
        productImage: sp.product.image,
        store: bestOffer.store,
        priceCurrent: bestOffer.priceCurrent,
        priceOld: bestOffer.priceOld,
        discountPercent: bestOffer.discountPercent,
        externalUrl: bestOffer.externalUrl,
      });
      await prisma.savedProduct.update({
        where: { id: sp.id },
        data: { notifyOnDiscount: false, discountAlertSentAt: new Date() },
      });
      notified++;
    } catch (e) {
      errors.push(`${sp.id}: ${e}`);
    }
  }

  // ── 2. Products where price dropped below savedPriceCurrent ────────────
  const betterDealCandidates = await prisma.savedProduct.findMany({
    where: {
      savedPriceCurrent: { not: null },
      notifyOnDiscount: false, // already on discount when saved
    },
    include: {
      user: { select: { email: true, name: true } },
      product: {
        include: {
          offers: { orderBy: { priceCurrent: "asc" } },
        },
      },
    },
  });

  let betterDeals = 0;

  for (const sp of betterDealCandidates) {
    const bestOffer = sp.product.offers[0];
    if (!bestOffer || sp.savedPriceCurrent === null) continue;

    const priceDrop = sp.savedPriceCurrent - bestOffer.priceCurrent;
    const dropPercent = priceDrop / sp.savedPriceCurrent;

    // Only notify if price dropped by at least 3% and at least 2€
    if (dropPercent < 0.03 || priceDrop < 2) continue;

    try {
      await sendBetterDealEmail({
        to: sp.user.email,
        userName: sp.user.name,
        productName: sp.product.name,
        productImage: sp.product.image,
        store: bestOffer.store,
        priceCurrent: bestOffer.priceCurrent,
        priceOld: sp.savedPriceCurrent,
        discountPercent: bestOffer.discountPercent,
        externalUrl: bestOffer.externalUrl,
      });
      // Update savedPriceCurrent so next drop is relative to new price
      await prisma.savedProduct.update({
        where: { id: sp.id },
        data: {
          savedPriceCurrent: bestOffer.priceCurrent,
          betterDealAlertSentAt: new Date(),
        },
      });
      betterDeals++;
    } catch (e) {
      errors.push(`${sp.id}: ${e}`);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: noDiscountCandidates.length + betterDealCandidates.length,
    notified,
    betterDeals,
    errors,
  });
}
