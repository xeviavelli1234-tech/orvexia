import "server-only";
import { prisma } from "@/lib/prisma";
import { SpApiClient } from "@/lib/amazon/client";
import { decryptToken } from "@/lib/crypto";
import { EU_MARKETPLACES } from "@/lib/amazon/endpoints";
import { fetchFinancialEvents } from "./finances";
import { detectClaims } from "./detect";
import { buildCaseText } from "./cases";
import type { ClaimCandidate, DetectConfig, SkuValuation } from "./types";

export interface AuditResult {
  accountsProcessed: number;
  candidates: number;
  created: number;
  updated: number;
  expiredSwept: number;
  errors: string[];
}

function emptyResult(): AuditResult {
  return {
    accountsProcessed: 0,
    candidates: 0,
    created: 0,
    updated: 0,
    expiredSwept: 0,
    errors: [],
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function currencyFor(marketplaceId: string): string {
  return EU_MARKETPLACES.find((m) => m.id === marketplaceId)?.currency ?? "EUR";
}

interface ListingRow {
  sku: string;
  asin: string;
  title: string;
  cost: number | null;
  shippingCost: number | null;
  priceCurrent: number;
  vatRate: number | null;
  feePercent: number | null;
}

/**
 * Valor por unidad a reclamar para cada SKU. Preferimos el coste de reposición
 * real (coste de compra + envío). Si no hay coste configurado, estimamos con el
 * ingreso neto de venta (precio − IVA − comisión) y marcamos `estimated`.
 */
function buildValuations(listings: ListingRow[]): Map<string, SkuValuation> {
  const map = new Map<string, SkuValuation>();
  for (const l of listings) {
    const cost = l.cost ?? 0;
    const shipping = l.shippingCost ?? 0;
    let unitValue: number;
    let estimated: boolean;
    if (cost > 0) {
      unitValue = round2(cost + shipping);
      estimated = false;
    } else {
      const vat = (l.vatRate ?? 21) / 100;
      const fee = (l.feePercent ?? 15) / 100;
      const net = l.priceCurrent / (1 + vat) - fee * l.priceCurrent;
      unitValue = round2(Math.max(0, net));
      estimated = true;
    }
    map.set(l.sku, { sku: l.sku, asin: l.asin, title: l.title, unitValue, estimated });
  }
  return map;
}

interface AuditAccountRow {
  id: string;
  refreshToken: string;
  spApiEnv: string;
  marketplaceId: string;
}

const ACCOUNT_SELECT = {
  id: true,
  refreshToken: true,
  spApiEnv: true,
  marketplaceId: true,
} as const;

/** Persiste una candidata de forma idempotente (clave: cuenta + dedupeKey). */
async function upsertCandidate(
  accountId: string,
  c: ClaimCandidate,
  result: AuditResult,
): Promise<void> {
  const caseText = buildCaseText(c);
  const existing = await prisma.reimbursementClaim.findUnique({
    where: {
      sellerAccountId_dedupeKey: { sellerAccountId: accountId, dedupeKey: c.dedupeKey },
    },
    select: { id: true, status: true },
  });

  const baseData = {
    type: c.type,
    sku: c.sku,
    asin: c.asin,
    fnsku: c.fnsku,
    title: c.title,
    quantity: c.quantity,
    estimatedAmount: c.estimatedAmount,
    currency: c.currency,
    confidence: c.confidence,
    reason: c.reason,
    evidence: c.evidence as object,
    caseText,
    windowExpiresAt: new Date(c.windowExpiresAt),
  };

  if (!existing) {
    await prisma.reimbursementClaim.create({
      data: {
        sellerAccountId: accountId,
        dedupeKey: c.dedupeKey,
        status: c.expired ? "EXPIRED" : "DETECTED",
        ...baseData,
      },
    });
    result.created++;
    return;
  }

  // Solo refrescamos importes/textos mientras la reclamación sigue en revisión.
  // Una vez presentada/recuperada/rechazada NO la tocamos (es estado humano).
  if (existing.status === "DETECTED" || existing.status === "READY") {
    await prisma.reimbursementClaim.update({
      where: { id: existing.id },
      data: { ...baseData, ...(c.expired ? { status: "EXPIRED" as const } : {}) },
    });
    result.updated++;
  }
}

/** Marca como EXPIRED las reclamaciones en revisión cuya ventana ya venció. */
async function sweepExpired(accountId: string, result: AuditResult): Promise<void> {
  const now = new Date();
  const r = await prisma.reimbursementClaim.updateMany({
    where: {
      sellerAccountId: accountId,
      status: { in: ["DETECTED", "READY"] },
      windowExpiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });
  result.expiredSwept += r.count;
}

async function processAccount(
  acc: AuditAccountRow,
  result: AuditResult,
): Promise<void> {
  result.accountsProcessed++;
  try {
    const listings = await prisma.sellerListing.findMany({
      where: { sellerAccountId: acc.id },
      select: {
        sku: true,
        asin: true,
        title: true,
        cost: true,
        shippingCost: true,
        priceCurrent: true,
        vatRate: true,
        feePercent: true,
      },
    });
    const valuations = buildValuations(listings);

    const client = new SpApiClient(
      decryptToken(acc.refreshToken),
      acc.spApiEnv as "sandbox" | "production",
      "eu",
    );
    const { events, hasReturnsData } = await fetchFinancialEvents({
      client,
      spApiEnv: acc.spApiEnv,
      marketplaceId: acc.marketplaceId,
    });

    // Sin señal fiable de reposición al stock, suprimimos la regla de
    // devolución-no-repuesta (evita falsos positivos en producción).
    if (!hasReturnsData) events.refunds = [];

    const config: DetectConfig = {
      valuations,
      now: new Date(),
      currency: currencyFor(acc.marketplaceId),
    };
    const candidates = detectClaims(events, config);
    result.candidates += candidates.length;

    for (const c of candidates) await upsertCandidate(acc.id, c, result);
    await sweepExpired(acc.id, result);

    await prisma.sellerAccount.update({
      where: { id: acc.id },
      data: { lastReimbursementAuditAt: new Date() },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : String(e);
    result.errors.push(`[${acc.id}] ${msg}`);
  }
}

/** Audita una sola cuenta (acción por-usuario). */
export async function auditReimbursementsForAccount(
  accountId: string,
): Promise<AuditResult> {
  const result = emptyResult();
  const acc = await prisma.sellerAccount.findFirst({
    where: { id: accountId, active: true, mode: "amazon" },
    select: ACCOUNT_SELECT,
  });
  if (acc) await processAccount(acc, result);
  return result;
}

/** Audita TODAS las cuentas activas conectadas a Amazon (cron). */
export async function auditAllAccountsReimbursements(): Promise<AuditResult> {
  const result = emptyResult();
  const accounts = await prisma.sellerAccount.findMany({
    where: { active: true, mode: "amazon" },
    select: ACCOUNT_SELECT,
  });
  for (const acc of accounts) await processAccount(acc, result);
  return result;
}
