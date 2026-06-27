import "server-only";
import { SpApiClient } from "@/lib/amazon/client";
import { isFixtureMode } from "@/lib/amazon/fixtures";
import type {
  FeeEvent,
  FinancialEvents,
  InventoryEvent,
  RefundEvent,
} from "./types";

/**
 * Capa SP-API Finances del Auditor de Reembolsos.
 *
 * Extrae de `/finances/v0/financialEvents` los eventos que permiten detectar
 * dinero que Amazon debe:
 *   - AdjustmentEventList  → ajustes de inventario (perdido/dañado).
 *   - RefundEventList      → reembolsos a clientes.
 *   - ShipmentEventList    → tarifas (para detectar cargos duplicados).
 *
 * Limitación conocida (documentada, igual que `orders.ts` con el 403): la
 * señal de "la unidad volvió al stock" vive en el informe de Devoluciones FBA
 * (Reports API), no en Finances. Sin ella, NO activamos la regla de
 * devolución-no-repuesta en producción para no generar falsos positivos:
 * `hasReturnsData` queda en false y el orquestador suprime esa regla. El modo
 * fixtures sí trae datos completos para mostrar toda la herramienta.
 */

export interface FetchedFinancials {
  events: FinancialEvents;
  /** true si tenemos señal fiable de reposición al stock (informe de devoluciones). */
  hasReturnsData: boolean;
}

interface FinancesCtx {
  client: SpApiClient;
  spApiEnv: string;
  marketplaceId?: string;
}

interface Money {
  CurrencyAmount?: number;
  CurrencyCode?: string;
}
interface AdjustmentItem {
  Quantity?: string | number;
  PerUnitAmount?: Money;
  TotalAmount?: Money;
  SellerSKU?: string;
  FnSKU?: string;
  ASIN?: string;
  ProductDescription?: string;
}
interface AdjustmentEvent {
  AdjustmentType?: string;
  PostedDate?: string;
  AdjustmentAmount?: Money;
  AdjustmentItemList?: AdjustmentItem[];
}
interface ItemCharge {
  ChargeType?: string;
  ChargeAmount?: Money;
}
interface ItemFee {
  FeeType?: string;
  FeeAmount?: Money;
}
interface ShipmentItem {
  SellerSKU?: string;
  QuantityShipped?: number;
  ItemFeeList?: ItemFee[];
}
interface ShipmentEvent {
  AmazonOrderId?: string;
  PostedDate?: string;
  ShipmentItemList?: ShipmentItem[];
}
interface RefundShipmentItemAdj {
  SellerSKU?: string;
  QuantityShipped?: number;
  ItemChargeAdjustmentList?: ItemCharge[];
}
interface RefundEventRaw {
  AmazonOrderId?: string;
  PostedDate?: string;
  ShipmentItemAdjustmentList?: RefundShipmentItemAdj[];
}
interface FinancialEventsPayload {
  payload?: {
    FinancialEvents?: {
      AdjustmentEventList?: AdjustmentEvent[];
      RefundEventList?: RefundEventRaw[];
      ShipmentEventList?: ShipmentEvent[];
    };
    NextToken?: string;
  };
}

const num = (m: Money | undefined): number =>
  m && Number.isFinite(m.CurrencyAmount) ? Number(m.CurrencyAmount) : 0;

function parseAdjustments(list: AdjustmentEvent[]): InventoryEvent[] {
  const out: InventoryEvent[] = [];
  for (const ev of list) {
    const reason = ev.AdjustmentType ?? "";
    const posted = ev.PostedDate ?? "";
    const items = ev.AdjustmentItemList ?? [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qtyRaw = Number(it.Quantity ?? 0);
      if (!it.SellerSKU || !Number.isFinite(qtyRaw) || qtyRaw === 0) continue;
      // En Finances la cantidad viene positiva; el signo lo marca el tipo de
      // ajuste. Tratamos como retirada de stock (negativa) salvo que el importe
      // sea claramente un crédito ya abonado.
      const total = num(it.TotalAmount);
      out.push({
        transactionId: `${posted}:${reason}:${it.SellerSKU}:${i}`,
        postedDate: posted,
        reason,
        sku: it.SellerSKU,
        fnsku: it.FnSKU ?? "",
        asin: it.ASIN ?? "",
        title: it.ProductDescription ?? "",
        quantity: -Math.abs(qtyRaw),
        amount: Math.max(0, total),
      });
    }
  }
  return out;
}

function parseRefunds(list: RefundEventRaw[]): RefundEvent[] {
  const out: RefundEvent[] = [];
  for (const ev of list) {
    const orderId = ev.AmazonOrderId ?? "";
    const posted = ev.PostedDate ?? "";
    const items = ev.ShipmentItemAdjustmentList ?? [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.SellerSKU) continue;
      const principal = Math.abs(
        (it.ItemChargeAdjustmentList ?? [])
          .filter((c) => (c.ChargeType ?? "").toLowerCase().includes("principal"))
          .reduce((s, c) => s + num(c.ChargeAmount), 0),
      );
      out.push({
        transactionId: `${posted}:${orderId}:${it.SellerSKU}:${i}`,
        postedDate: posted,
        orderId,
        sku: it.SellerSKU,
        quantity: Math.abs(it.QuantityShipped ?? 1),
        principal,
      });
    }
  }
  return out;
}

