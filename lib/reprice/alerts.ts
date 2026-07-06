/**
 * Tipos y utilidades de alertas del repricer — PURO, sin side effects.
 * El envío real (email) vive en lib/email.ts; el motor (runner) sólo
 * acumula alertas y, al final del ciclo, dispara un único correo resumen.
 */

export type RepriceAlertKind =
  | "buybox_lost"
  | "buybox_won"
  | "price_floor"
  | "dumper"
  | "error";

export interface RepriceAlert {
  kind: RepriceAlertKind;
  sku: string;
  title: string;
  detail: string;
}

/** Asunto del correo resumen según el contenido de las alertas. */
export function alertSubject(alerts: RepriceAlert[]): string {
  const lost = alerts.filter((a) => a.kind === "buybox_lost").length;
  const won = alerts.filter((a) => a.kind === "buybox_won").length;
  const floor = alerts.filter((a) => a.kind === "price_floor").length;
  const dump = alerts.filter((a) => a.kind === "dumper").length;
  const err = alerts.filter((a) => a.kind === "error").length;
  const parts: string[] = [];
  if (lost) parts.push(`${lost} Buy Box perdida${lost === 1 ? "" : "s"}`);
  if (won) parts.push(`${won} Buy Box recuperada${won === 1 ? "" : "s"}`);
  if (floor) parts.push(`${floor} en precio mínimo`);
  if (dump) parts.push(`${dump} dumper${dump === 1 ? "" : "s"} detectado${dump === 1 ? "" : "s"}`);
  if (err) parts.push(`${err} error${err === 1 ? "" : "es"}`);
  return `Orvexia Repricer · ${parts.join(" · ") || "actividad"}`;
}

export const ALERT_LABEL: Record<RepriceAlertKind, string> = {
  buybox_lost: "Buy Box perdida",
  buybox_won: "Buy Box recuperada",
  price_floor: "Precio mínimo alcanzado",
  dumper: "Dumper detectado",
  error: "Error de reprecio",
};
