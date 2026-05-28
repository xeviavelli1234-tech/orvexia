import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDiscountAvailableEmail, sendBetterDealEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { decideCronStatus } from "@/lib/cron/check-discounts-status";
import { cronAuthError } from "@/lib/cron/auth";

const log = logger.child("cron:check-discounts");

export async function GET(req: NextRequest) {
  const authErr = cronAuthError(req);
  if (authErr) {
    return NextResponse.json(
      { error: authErr === 503 ? "cron_not_configured" : "Unauthorized" },
      { status: authErr },
    );
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
      const result = await sendDiscountAvailableEmail({
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
      if (!result.emailSent) {
        // El email falló (Resend caído o no configurado). No marcamos como
        // notificado para reintentar en el próximo ciclo. emailSent=false ya
        // se loguea con detalle dentro de lib/email.ts.
        errors.push(`${sp.id}: email no enviado (savedProduct no marcado)`);
        log.warn({ savedProductId: sp.id, productId: sp.product.id }, "discount_email_failed");
        continue;
      }
      await prisma.savedProduct.update({
        where: { id: sp.id },
        data: { notifyOnDiscount: false, discountAlertSentAt: new Date() },
      });
      notified++;
    } catch (e) {
      errors.push(`${sp.id}: ${e instanceof Error ? e.message : String(e)}`);
      log.error({ savedProductId: sp.id, err: e }, "discount_notify_threw");
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
  let betterDealEligible = 0;

  for (const sp of betterDealCandidates) {
    const bestOffer = sp.product.offers[0];
    if (!bestOffer || sp.savedPriceCurrent === null) continue;

    const priceDrop = sp.savedPriceCurrent - bestOffer.priceCurrent;
    const dropPercent = priceDrop / sp.savedPriceCurrent;

    // Only notify if price dropped by at least 3% and at least 2€
    if (dropPercent < 0.03 || priceDrop < 2) continue;

    betterDealEligible++;
    try {
      const result = await sendBetterDealEmail({
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
      if (!result.emailSent) {
        errors.push(`${sp.id}: email no enviado (savedPriceCurrent no actualizado)`);
        log.warn({ savedProductId: sp.id, productId: sp.product.id }, "better_deal_email_failed");
        continue;
      }
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
      errors.push(`${sp.id}: ${e instanceof Error ? e.message : String(e)}`);
      log.error({ savedProductId: sp.id, err: e }, "better_deal_notify_threw");
    }
  }

  // Eligibles: candidatos que efectivamente debían recibir email
  const eligible = noDiscountCandidates.filter((sp) => sp.product.offers.length > 0).length
    + betterDealEligible;
  const sent = notified + betterDeals;

  const status = decideCronStatus(eligible, sent, errors.length);

  log.info(
    {
      checked: noDiscountCandidates.length + betterDealCandidates.length,
      eligible,
      notified,
      betterDeals,
      errors: errors.length,
      status,
    },
    "cron_done",
  );

  return NextResponse.json(
    {
      ok: status < 400,
      checked: noDiscountCandidates.length + betterDealCandidates.length,
      eligible,
      notified,
      betterDeals,
      errors,
    },
    { status },
  );
}
