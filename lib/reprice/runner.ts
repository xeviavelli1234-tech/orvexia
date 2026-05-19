import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { SpApiClient } from "@/lib/amazon/client";
import { getCompetition, patchListingPrice } from "@/lib/amazon/pricing";
import { fetchAllListings } from "@/lib/amazon/listings";
import { upsertListingsBatch } from "@/lib/db/sellerListing";
import { isFixtureMode } from "@/lib/amazon/fixtures";
import { isRepricingAllowed, type SellerPlan } from "@/lib/billing";
import { sendRepricerAlertEmail } from "@/lib/email";
import { isScheduleAllowed } from "./schedule";
import { computeNewPrice } from "./engine";
import { minPriceForMargin } from "./margin";
import type { RepriceAlert } from "./alerts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const eur = (n: number) => n.toFixed(2).replace(".", ",") + " €";

/** Envía (si procede) un único correo resumen de alertas del ciclo. */
async function maybeSendAlerts(
  account: {
    alertsEnabled: boolean;
    alertEmail: string | null;
    user: { email: string };
  },
  alerts: RepriceAlert[],
): Promise<void> {
  if (!account.alertsEnabled || alerts.length === 0) return;
  const to = (account.alertEmail && account.alertEmail.trim()) || account.user.email;
  if (!to) return;
  try {
    await sendRepricerAlertEmail({ to, alerts });
  } catch (e) {
    console.warn("[reprice] alert email failed:", e);
  }
}

type SpApiEnv = "sandbox" | "production";

export interface RunSummary {
  accountsProcessed: number;
  listingsProcessed: number;
  listingsRepriced: number;
  errors: number;
}

/**
 * Ejecuta un ciclo de reprecio:
 *  1. Carga SellerAccounts activos cuyo (lastRunAt + intervalSeconds) ya venció.
 *  2. Por cada cuenta, recorre sus listings con repricingEnabled + min/max.
 *  3. Pide precio de competencia, calcula nuevo precio con el motor puro.
 *  4. Si cambia → patchListingPrice (no-op en fixtures) + persiste precio + evento.
 *  5. Registra RepricingRun por cuenta.
 */
/** TTL del lock de ciclo: si una ejecución muere, el lock caduca solo. */
const LOCK_TTL_MS = 5 * 60_000;

