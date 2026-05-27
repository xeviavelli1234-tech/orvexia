/**
 * Etiquetas legibles para los slugs de estrategia que devuelve el motor
 * de pricing heurístico (lib/assistant/pricing-core.ts) o la IA externa.
 *
 * El motor produce slugs en inglés con guión bajo: "balanced_midpoint",
 * "premium_anchor", "margin_floor", etc. Mostrarlos crudos en la UI queda
 * feo (UPPERCASE + underscore = chillido técnico). Esta función mapea los
 * conocidos a español y, para los desconocidos, hace un cleanup decente.
 */

const STRATEGY_LABELS_ES: Record<string, string> = {
  balanced_midpoint: "Punto medio",
  premium_anchor: "Anclaje premium",
  margin_floor: "Suelo de margen",
  market_gap_capture: "Hueco de mercado",
  undercut_buybox: "Bajada agresiva",
  liquidity_push: "Empuje de liquidez",
  unspecified: "Heurístico",
  // Slugs nativos del motor de reprecio (por si llegan aquí también).
  buybox: "Ganar Buy Box",
  buybox_winner: "Ganar Buy Box (vs. ganador)",
  match: "Igualar competidor",
  fixed: "Precio fijo",
  margin: "Por margen",
};

export function prettyStrategy(raw: string | null | undefined): string {
  if (!raw) return "—";
  const k = raw.trim().toLowerCase();
  if (k === "") return "—";
  const known = STRATEGY_LABELS_ES[k];
  if (known) return known;
  // Desconocido: reemplaza _ por espacio y capitaliza la primera letra.
  const cleaned = k.replace(/_+/g, " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
