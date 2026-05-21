import "server-only";
import { prisma } from "@/lib/prisma";
import { recordPatch } from "./quota";
import { recordAudit } from "@/lib/db/audit";
import { runPatchWithBackoff, type PatchExecutionResult } from "./backoff";

/**
 * Resiliencia del motor de reprecio (parte server-only):
 *   - Persiste el resultado de un PATCH (quota tracker).
 *   - Cuenta errores consecutivos por listing. Cuando supera el umbral
 *     (AUTOPAUSE_THRESHOLD), pausa el listing y registra auditoría.
 *   - Resetea el contador al primer ciclo exitoso tras una racha.
 *   - Si el PATCH fue rate-limited, NO contabiliza error consecutivo
 *     (es throttling, no malformación), pero sí lo registra en quota.
 *
 * Best-effort: errores en la BD no propagan, escriben warn y siguen.
 *
 * El backoff puro vive en lib/reprice/backoff.ts (sin server-only, testeable).
 */

export { runPatchWithBackoff };
export type { PatchExecutionResult };

export const AUTOPAUSE_THRESHOLD = 5;

// ─── Telemetría post-PATCH: quota + contador de errores consecutivos ───────
export interface PostPatchInput {
  sellerAccountId: string;
  listingId: string;
  outcome: PatchExecutionResult;
  appliedPrice?: number; // precio que intentamos aplicar (para lastExpected*)
}

/**
 * Persiste el resultado del PATCH:
 *  - quota tracker (siempre)
 *  - reset / increment consecutiveErrors del listing
 *  - autopausa si supera el umbral
 *  - sello lastExpectedPrice + lastExpectedAt cuando el PATCH fue aplicado
 */
export async function persistPatchOutcome({
  sellerAccountId,
  listingId,
  outcome,
  appliedPrice,
}: PostPatchInput): Promise<{ autoPaused: boolean }> {
  await recordPatch(sellerAccountId, {
    success: outcome.applied,
    rateLimited: outcome.rateLimited,
    retries: outcome.retries,
  });

  let autoPaused = false;
  try {
    if (outcome.applied) {
      // Éxito: resetea contador y guarda último precio esperado.
      await prisma.sellerListing.update({
        where: { id: listingId },
        data: {
          consecutiveErrors: 0,
          ...(appliedPrice != null
            ? {
                lastExpectedPrice: appliedPrice,
                lastExpectedAt: new Date(),
              }
            : {}),
        },
      });
    } else if (outcome.rateLimited) {
      // Throttling: ni autopausa ni contador (es nuestra culpa, no del listing).
    } else {
      // Error duro: cuenta y, si supera el umbral, autopausa.
      const updated = await prisma.sellerListing.update({
        where: { id: listingId },
        data: { consecutiveErrors: { increment: 1 } },
        select: {
          id: true,
          sellerAccountId: true,
          sku: true,
          consecutiveErrors: true,
          repricingEnabled: true,
        },
      });
      if (
        updated.repricingEnabled &&
        updated.consecutiveErrors >= AUTOPAUSE_THRESHOLD
      ) {
        const reason = outcome.error?.code
          ? `auto-pausa tras ${updated.consecutiveErrors} errores (${outcome.error.code})`
          : `auto-pausa tras ${updated.consecutiveErrors} errores`;
        await prisma.sellerListing.update({
          where: { id: updated.id },
          data: {
            repricingEnabled: false,
            autoPausedAt: new Date(),
            autoPausedReason: reason,
          },
        });
        autoPaused = true;
        const acc = await prisma.sellerAccount.findUnique({
          where: { id: updated.sellerAccountId },
          select: { userId: true },
        });
        if (acc) {
          await recordAudit(
            acc.userId,
            "listing.auto_paused",
            `SKU ${updated.sku}: ${reason}`,
          );
        }
      }
    }
  } catch (e) {
    console.warn("[resilience] persistPatchOutcome fallo:", e);
  }
  return { autoPaused };
}