export async function runRepricer(now: Date = new Date()): Promise<RunSummary> {
  const summary: RunSummary = {
    accountsProcessed: 0,
    listingsProcessed: 0,
    listingsRepriced: 0,
    errors: 0,
  };

  const accounts = await prisma.sellerAccount.findMany({
    where: { active: true },
    include: { user: { select: { email: true } } },
  });

  for (const account of accounts) {
    // Trial expirado y sin pasar a PRO → no reprecia (gating de plan).
    if (!isRepricingAllowed(account.plan as SellerPlan, account.trialEndsAt, now)) {
      continue;
    }

    // ¿Toca ya según su intervalo?
    if (account.lastRunAt) {
      const nextDue = account.lastRunAt.getTime() + account.intervalSeconds * 1000;
      if (now.getTime() < nextDue) continue;
    }

    // Programación horaria: fuera de la franja → no reprecia.
    if (
      !isScheduleAllowed(
        account.scheduleEnabled,
        account.scheduleStartHour,
        account.scheduleEndHour,
        now,
      )
    ) {
      continue;
    }

    // Lock de ciclo: claim atómico. Si otra ejecución (cron + manual)
    // ya lo tiene y no ha caducado, se salta esta cuenta.
    const lockStale = new Date(now.getTime() - LOCK_TTL_MS);
    const claim = await prisma.sellerAccount.updateMany({
      where: {
        id: account.id,
        OR: [{ lockedAt: null }, { lockedAt: { lt: lockStale } }],
      },
      data: { lockedAt: now },
    });
    if (claim.count === 0) continue;

    summary.accountsProcessed += 1;

    const run = await prisma.repricingRun.create({
      data: { sellerAccountId: account.id, startedAt: now },
    });

    let processed = 0;
    let repriced = 0;
    let errors = 0;
    let runError: string | null = null;
    const accountAlerts: RepriceAlert[] = [];

    try {
      const isFixtureAcc = isFixtureMode(account.spApiEnv);
      let refreshToken: string;
      if (account.refreshToken === "FIXTURE_NO_TOKEN") {
        refreshToken = "FIXTURE_NO_TOKEN";
      } else {
        try {
          refreshToken = decryptToken(account.refreshToken);
        } catch {
          // No se puede descifrar (p.ej. cambió ENCRYPTION_KEY). En modo
          // demo da igual; en PRODUCCIÓN no mandamos un token basura a
          // Amazon (spam de invalid_grant): saltamos la cuenta con un
          // error claro de "reconectar".
          if (isFixtureAcc) {
            refreshToken = "FIXTURE_NO_TOKEN";
          } else {
            runError =
              "token_no_descifrable: reconecta tu cuenta de Amazon (Desconectar → Conectar) para recifrar el token con la clave actual.";
            errors += 1;
            if (account.alertOnError) {
              accountAlerts.push({
                kind: "error",
                sku: "—",
                title: "Cuenta de Amazon",
                detail:
                  "Token no descifrable: reconecta tu cuenta de Amazon para reanudar el reprecio.",
              });
            }
            await maybeSendAlerts(account, accountAlerts);
            await prisma.$transaction([
              prisma.repricingRun.update({
                where: { id: run.id },
                data: {
                  finishedAt: new Date(),
                  listingsProcessed: 0,
                  listingsRepriced: 0,
                  errors,
                  errorMessage: runError,
                },
              }),
              prisma.sellerAccount.update({
                where: { id: account.id },
                data: { lastRunAt: now, lockedAt: null },
              }),
            ]);
            summary.errors += errors;
            continue;
          }
        }
      }
      const client = new SpApiClient(refreshToken, account.spApiEnv as SpApiEnv);
      const ctx = { client, spApiEnv: account.spApiEnv, marketplaceId: account.marketplaceId };

      // Sincronización automática programada del catálogo.
      if (account.autoSyncHours > 0) {
        const dueMs = account.autoSyncHours * 3600_000;
        const last = account.lastSyncAt ? account.lastSyncAt.getTime() : 0;
        if (now.getTime() - last >= dueMs) {
          try {
            const items = await fetchAllListings({
              client,
              amazonSellerId: account.amazonSellerId,
              marketplaceId: account.marketplaceId,
              spApiEnv: account.spApiEnv,
            });
            await upsertListingsBatch({ sellerAccountId: account.id, items });
            await prisma.sellerAccount.update({
              where: { id: account.id },
              data: { lastSyncAt: now },
            });
          } catch (e) {
            errors += 1;
            runError =
              (runError ? runError + " | " : "") +
              "autosync: " +
              (e instanceof Error ? e.message.slice(0, 200) : String(e));
          }
        }
      }

      const listings = await prisma.sellerListing.findMany({
        where: {
          sellerAccountId: account.id,
          repricingEnabled: true,
          priceMin: { not: null },
          priceMax: { not: null },
        },
      });

      for (const listing of listings) {
        processed += 1;
        try {
          // Sin precio actual o sin ASIN no se puede calcular ni pedir
          // competencia. Se cuenta como procesado pero no se reprecia.
          if (listing.priceCurrent <= 0 || !listing.asin) {
            await prisma.repricingEvent.create({
              data: {
                runId: run.id,
                listingId: listing.id,
                priceBefore: listing.priceCurrent,
                priceAfter: listing.priceCurrent,
                competitorPrice: null,
                reason: "no_change",
                success: true,
              },
            });
            continue;
          }

          const comp = await getCompetition(
            ctx,
            listing.asin,
            listing.priceCurrent,
            {
              ignoreAmazon: listing.ignoreAmazon,
              fulfillment: listing.fulfillmentFilter,
              minRating: listing.minSellerRating ?? null,
            },
            account.amazonSellerId,
          );
          const competitorPrice = comp.price;
          const prevBuyBox = listing.buyBoxStatus;

          // Estado de Buy Box (informativo, cada ciclo).
          await prisma.sellerListing.update({
            where: { id: listing.id },
            data: {
              buyBoxStatus: comp.buyBox,
              buyBoxPrice: competitorPrice ?? undefined,
              buyBoxAt: now,
            },
          });

          // Alerta SOLO en la transición (no spam cada ciclo): teníamos la
          // Buy Box (o estado desconocido) y la acabamos de perder.
          if (
            account.alertOnBuyBoxLost &&
            prevBuyBox !== "LOST" &&
            comp.buyBox === "LOST"
          ) {
            accountAlerts.push({
              kind: "buybox_lost",
              sku: listing.sku,
              title: listing.title,
              detail:
                competitorPrice != null
                  ? `Competidor en la Buy Box a ${eur(competitorPrice)}`
                  : "Has dejado de tener la Buy Box",
            });
          }

          // Estrategia efectiva: la del producto o la de la cuenta.
          const eff = listing.useAccountDefaults
            ? {
                strategy: account.defaultStrategy,
                undercutType: account.defaultUndercutType,
                undercutValue: account.defaultUndercutValue,
                noCompetition: account.defaultNoCompetition,
                stepUpType: account.defaultStepUpType,
                stepUpValue: account.defaultStepUpValue,
              }
            : {
                strategy: listing.strategy,
                undercutType: listing.undercutType,
                undercutValue: listing.undercutValue,
                noCompetition: listing.noCompetition,
                stepUpType: listing.stepUpType,
                stepUpValue: listing.stepUpValue,
              };

          // Suelo de beneficio (estrategia MARGIN): precio mínimo rentable
          // según coste + envío + FBA + comisión + IVA y margen objetivo.
          let marginFloor: number | null = null;
          if (listing.cost != null && listing.cost > 0) {
            marginFloor = minPriceForMargin(
              {
                cost: listing.cost,
                shipping: listing.shippingCost,
                fbaFee: listing.fbaFee,
                referralPct: listing.feePercent ?? 15,
                vatPct: listing.vatRate ?? 21,
              },
              listing.targetMargin ?? 0,
            );
          }

          const result = computeNewPrice({
            priceCurrent: listing.priceCurrent,
            priceMin: listing.priceMin!,
            priceMax: listing.priceMax!,
            competitorPrice,
            strategy: eff.strategy,
            undercutType: eff.undercutType,
            undercutValue: eff.undercutValue,
            fixedPrice: listing.fixedPrice,
            marginFloor,
            noCompetition: eff.noCompetition,
            stepUpType: eff.stepUpType,
            stepUpValue: eff.stepUpValue,
          });

          if (!result.changed) {
            await prisma.repricingEvent.create({
              data: {
                runId: run.id,
                listingId: listing.id,
                priceBefore: listing.priceCurrent,
                priceAfter: listing.priceCurrent,
                competitorPrice,
                reason: "no_change",
                success: true,
                buyBox: comp.buyBox,
              },
            });
            continue;
          }

          if (account.dryRun) {
            // Simulación: calcula pero NO aplica en Amazon ni cambia precio.
            await prisma.repricingEvent.create({
              data: {
                runId: run.id,
                listingId: listing.id,
                priceBefore: listing.priceCurrent,
                priceAfter: result.newPrice,
                competitorPrice,
                reason: result.reason,
                success: true,
                simulated: true,
                buyBox: comp.buyBox,
              },
            });
            repriced += 1;
          } else {
            await patchListingPrice(ctx, {
              amazonSellerId: account.amazonSellerId,
              sku: listing.sku,
              productType: listing.productType,
              newPrice: result.newPrice,
              currency: listing.currency,
            });

            await prisma.$transaction([
              prisma.sellerListing.update({
                where: { id: listing.id },
                data: { priceCurrent: result.newPrice, lastRepricedAt: now },
              }),
              prisma.repricingEvent.create({
                data: {
                  runId: run.id,
                  listingId: listing.id,
                  priceBefore: listing.priceCurrent,
                  priceAfter: result.newPrice,
                  competitorPrice,
                  reason: result.reason,
                  success: true,
                  buyBox: comp.buyBox,
                },
              }),
            ]);

            repriced += 1;
          }

          // Alerta de precio mínimo: el motor quería bajar más pero topó
          // con el suelo (mín. manual o suelo de beneficio). Solo cuando
          // el precio CAMBIA → naturalmente acotado (si ya estaba en el
          // suelo, result.changed es false y no se llega aquí).
          if (
            account.alertOnPriceFloor &&
            (result.reason === "min_floor" || result.reason === "margin_floor")
          ) {
            accountAlerts.push({
              kind: "price_floor",
              sku: listing.sku,
              title: listing.title,
              detail: `Precio en el mínimo rentable: ${eur(result.newPrice)}`,
            });
          }

          // Throttling: respiro entre PATCHes (anti QuotaExceeded).
          if (account.patchDelayMs > 0 && !isFixtureMode(account.spApiEnv)) {
            await sleep(account.patchDelayMs);
          }
        } catch (e) {
          errors += 1;
          const emsg = e instanceof Error ? e.message.slice(0, 500) : String(e);
          if (account.alertOnError) {
            accountAlerts.push({
              kind: "error",
              sku: listing.sku,
              title: listing.title,
              detail: emsg.slice(0, 160),
            });
          }
          await prisma.repricingEvent.create({
            data: {
              runId: run.id,
              listingId: listing.id,
              priceBefore: listing.priceCurrent,
              priceAfter: listing.priceCurrent,
              competitorPrice: null,
              reason: "no_change",
              success: false,
              errorMessage: emsg,
            },
          });
        }
      }
    } catch (e) {
      runError = e instanceof Error ? e.message.slice(0, 500) : String(e);
      errors += 1;
      if (account.alertOnError) {
        accountAlerts.push({
          kind: "error",
          sku: "—",
          title: "Ciclo de reprecio",
          detail: runError.slice(0, 160),
        });
      }
    }

    await prisma.$transaction([
      prisma.repricingRun.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          listingsProcessed: processed,
          listingsRepriced: repriced,
          errors,
          errorMessage: runError,
        },
      }),
      prisma.sellerAccount.update({
        where: { id: account.id },
        data: { lastRunAt: now, lockedAt: null }, // libera el lock
      }),
    ]);

    await maybeSendAlerts(account, accountAlerts);

    summary.listingsProcessed += processed;
    summary.listingsRepriced += repriced;
    summary.errors += errors;
  }

  return summary;
}
