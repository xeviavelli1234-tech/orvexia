import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  ReimbursementClaimStatus,
  ReimbursementClaimType,
} from "@/app/generated/prisma/client";
import { SUCCESS_FEE_PCT, sellerKeeps, successFee } from "./pricing";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface ClaimView {
  id: string;
  type: ReimbursementClaimType;
  status: ReimbursementClaimStatus;
  sku: string;
  asin: string;
  fnsku: string;
  title: string;
  quantity: number;
  estimatedAmount: number;
  recoveredAmount: number | null;
  currency: string;
  confidence: number;
  reason: string;
  caseText: string;
  detectedAt: string;
  windowExpiresAt: string | null;
  /** Días restantes hasta que venza la ventana (negativo = vencida). */
  daysLeft: number | null;
}

export interface ReimbursementSummary {
  hasAccount: boolean;
  lastAuditAt: string | null;
  successFeePct: number;
  /** € reclamables aún abiertos (DETECTED + READY + FILED, no vencidos). */
  potentialRecovery: number;
  /** € ya recuperados de Amazon (RECOVERED). */
  recoveredTotal: number;
  /** Comisión por éxito de Orvexia sobre lo recuperado. */
  yourFee: number;
  /** Lo que el vendedor se queda tras la comisión. */
  youKeep: number;
  counts: Record<ReimbursementClaimStatus, number>;
  claims: ClaimView[];
}

function emptyCounts(): Record<ReimbursementClaimStatus, number> {
  return { DETECTED: 0, READY: 0, FILED: 0, RECOVERED: 0, REJECTED: 0, EXPIRED: 0 };
}

const OPEN_STATUSES: ReimbursementClaimStatus[] = ["DETECTED", "READY", "FILED"];

function daysLeft(windowExpiresAt: Date | null, now: Date): number | null {
  if (!windowExpiresAt) return null;
  return Math.ceil((windowExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

/** Resumen del Auditor de Reembolsos para un vendedor. */
export async function getReimbursementSummary(
  userId: string,
): Promise<ReimbursementSummary> {
  const empty: ReimbursementSummary = {
    hasAccount: false,
    lastAuditAt: null,
    successFeePct: SUCCESS_FEE_PCT,
    potentialRecovery: 0,
    recoveredTotal: 0,
    yourFee: 0,
    youKeep: 0,
    counts: emptyCounts(),
    claims: [],
  };

  const acc = await prisma.sellerAccount.findUnique({
    where: { userId },
    select: { id: true, lastReimbursementAuditAt: true },
  });
  if (!acc) return empty;

  const rows = await prisma.reimbursementClaim.findMany({
    where: { sellerAccountId: acc.id },
    orderBy: [{ status: "asc" }, { estimatedAmount: "desc" }],
  });

  const now = new Date();
  const counts = emptyCounts();
  let potentialRecovery = 0;
  let recoveredTotal = 0;

  const claims: ClaimView[] = rows.map((r) => {
    counts[r.status] += 1;
    if (OPEN_STATUSES.includes(r.status)) potentialRecovery += r.estimatedAmount;
    if (r.status === "RECOVERED") recoveredTotal += r.recoveredAmount ?? r.estimatedAmount;
    return {
      id: r.id,
      type: r.type,
      status: r.status,
      sku: r.sku,
      asin: r.asin,
      fnsku: r.fnsku,
      title: r.title,
      quantity: r.quantity,
      estimatedAmount: r.estimatedAmount,
      recoveredAmount: r.recoveredAmount,
      currency: r.currency,
      confidence: r.confidence,
      reason: r.reason,
      caseText: r.caseText ?? "",
      detectedAt: r.detectedAt.toISOString(),
      windowExpiresAt: r.windowExpiresAt?.toISOString() ?? null,
      daysLeft: daysLeft(r.windowExpiresAt, now),
    };
  });

  recoveredTotal = round2(recoveredTotal);
  return {
    hasAccount: true,
    lastAuditAt: acc.lastReimbursementAuditAt?.toISOString() ?? null,
    successFeePct: SUCCESS_FEE_PCT,
    potentialRecovery: round2(potentialRecovery),
    recoveredTotal,
    yourFee: successFee(recoveredTotal),
    youKeep: sellerKeeps(recoveredTotal),
    counts,
    claims,
  };
}

export type ClaimAction = "mark_ready" | "mark_filed" | "mark_recovered" | "mark_rejected";

const NEXT_STATUS: Record<ClaimAction, ReimbursementClaimStatus> = {
  mark_ready: "READY",
  mark_filed: "FILED",
  mark_recovered: "RECOVERED",
  mark_rejected: "REJECTED",
};

/**
 * Cambia el estado de una reclamación, validando la propiedad por usuario.
 * Para "mark_recovered" se puede fijar el importe realmente recuperado.
 */
export async function updateClaimStatus(params: {
  userId: string;
  claimId: string;
  action: ClaimAction;
  recoveredAmount?: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const acc = await prisma.sellerAccount.findUnique({
    where: { userId: params.userId },
    select: { id: true },
  });
  if (!acc) return { ok: false, error: "no_account" };

  const claim = await prisma.reimbursementClaim.findFirst({
    where: { id: params.claimId, sellerAccountId: acc.id },
    select: { id: true, estimatedAmount: true },
  });
  if (!claim) return { ok: false, error: "not_found" };

  const status = NEXT_STATUS[params.action];
  const data: {
    status: ReimbursementClaimStatus;
    filedAt?: Date;
    recoveredAt?: Date;
    recoveredAmount?: number;
  } = { status };
  if (status === "FILED") data.filedAt = new Date();
  if (status === "RECOVERED") {
    data.recoveredAt = new Date();
    const amt = params.recoveredAmount;
    data.recoveredAmount =
      amt != null && Number.isFinite(amt) && amt >= 0 ? round2(amt) : claim.estimatedAmount;
  }

  await prisma.reimbursementClaim.update({ where: { id: claim.id }, data });
  return { ok: true };
}