function parseFees(list: ShipmentEvent[]): FeeEvent[] {
  const out: FeeEvent[] = [];
  for (const ev of list) {
    const orderId = ev.AmazonOrderId ?? "";
    const posted = ev.PostedDate ?? "";
    const items = ev.ShipmentItemList ?? [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.SellerSKU) continue;
      for (let j = 0; j < (it.ItemFeeList ?? []).length; j++) {
        const fee = (it.ItemFeeList ?? [])[j];
        const amount = Math.abs(num(fee.FeeAmount));
        if (amount <= 0) continue;
        out.push({
          transactionId: `${posted}:${orderId}:${it.SellerSKU}:${fee.FeeType ?? "fee"}:${i}-${j}`,
          postedDate: posted,
          orderId,
          sku: it.SellerSKU,
          feeType: fee.FeeType ?? "",
          amount,
          quantity: it.QuantityShipped ?? 1,
        });
      }
    }
  }
  return out;
}

/** Descarga y normaliza los eventos financieros de los últimos `sinceDays` días. */
export async function fetchFinancialEvents(
  ctx: FinancesCtx,
  sinceDays = 540, // ~18 meses: cubre toda la ventana de reclamación
): Promise<FetchedFinancials> {
  if (isFixtureMode(ctx.spApiEnv)) {
    return { events: generateFixtureFinancials(), hasReturnsData: true };
  }

  const postedAfter = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)
    .toISOString();
  const events: FinancialEvents = { inventory: [], refunds: [], returns: [], fees: [] };
  let nextToken: string | undefined;
  let pages = 0;

  try {
    do {
      const params: Record<string, string> = nextToken
        ? { NextToken: nextToken }
        : { PostedAfter: postedAfter, MaxResultsPerPage: "100" };
      const res = await ctx.client.get<FinancialEventsPayload>(
        "/finances/v0/financialEvents",
        params,
      );
      const fe = res.payload?.FinancialEvents;
      if (fe) {
        events.inventory.push(...parseAdjustments(fe.AdjustmentEventList ?? []));
        events.refunds.push(...parseRefunds(fe.RefundEventList ?? []));
        events.fees.push(...parseFees(fe.ShipmentEventList ?? []));
      }
      nextToken = res.payload?.NextToken;
      pages++;
      if (pages > 80) break; // freno de mano
    } while (nextToken);
  } catch (e) {
    const err = e as { status?: number };
    if (err.status === 403) {
      console.warn(
        "[reembolsos] Finances API devolvió 403 — la app no tiene el rol Finance aprobado todavía.",
      );
      return { events, hasReturnsData: false };
    }
    throw e;
  }

  // Sin informe de devoluciones FBA, no tenemos señal de reposición al stock.
  return { events, hasReturnsData: false };
}

/**
 * Datos sintéticos para modo demo/fixtures: una pérdida sin reembolsar, un
 * daño, una devolución reembolsada y no repuesta, y una tarifa FBA duplicada.
 * Así el vendedor ve toda la herramienta funcionando sin Amazon real.
 */
function generateFixtureFinancials(): FinancialEvents {
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

  return {
    inventory: [
      {
        transactionId: "DEMO-LOST-1",
        postedDate: daysAgo(40),
        reason: "WAREHOUSE_LOST",
        sku: "ORX-LAV-001",
        fnsku: "X00DEMO01",
        asin: "B0FIXTURE01",
        title: "Lavadora demo",
        quantity: -2,
        amount: 0,
      },
      {
        transactionId: "DEMO-DMG-1",
        postedDate: daysAgo(25),
        reason: "WAREHOUSE_DAMAGE",
        sku: "ORX-TV-001",
        fnsku: "X00DEMO02",
        asin: "B0FIXTURE02",
        title: "TV demo",
        quantity: -1,
        amount: 0,
      },
    ],
    refunds: [
      {
        transactionId: "DEMO-RF-1",
        postedDate: daysAgo(80),
        orderId: "DEMO-303-1",
        sku: "ORX-FRI-001",
        quantity: 1,
        principal: 320,
      },
    ],
    returns: [], // la devolución de arriba NO fue repuesta → reclamable
    fees: [
      {
        transactionId: "DEMO-FE-1",
        postedDate: daysAgo(15),
        orderId: "DEMO-404-1",
        sku: "ORX-TV-001",
        feeType: "FBAPerUnitFulfillmentFee",
        amount: 4.2,
        quantity: 1,
      },
      {
        transactionId: "DEMO-FE-2",
        postedDate: daysAgo(15),
        orderId: "DEMO-404-1",
        sku: "ORX-TV-001",
        feeType: "FBAPerUnitFulfillmentFee",
        amount: 4.2,
        quantity: 1,
      },
    ],
  };
}
