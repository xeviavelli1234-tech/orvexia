/**
 * Motor de detección de reembolsos FBA — FUNCIONES PURAS, 100% testeables.
 *
 * Cruza los eventos financieros normalizados (`FinancialEvents`) con la
 * valoración por SKU y produce reclamaciones candidatas (`ClaimCandidate`).
 * Cada candidata lleva una CONFIANZA (0-100) y una VENTANA de caducidad: el
 * vendedor revisa antes de presentar el caso (NO presentamos nada en
 * automático — Amazon prohíbe el auto-filing masivo).
 *
 * Notas de honestidad del modelo:
 *   - `InventoryEvent.amount` se interpreta como lo YA reembolsado por esa
 *     pérdida concreta. La conciliación fina pérdida↔reembolso entre eventos
 *     separados la hace la capa de normalización; aquí confiamos en ese campo.
 *   - Si no hay coste real del SKU, `SkuValuation.estimated` baja la confianza.
 */

import type {
  ClaimCandidate,
  ClaimType,
  DetectConfig,
  FeeEvent,
  FinancialEvents,
  InventoryEvent,
  RefundEvent,
  ReturnEvent,
  SkuValuation,
} from "./types";

const DEFAULT_RETURN_WINDOW_DAYS = 60;
const DEFAULT_CLAIM_WINDOW_MONTHS = 18;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  r.setMonth(r.getMonth() + months);
  return r;
}

/** Razones de ajuste imputables a Amazon (culpa del almacén / transportista). */
function classifyReason(reason: string): ClaimType | null {
  const r = reason.toUpperCase();
  if (/(LOST|MISSING|MISPLACED|NOT_RECEIVED|INBOUND)/.test(r)) {
    return /INBOUND/.test(r) ? "INBOUND_SHORTAGE" : "WAREHOUSE_LOST";
  }
  if (/(DAMAGE|DESTROYED|DEFECTIVE|DISPOSED)/.test(r)) return "WAREHOUSE_DAMAGED";
  return null;
}

const FEE_OVERCHARGE_RE = /(fba|fulfil?lment|fulfilment|weight|handling)/i;

function valuationFor(
  config: DetectConfig,
  sku: string,
): SkuValuation {
  return (
    config.valuations.get(sku) ?? {
      sku,
      unitValue: 0,
      estimated: true,
    }
  );
}

function windowFor(config: DetectConfig, postedISO: string): {
  windowExpiresAt: string;
  expired: boolean;
} {
  const months = config.claimWindowMonths ?? DEFAULT_CLAIM_WINDOW_MONTHS;
  const expires = addMonths(new Date(postedISO), months);
  return {
    windowExpiresAt: expires.toISOString(),
    expired: config.now.getTime() > expires.getTime(),
  };
}

/** Penaliza la confianza si la valoración del SKU es estimada. */
function confidence(base: number, valuation: SkuValuation): number {
  const c = valuation.estimated ? base - 15 : base;
  return Math.max(0, Math.min(100, Math.round(c)));
}

function baseCandidate(
  type: ClaimType,
  valuation: SkuValuation,
  sku: string,
  fnsku: string,
  quantity: number,
  amount: number,
  conf: number,
  reason: string,
  evidence: Record<string, unknown>,
  dedupeKey: string,
  postedISO: string,
  config: DetectConfig,
): ClaimCandidate {
  const w = windowFor(config, postedISO);
  return {
    type,
    sku,
    asin: valuation.asin ?? "",
    fnsku,
    title: valuation.title ?? "",
    quantity,
    estimatedAmount: round2(amount),
    currency: config.currency ?? "EUR",
    confidence: conf,
    reason,
    evidence,
    dedupeKey,
    detectedAt: config.now.toISOString(),
    windowExpiresAt: w.windowExpiresAt,
    expired: w.expired,
  };
}

// ─── Regla 1: inventario perdido/dañado sin reembolsar (o reembolsado de menos) ──
function detectInventory(
  events: InventoryEvent[],
  config: DetectConfig,
): ClaimCandidate[] {
  const out: ClaimCandidate[] = [];
  for (const ev of events) {
    if (!ev.sku || ev.quantity >= 0) continue; // solo retiradas de stock
    const type = classifyReason(ev.reason);
    if (!type) continue;

    const units = Math.abs(ev.quantity);
    const val = valuationFor(config, ev.sku);
    const expected = round2(units * val.unitValue);
    if (expected <= 0) continue; // sin valoración no podemos cuantificar

    const reimbursed = Math.max(0, ev.amount);
    const fnsku = ev.fnsku ?? "";
    const evidence = {
      transactionId: ev.transactionId,
      reason: ev.reason,
      postedDate: ev.postedDate,
      units,
      unitValue: val.unitValue,
      reimbursedAlready: round2(reimbursed),
      estimatedValuation: val.estimated,
    };

    if (reimbursed <= 0.01) {
      out.push(
        baseCandidate(
          type,
          val,
          ev.sku,
          fnsku,
          units,
          expected,
          confidence(85, val),
          `Amazon retiró ${units} ud. (${ev.reason}) sin reembolsar. Valor reclamable ≈ ${expected} €.`,
          evidence,
          `${type}:${ev.transactionId}`,
          ev.postedDate,
          config,
        ),
      );
    } else if (reimbursed < expected * 0.9) {
      const diff = round2(expected - reimbursed);
      out.push(
        baseCandidate(
          "REIMBURSEMENT_SHORTFALL",
          val,
          ev.sku,
          fnsku,
          units,
          diff,
          confidence(60, val),
          `Amazon reembolsó ${round2(reimbursed)} € por ${units} ud. perdidas/dañadas, pero el valor es ≈ ${expected} €. Diferencia reclamable ${diff} €.`,
          evidence,
          `REIMBURSEMENT_SHORTFALL:${ev.transactionId}`,
          ev.postedDate,
          config,
        ),
      );
    }
  }
  return out;
}

