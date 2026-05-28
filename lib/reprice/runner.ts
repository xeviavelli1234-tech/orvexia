import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { SpApiClient } from "@/lib/amazon/client";
import { getCompetition, patchListingPrice } from "@/lib/amazon/pricing";
import { runPatchWithBackoff } from "./backoff";
import { persistPatchOutcome } from "./resilience";
import { fetchAllListings } from "@/lib/amazon/listings";
import { upsertListingsBatch } from "@/lib/db/sellerListing";
import { isFixtureMode } from "@/lib/amazon/fixtures";
import { type SellerPlan } from "@/lib/billing";
import { sendRepricerAlertEmail, sendTrialEndingEmail } from "@/lib/email";
import { parseTags } from "@/lib/tags";
import { shouldRunAccount } from "./gating";
import { computeNewPrice } from "./engine";
import { minPriceForMargin } from "./margin";
import { logger } from "@/lib/logger";
import { captureException } from "@/lib/monitoring";
import type { RepriceAlert } from "./alerts";

const log = logger.child("reprice:runner");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const eur = (n: number) => n.toFixed(2).replace(".", ",") + " €";

/** Anti-spam: como máximo un correo de alertas cada 6 h por cuenta. */
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/** Envía (si procede y fuera del cooldown) un único correo resumen. */
async function maybeSendAlerts(
  account: {
    id: string;
    alertsEnabled: boolean;
    alertEmail: string | null;
    lastAlertAt: Date | null;
    user: { email: string };
  },
  alerts: RepriceAlert[],
  now: Date,
): Promise<void> {
  if (!account.alertsEnabled || alerts.length === 0) return;
  // Cooldown: no reenviar si ya avisamos hace poco (evita spam por ciclo).
  if (
    account.lastAlertAt &&
    now.getTime() - account.lastAlertAt.getTime() < ALERT_COOLDOWN_MS
  ) {
    return;
  }
  const to = (account.alertEmail && account.alertEmail.trim()) || account.user.email;
  if (!to) return;
  try {
    await sendRepricerAlertEmail({ to, alerts });
    await prisma.sellerAccount.update({
      where: { id: account.id },
      data: { lastAlertAt: now },
    });
  } catch (e) {
    log.warn(
      { accountId: account.id, alertCount: alerts.length, err: e },
      "alert email failed",
    );
  }

  // Notificaciones externas (Slack/Telegram/Discord) — agrupadas por categoría
  try {
    const { sendToExternalChannels } = await import("./notify-external");
    const byKind = new Map<string, typeof alerts>();
    for (const a of alerts) {
      const arr = byKind.get(a.kind) ?? [];
      arr.push(a);
      byKind.set(a.kind, arr);
    }
    for (const [kind, arr] of byKind) {
      const cat =
        kind === "buy_box_lost"
          ? "buybox_lost"
          : kind === "price_floor"
            ? "price_floor"
            : "error";
      const text = arr
        .slice(0, 10)
        .map((a) => `• ${a.title} (${a.sku}): ${a.detail}`)
        .join("\n");
      const header = `🛎️ Orvexia Repricer · ${arr.length} aviso(s)`;
      await sendToExternalChannels({
        sellerAccountId: account.id,
        category: cat,
        text: `${header}\n${text}`,
      });
    }
  } catch (e) {
    log.warn(
      { accountId: account.id, err: e },
      "external channels failed",
    );
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

export async function runRepricer(
  now: Date = new Date(),
  opts: { force?: boolean } = {},
): Promise<RunSummary> {
  const force = opts.force === true;
  const summary: RunSummary = {
    accountsProcessed: 0,
    listingsProcessed: 0,
    listingsRepriced: 0,
    errors: 0,
  };

  // Excluimos cuentas en modo manual: no tienen credenciales SP-API y su
  // flujo de "reprecio" es bajo demanda (botón "Generar plan") y nunca
  // escribe en Amazon ni en ninguna tienda externa.
  const accounts = await prisma.sellerAccount.findMany({
    where: { active: true, mode: { not: "manual" } },
    include: { user: { select: { email: true } } },
  });

  for (const account of accounts) {
    // Recordatorio de fin de prueba (una sola vez, ≤3 días antes).
    if (
      account.plan === "TRIAL" &&
      account.trialEndsAt &&
      !account.trialReminderSent
    ) {
      const msLeft = account.trialEndsAt.getTime() - now.getTime();
      const DAY = 86_400_000;
      if (msLeft <= 3 * DAY && msLeft > -DAY) {
        const daysLeft = Math.max(0, Math.ceil(msLeft / DAY));
        try {
          if (account.user?.email) {
            await sendTrialEndingEmail({ to: account.user.email, daysLeft });
          }
        } catch (e) {
          log.warn(
            { accountId: account.id, err: e },
            "trial reminder failed",
          );
        }
        await prisma.sellerAccount.update({
          where: { id: account.id },
          data: { trialReminderSent: true },
        });
      }
    }

    // Plan, intervalo, vacaciones y schedule — todos en una sola decisión pura
    // (testeable en gating.test.ts). Si dice run=false, salta la cuenta.
    const gate = shouldRunAccount(
      {
        plan: account.plan,
        trialEndsAt: account.trialEndsAt,
        lastRunAt: account.lastRunAt,
        intervalSeconds: account.intervalSeconds,
        vacationFrom: account.vacationFrom,
        vacationTo: account.vacationTo,
        scheduleEnabled: account.scheduleEnabled,
        scheduleStartHour: account.scheduleStartHour,
        scheduleEndHour: account.scheduleEndHour,
      },
      now,
      { force },
    );
    if (!gate.run) continue;

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
            await maybeSendAlerts(account, accountAlerts, now);
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
              excludeSellers: parseTags(listing.excludeSellers),
              onlySellers: parseTags(listing.onlySellers),
            },
            account.amazonSellerId,
          );
          const competitorPrice = comp.price;
          const prevBuyBox = listing.buyBoxStatus;
          const hasCompThisCycle = competitorPrice != null;

          // Streak de "sin competencia" → habilita STEP_UP geométrico.
          // Lo calculamos ANTES del engine para pasar el multiplicador.
          const nextNoCompStreak = hasCompThisCycle
            ? 0
            : listing.noCompetitionStreak + 1;
          let stepUpMult = 1;
          if (account.stepUpAccelCycles > 0 && nextNoCompStreak > account.stepUpAccelCycles) {
            const excess = nextNoCompStreak - account.stepUpAccelCycles;
            stepUpMult = Math.min(
              Math.max(1, account.stepUpMaxMult),
              Math.pow(2, excess),
            );
          }

          // Estado de Buy Box + cache del competidor para la UI y para
          // poder detectar oscilaciones entre ciclos. Se persiste SIEMPRE.
          await prisma.sellerListing.update({
            where: { id: listing.id },
            data: {
              buyBoxStatus: comp.buyBox,
              buyBoxPrice: comp.buyBoxPrice ?? competitorPrice ?? undefined,
              buyBoxAt: now,
              lastCompetitorPrice: competitorPrice ?? null,
              lastCompetitorAt: now,
              noCompetitionStreak: nextNoCompStreak,
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

          // Freno por guerra de precios: si llevamos N ciclos seguidos
          // bajando arrastrados, el engine salta al suelo con razón "price_war".
          const priceWarLocked =
            account.priceWarCycles > 0 &&
            listing.priceWarStreak >= account.priceWarCycles;

          const result = computeNewPrice({
            priceCurrent: listing.priceCurrent,
            priceMin: listing.priceMin!,
            priceMax: listing.priceMax!,
            competitorPrice,
            buyBoxPrice: comp.buyBoxPrice ?? null,
            strategy: eff.strategy,
            undercutType: eff.undercutType,
            undercutValue: eff.undercutValue,
            fixedPrice: listing.fixedPrice,
            marginFloor,
            noCompetition: eff.noCompetition,
            stepUpType: eff.stepUpType,
            stepUpValue: eff.stepUpValue,
            stepUpMult,
            minChangeAmount: account.minChangeAmount,
            minChangePct: account.minChangePct,
            priceWarLocked,
          });

          // Streak de guerra: cuenta ciclos consecutivos bajando empujados
          // por la competencia. Se resetea ante cualquier otra señal.
          const goingDown =
            result.changed && result.newPrice < listing.priceCurrent;
          const pulledByCompetitor = result.reason === "competitor_undercut";
          let nextWarStreak =
            goingDown && pulledByCompetitor
              ? listing.priceWarStreak + 1
              : 0;
          if (result.reason === "price_war") nextWarStreak = 0; // freno aplicado → reset

          // Debounce: no repetir un movimiento del mismo signo dentro de la
          // ventana configurada. Evita ping-pong frente a competidores que
          // oscilan en cada ciclo. Las razones duras NO se debouncenan.
          const HARD = new Set([
            "min_floor",
            "max_ceiling",
            "margin_floor",
            "price_war",
          ]);
          const newDir =
            !result.changed
              ? null
              : result.newPrice > listing.priceCurrent
                ? "UP"
                : "DOWN";
          const debounceWindowMs = account.debounceSeconds * 1000;
          const sinceLastMs = listing.lastRepricedAt
            ? now.getTime() - listing.lastRepricedAt.getTime()
            : Infinity;
          const debounced =
            account.debounceSeconds > 0 &&
            result.changed &&
            !HARD.has(result.reason) &&
            listing.lastDirection != null &&
            newDir === listing.lastDirection &&
            sinceLastMs < debounceWindowMs;

          if (debounced) {
            // Registramos el evento como "debounced" y no tocamos el precio.
            await prisma.$transaction([
              prisma.repricingEvent.create({
                data: {
                  runId: run.id,
                  listingId: listing.id,
                  priceBefore: listing.priceCurrent,
                  priceAfter: listing.priceCurrent,
                  competitorPrice,
                  reason: "debounced",
                  success: true,
                  buyBox: comp.buyBox,
                },
              }),
              prisma.sellerListing.update({
                where: { id: listing.id },
                data: { priceWarStreak: nextWarStreak },
              }),
            ]);
            continue;
          }

          if (!result.changed) {
            await prisma.$transaction([
              prisma.repricingEvent.create({
                data: {
                  runId: run.id,
                  listingId: listing.id,
                  priceBefore: listing.priceCurrent,
                  priceAfter: listing.priceCurrent,
                  competitorPrice,
                  reason: result.reason,
                  success: true,
                  buyBox: comp.buyBox,
                },
              }),
              prisma.sellerListing.update({
                where: { id: listing.id },
                data: { priceWarStreak: nextWarStreak },
              }),
            ]);
            continue;
          }

          // Guerra de precios + acción "PAUSE": deshabilita el reprecio del
          // listing y avisa. El cambio del engine (saltar al suelo) NO se
          // aplica: pausamos directamente para que el dueño investigue.
          if (
            result.reason === "price_war" &&
            account.priceWarAction === "PAUSE"
          ) {
            await prisma.$transaction([
              prisma.sellerListing.update({
                where: { id: listing.id },
                data: {
                  repricingEnabled: false,
                  autoPausedAt: now,
                  autoPausedReason: "price_war",
                  priceWarStreak: 0,
                },
              }),
              prisma.repricingEvent.create({
                data: {
                  runId: run.id,
                  listingId: listing.id,
                  priceBefore: listing.priceCurrent,
                  priceAfter: listing.priceCurrent,
                  competitorPrice,
                  reason: "price_war_paused",
                  success: true,
                  buyBox: comp.buyBox,
                },
              }),
            ]);
            if (account.alertOnError) {
              accountAlerts.push({
                kind: "error",
                sku: listing.sku,
                title: listing.title,
                detail: `Pausado por guerra de precios (${account.priceWarCycles} bajadas seguidas)`,
              });
            }
            continue;
          }

          if (account.dryRun) {
            // Simulación: calcula pero NO aplica en Amazon ni cambia precio.
            // Aún así guardamos streaks para que las estadísticas no mientan.
            await prisma.$transaction([
              prisma.repricingEvent.create({
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
              }),
              prisma.sellerListing.update({
                where: { id: listing.id },
                data: { priceWarStreak: nextWarStreak },
              }),
            ]);
            repriced += 1;
          } else {
            // PATCH con backoff exponencial + telemetría
            const { outcome } = await runPatchWithBackoff(() =>
              patchListingPrice(ctx, {
                amazonSellerId: account.amazonSellerId,
                sku: listing.sku,
                productType: listing.productType,
                newPrice: result.newPrice,
                currency: listing.currency,
              }),
            );

            if (!outcome.applied) {
              // El PATCH falló (rate limit agotado o error duro): NO cambiamos
              // priceCurrent en nuestra BD para no mentir al usuario.
              await prisma.repricingEvent.create({
                data: {
                  runId: run.id,
                  listingId: listing.id,
                  priceBefore: listing.priceCurrent,
                  priceAfter: listing.priceCurrent,
                  competitorPrice,
                  reason: outcome.rateLimited ? "throttled" : "patch_error",
                  success: false,
                  errorMessage: outcome.error?.message ?? "",
                  buyBox: comp.buyBox,
                },
              });
              const { autoPaused } = await persistPatchOutcome({
                sellerAccountId: account.id,
                listingId: listing.id,
                outcome,
              });
              if (autoPaused && account.alertOnError) {
                accountAlerts.push({
                  kind: "error",
                  sku: listing.sku,
                  title: listing.title,
                  detail: "Pausado automáticamente tras errores repetidos",
                });
              }
              errors += 1;
              // Throttling: respiro antes del siguiente
              if (account.patchDelayMs > 0 && !isFixtureMode(account.spApiEnv)) {
                await sleep(account.patchDelayMs);
              }
              continue;
            }

            await prisma.$transaction([
              prisma.sellerListing.update({
                where: { id: listing.id },
                // consecutiveErrors: 0 aquí como defensa: si persistPatchOutcome
                // falla silenciosamente más abajo, el contador sigue reseteado.
                data: {
                  priceCurrent: result.newPrice,
                  lastRepricedAt: now,
                  consecutiveErrors: 0,
                  priceWarStreak: nextWarStreak,
                  lastDirection: newDir ?? listing.lastDirection,
                },
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
            await persistPatchOutcome({
              sellerAccountId: account.id,
              listingId: listing.id,
              outcome,
              appliedPrice: result.newPrice,
            });

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
      log.error(
        { accountId: account.id, runId: run.id, err: e },
        "cycle aborted",
      );
      void captureException(e, {
        tags: { scope: "reprice-runner", accountId: account.id },
        extra: { runId: run.id },
      });
      if (account.alertOnError) {
        accountAlerts.push({
          kind: "error",
          sku: "—",
          title: "Ciclo de reprecio",
          detail: runError.slice(0, 160),
        });
      }
    }

    try {
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
    } catch (txErr) {
      // Si la transacción de cierre falla (timeout/deadlock de Postgres), el
      // lock quedaría puesto y la cuenta se saltaría hasta que caduque el TTL
      // (5 min). Liberamos el lock best-effort para que el siguiente ciclo
      // pueda reintentar de inmediato. No relanzamos: un fallo de cierre no
      // debe abortar el procesamiento de las demás cuentas.
      log.error(
        { accountId: account.id, runId: run.id, err: txErr },
        "fallo al cerrar el run; liberando lock best-effort",
      );
      void captureException(txErr, {
        tags: { scope: "reprice-runner-close", accountId: account.id },
        extra: { runId: run.id },
      });
      await prisma.sellerAccount
        .updateMany({ where: { id: account.id }, data: { lockedAt: null } })
        .catch(() => {});
    }

    await maybeSendAlerts(account, accountAlerts, now);

    summary.listingsProcessed += processed;
    summary.listingsRepriced += repriced;
    summary.errors += errors;
  }

  return summary;
}
