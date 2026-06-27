/**
 * Tipos del Auditor de Reembolsos FBA.
 *
 * El motor (`detect.ts`) es 100% puro y agnóstico de la fuente: opera sobre
 * EVENTOS NORMALIZADOS que la capa SP-API (`finances.ts`) extrae de la
 * Finances API (y, en el futuro, de los informes de inventario/devoluciones).
 * Mantener estos tipos sin dependencias de servidor permite testear toda la
 * lógica de detección en Node sin tocar Amazon.
 */

/** Categoría de discrepancia: por qué Amazon debe dinero al vendedor. */
export type ClaimType =
  | "WAREHOUSE_LOST" // inventario perdido en almacén, sin reembolsar
  | "WAREHOUSE_DAMAGED" // dañado por Amazon, sin reembolsar
  | "INBOUND_SHORTAGE" // recibido menos de lo enviado en un envío FBA
  | "CUSTOMER_RETURN_MISSING" // cliente reembolsado pero la unidad no volvió al stock
  | "REIMBURSEMENT_SHORTFALL" // Amazon reembolsó por debajo del valor del producto
  | "OVERCHARGED_FEE"; // tarifa FBA cobrada de más o duplicada

/**
 * Ajuste de inventario (de `AdjustmentEventList` de la Finances API o del
 * Inventory Ledger). `quantity` negativo = unidades retiradas por Amazon;
 * positivo = repuestas/reembolsadas. `amount` = € que Amazon ya abonó por
 * este ajuste (0 si retiró stock sin pagar nada).
 */
export interface InventoryEvent {
  transactionId: string; // id único de Amazon (idempotencia)
  postedDate: string; // ISO 8601
  reason: string; // texto de Amazon: "WAREHOUSE_DAMAGE", "WAREHOUSE_LOST"…
  sku: string;
  fnsku?: string;
  asin?: string;
  title?: string;
  quantity: number;
  amount: number;
}

/** Reembolso a cliente (de `RefundEventList`). */
export interface RefundEvent {
  transactionId: string;
  postedDate: string; // ISO
  orderId: string;
  sku: string;
  asin?: string;
  title?: string;
  quantity: number; // unidades reembolsadas
  principal: number; // importe del producto reembolsado (sin envío), positivo
}

/**
 * Devolución física registrada (de Customer Returns). Una unidad que el
 * cliente devolvió; `restocked` = volvió a inventario vendible.
 */
export interface ReturnEvent {
  postedDate: string; // ISO
  orderId: string;
  sku: string;
  quantity: number;
  restocked: boolean;
}

/** Cargo de tarifa (de los fees de `ShipmentEventList`). */
export interface FeeEvent {
  transactionId: string;
  postedDate: string; // ISO
  orderId: string;
  sku: string;
  feeType: string; // "FBAPerUnitFulfillmentFee", "Commission"…
  amount: number; // € cobrados (positivo)
  quantity: number;
}

/** Bundle normalizado de eventos financieros de una cuenta y periodo. */
export interface FinancialEvents {
  inventory: InventoryEvent[];
  refunds: RefundEvent[];
  returns: ReturnEvent[];
  fees: FeeEvent[];
}

/** Valor por unidad a reclamar para un SKU (coste de reposición o neto). */
export interface SkuValuation {
  sku: string;
  asin?: string;
  title?: string;
  /** € por unidad que se reclamarán por ese SKU. */
  unitValue: number;
  /** true si `unitValue` es una estimación (no hay coste real configurado). */
  estimated: boolean;
}

/** Configuración del motor de detección. */
export interface DetectConfig {
  /** Valoraciones por SKU (clave = sku). */
  valuations: Map<string, SkuValuation>;
  /** Reloj inyectable (para tests deterministas). */
  now: Date;
  /** Días que damos a una devolución reembolsada para volver al stock. Def. 60. */
  returnWindowDays?: number;
  /** Meses de la ventana legal de reclamación de Amazon. Def. 18. */
  claimWindowMonths?: number;
  /** Moneda de los importes. Def. "EUR". */
  currency?: string;
}

/** Una reclamación candidata detectada por el motor. */
export interface ClaimCandidate {
  type: ClaimType;
  sku: string;
  asin: string;
  fnsku: string;
  title: string;
  quantity: number;
  /** € reclamables estimados. */
  estimatedAmount: number;
  currency: string;
  /** 0-100: qué tan sólida/defendible es la reclamación. */
  confidence: number;
  /** Explicación legible de por qué Amazon debe esto. */
  reason: string;
  /** Pruebas (ids, fechas, importes) para auditoría y para el texto del caso. */
  evidence: Record<string, unknown>;
  /** Clave de idempotencia: la misma discrepancia no se duplica entre auditorías. */
  dedupeKey: string;
  /** ISO de detección (= config.now). */
  detectedAt: string;
  /** ISO en que vence el derecho a reclamar. */
  windowExpiresAt: string;
  /** true si la ventana ya venció (no presentable). */
  expired: boolean;
}