// ─── Regla 2: cliente reembolsado pero la unidad nunca volvió al stock ──────────
function detectMissingReturns(
  refunds: RefundEvent[],
  returns: ReturnEvent[],
  config: DetectConfig,
): ClaimCandidate[] {
  const windowDays = config.returnWindowDays ?? DEFAULT_RETURN_WINDOW_DAYS;
  const out: ClaimCandidate[] = [];

  for (const rf of refunds) {
    if (!rf.sku || rf.quantity <= 0) continue;
    const refundedAt = new Date(rf.postedDate);
    const deadline = addDays(refundedAt, windowDays);

    // ¿Volvió la unidad al stock vendible para este pedido+SKU?
    const restocked = returns.some(
      (rt) => rt.orderId === rf.orderId && rt.sku === rf.sku && rt.restocked,
    );
    if (restocked) continue;

    // Aún dentro de la ventana de devolución: el cliente todavía puede devolver.
    if (config.now.getTime() <= deadline.getTime()) continue;

    const val = valuationFor(config, rf.sku);
    const amount = round2(rf.quantity * val.unitValue);
    if (amount <= 0) continue;

    out.push(
      baseCandidate(
        "CUSTOMER_RETURN_MISSING",
        val,
        rf.sku,
        "",
        rf.quantity,
        amount,
        confidence(70, val),
        `Reembolsaste ${rf.quantity} ud. al cliente del pedido ${rf.orderId} hace más de ${windowDays} días y la mercancía nunca volvió a tu inventario. Reclamable ≈ ${amount} €.`,
        {
          transactionId: rf.transactionId,
          orderId: rf.orderId,
          refundedAt: rf.postedDate,
          principal: round2(rf.principal),
          units: rf.quantity,
          unitValue: val.unitValue,
          estimatedValuation: val.estimated,
        },
        `CUSTOMER_RETURN_MISSING:${rf.transactionId}`,
        rf.postedDate,
        config,
      ),
    );
  }
  return out;
}

// ─── Regla 3: tarifas FBA cobradas de más o duplicadas ─────────────────────────
function detectOverchargedFees(
  fees: FeeEvent[],
  config: DetectConfig,
): ClaimCandidate[] {
  const out: ClaimCandidate[] = [];
  const groups = new Map<string, FeeEvent[]>();
  for (const f of fees) {
    if (!f.sku || !FEE_OVERCHARGE_RE.test(f.feeType) || f.amount <= 0) continue;
    const key = `${f.orderId}|${f.sku}|${f.feeType}`;
    const arr = groups.get(key) ?? [];
    arr.push(f);
    groups.set(key, arr);
  }

  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const sorted = [...list].sort(
      (a, b) => new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime(),
    );
    const first = sorted[0];
    // Duplicados = cargos posteriores con el MISMO importe (±1%) que el primero.
    const dups = sorted
      .slice(1)
      .filter((f) => Math.abs(f.amount - first.amount) <= first.amount * 0.01 + 0.001);
    if (dups.length === 0) continue;

    const val = valuationFor(config, first.sku);
    const amount = round2(dups.reduce((s, f) => s + f.amount, 0));
    out.push(
      baseCandidate(
        "OVERCHARGED_FEE",
        val,
        first.sku,
        "",
        dups.length,
        amount,
        65,
        `La tarifa "${first.feeType}" se cobró ${list.length} veces en el pedido ${first.orderId} (esperado: 1). ${dups.length} cargo(s) duplicado(s) por ${amount} €.`,
        {
          orderId: first.orderId,
          feeType: first.feeType,
          charges: sorted.map((f) => ({
            transactionId: f.transactionId,
            postedDate: f.postedDate,
            amount: round2(f.amount),
          })),
        },
        `OVERCHARGED_FEE:${key}`,
        first.postedDate,
        config,
      ),
    );
  }
  return out;
}

/**
 * Detecta todas las reclamaciones candidatas de un bundle de eventos.
 * Determinista: mismo input + misma `config.now` ⇒ mismo output.
 */
export function detectClaims(
  events: FinancialEvents,
  config: DetectConfig,
): ClaimCandidate[] {
  return [
    ...detectInventory(events.inventory, config),
    ...detectMissingReturns(events.refunds, events.returns, config),
    ...detectOverchargedFees(events.fees, config),
  ];
}

/** Resumen agregado de un conjunto de candidatas (para KPIs). */
export interface CandidateSummary {
  count: number;
  totalAmount: number;
  byType: Record<string, { count: number; amount: number }>;
}

export function summarizeCandidates(
  candidates: ClaimCandidate[],
): CandidateSummary {
  const byType: Record<string, { count: number; amount: number }> = {};
  let totalAmount = 0;
  for (const c of candidates) {
    if (c.expired) continue;
    totalAmount += c.estimatedAmount;
    const slot = byType[c.type] ?? { count: 0, amount: 0 };
    slot.count += 1;
    slot.amount = round2(slot.amount + c.estimatedAmount);
    byType[c.type] = slot;
  }
  const active = candidates.filter((c) => !c.expired);
  return { count: active.length, totalAmount: round2(totalAmount), byType };
}
