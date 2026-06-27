/**
 * Generador del TEXTO DEL CASO — FUNCIONES PURAS.
 *
 * Por cumplimiento, Orvexia NO abre casos automáticamente en Seller Central.
 * En su lugar redacta el mensaje listo para que el vendedor lo revise y lo
 * pegue él mismo en "Obtener soporte → Reembolsos FBA". Cada plantilla incluye
 * las pruebas (FNSKU, ids de transacción, fechas, importes) que Amazon pide.
 */

import type { ClaimCandidate, ClaimType } from "./types";

const TYPE_SUBJECT: Record<ClaimType, string> = {
  WAREHOUSE_LOST: "Inventario perdido en almacén no reembolsado",
  WAREHOUSE_DAMAGED: "Inventario dañado por Amazon no reembolsado",
  INBOUND_SHORTAGE: "Faltante en recepción de envío FBA",
  CUSTOMER_RETURN_MISSING: "Devolución reembolsada al cliente nunca repuesta",
  REIMBURSEMENT_SHORTFALL: "Reembolso por inventario inferior al valor del producto",
  OVERCHARGED_FEE: "Tarifa de gestión FBA cobrada por duplicado",
};

function evStr(ev: Record<string, unknown>, key: string): string {
  const v = ev[key];
  return v == null ? "—" : String(v);
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

/**
 * Redacta el cuerpo del caso para una reclamación. Determinista (no usa reloj
 * ni aleatoriedad): el mismo candidate produce siempre el mismo texto.
 */
export function buildCaseText(c: ClaimCandidate): string {
  const ev = c.evidence ?? {};
  const subject = TYPE_SUBJECT[c.type];
  const lines: string[] = [];

  lines.push(`Asunto: ${subject}`);
  lines.push("");
  lines.push("Hola,");
  lines.push("");

  switch (c.type) {
    case "WAREHOUSE_LOST":
    case "WAREHOUSE_DAMAGED":
    case "INBOUND_SHORTAGE":
      lines.push(
        `Solicito el reembolso de ${c.quantity} unidad(es) del SKU ${c.sku}` +
          (c.fnsku ? ` (FNSKU ${c.fnsku})` : "") +
          ` que figuran como ${ev.reason ? `"${evStr(ev, "reason")}"` : "perdidas/dañadas"} ` +
          `en un ajuste de inventario del ${fmtDate(c.detectedAt && (ev.postedDate as string))} ` +
          `y por las que no consta reembolso en mi cuenta.`,
      );
      lines.push(
        `Transacción de referencia: ${evStr(ev, "transactionId")}. ` +
          `Valor reclamado: ${c.estimatedAmount} ${c.currency}.`,
      );
      break;
    case "CUSTOMER_RETURN_MISSING":
      lines.push(
        `En el pedido ${evStr(ev, "orderId")} reembolsé ${c.quantity} unidad(es) del SKU ${c.sku} ` +
          `al cliente el ${fmtDate(ev.refundedAt as string)}. Han pasado más de 45 días y la mercancía ` +
          `no ha regresado a mi inventario vendible ni consta reembolso por parte de Amazon.`,
      );
      lines.push(
        `Solicito el reembolso del valor de la mercancía no devuelta: ${c.estimatedAmount} ${c.currency}.`,
      );
      break;
    case "REIMBURSEMENT_SHORTFALL":
      lines.push(
        `Amazon reembolsó ${evStr(ev, "reimbursedAlready")} ${c.currency} por ${c.quantity} unidad(es) ` +
          `del SKU ${c.sku} perdidas/dañadas, importe inferior al valor real del producto. ` +
          `Solicito la diferencia: ${c.estimatedAmount} ${c.currency}.`,
      );
      lines.push(`Transacción de referencia: ${evStr(ev, "transactionId")}.`);
      break;
    case "OVERCHARGED_FEE": {
      const charges = Array.isArray(ev.charges) ? (ev.charges as Array<Record<string, unknown>>) : [];
      lines.push(
        `La tarifa "${evStr(ev, "feeType")}" del pedido ${evStr(ev, "orderId")} (SKU ${c.sku}) ` +
          `se cobró ${charges.length} veces cuando solo correspondía una. ` +
          `Solicito el reembolso de los ${c.quantity} cargo(s) duplicado(s): ${c.estimatedAmount} ${c.currency}.`,
      );
      for (const ch of charges) {
        lines.push(`  · ${fmtDate(ch.postedDate as string)} — ${evStr(ch, "transactionId")} — ${evStr(ch, "amount")} ${c.currency}`);
      }
      break;
    }
  }

  lines.push("");
  lines.push("Quedo a la espera de su confirmación. Gracias.");
  return lines.join("\n");
}
