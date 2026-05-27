/**
 * Helpers puros del grafo (sin hooks, sin estado, sin DOM).
 *
 * Antes vivían dentro de ProductNetwork.tsx. Extraídos aquí para reducir
 * el archivo monolítico y poder añadir tests si hace falta.
 */

import type { NetNode, State } from "./types";

// ── Constantes del viewport ───────────────────────────────────────────────

export const VB_W = 1900;
export const VB_H = 1050;
export const R = 38;
export const K_MIN = 0.65;
export const K_MAX = 4;

/** Limita el paneo: solo se permite asomarse un poco a las esquinas. */
export function clampView(v: { k: number; x: number; y: number }) {
  const mx = VB_W * 0.07;
  const my = VB_H * 0.07;
  const bx0 = VB_W * 0.12,
    bx1 = VB_W * 0.88,
    by0 = VB_H * 0.1,
    by1 = VB_H * 0.9;

  // Margen libre de paneo (se permite moverse "un poco", no infinito).
  const freeX = VB_W * 0.28;
  const freeY = VB_H * 0.28;

  let xMin: number, xMax: number;
  {
    const lo = VB_W - mx - v.k * bx1;
    const hi = mx - v.k * bx0;
    if (lo <= hi) {
      xMin = lo - freeX * 0.6;
      xMax = hi + freeX * 0.6;
    } else {
      const c = (lo + hi) / 2;
      xMin = c - freeX;
      xMax = c + freeX;
    }
  }

  let yMin: number, yMax: number;
  {
    const lo = VB_H - my - v.k * by1;
    const hi = my - v.k * by0;
    if (lo <= hi) {
      yMin = lo - freeY * 0.6;
      yMax = hi + freeY * 0.6;
    } else {
      const c = (lo + hi) / 2;
      yMin = c - freeY;
      yMax = c + freeY;
    }
  }

  return {
    k: v.k,
    x: Math.min(xMax, Math.max(xMin, v.x)),
    y: Math.min(yMax, Math.max(yMin, v.y)),
  };
}

/** Convierte el código de origen en una etiqueta legible bajo el hub. */
export function humanizeSource(source: string): string {
  if (source === "manual") return "Tu tienda";
  if (source === "amazon") return "Amazon";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k - 90);
    pts.push(
      `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`,
    );
  }
  return pts.join(" ");
}

export function sym(code: string): string {
  if (code === "EUR") return "€";
  if (code === "USD") return "$";
  if (code === "GBP") return "£";
  return code;
}

export function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function fmt(n: number): string {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Estado del nodo por prioridad: error/Buy Box perdida es lo más urgente. */
export function nodeState(n: NetNode): State {
  const isManual = n.source === "manual";
  // Para productos manuales NO requerimos ASIN (no tienen porque vienen de
  // un CSV propio del vendedor). Sólo nos importa que tengan precio.
  if (n.priceCurrent <= 0 || (!isManual && !n.asin)) return "noprice";
  if (!n.repricingEnabled) return "paused";
  if (n.lastSuccess === false) return "error";
  if (n.buyBoxStatus === "LOST") return "lost";
  if (
    n.lastReason === "min_floor" ||
    n.lastReason === "margin_floor" ||
    n.lastReason === "max_ceiling"
  )
    return "floor";
  if (n.buyBoxStatus === "WON") return "won";
  return "active";
}

export const STATE_COLOR: Record<
  State,
  { stroke: string; halo: string; dot?: string }
> = {
  won: {
    stroke: "rgba(52,211,153,0.95)",
    halo: "rgba(52,211,153,0.85)",
    dot: "#34d399",
  },
  active: {
    stroke: "rgba(34,211,238,0.9)",
    halo: "rgba(34,211,238,0.55)",
    dot: "#22d3ee",
  },
  floor: {
    stroke: "rgba(251,191,36,0.95)",
    halo: "rgba(251,191,36,0.6)",
    dot: "#fbbf24",
  },
  lost: {
    stroke: "rgba(248,113,113,0.95)",
    halo: "rgba(248,113,113,0.6)",
    dot: "#f87171",
  },
  error: {
    stroke: "rgba(249,115,22,0.95)",
    halo: "rgba(249,115,22,0.55)",
    dot: "#fb923c",
  },
  paused: { stroke: "rgba(96,165,250,0.7)", halo: "rgba(99,102,241,0.4)" },
  noprice: { stroke: "rgba(160,160,180,0.4)", halo: "rgba(120,120,140,0.25)" },
};

export const LIVE_CORE: ReadonlySet<State> = new Set<State>([
  "won",
  "active",
  "floor",
]);

export const STATE_LABEL: Array<{ st: State; label: string }> = [
  { st: "won", label: "Buy Box ganada" },
  { st: "lost", label: "Buy Box perdida" },
  { st: "error", label: "Error de reprecio" },
  { st: "floor", label: "En precio mínimo / techo" },
  { st: "active", label: "Repreciando (sin datos aún)" },
  { st: "paused", label: "Configurable / pausado" },
  { st: "noprice", label: "Sin oferta o ASIN en Amazon" },
];

export function pnum(s: string): number {
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Diagnóstico accionable para el producto seleccionado. */
export function diagnose(
  n: NetNode,
): { tone: "ok" | "warn" | "info"; text: string } | null {
  const f = (v: number) =>
    v.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    " " +
    sym(n.currency);
  if (n.priceCurrent <= 0 || !n.asin) return null;
  if (n.priceMin == null || n.priceMax == null)
    return {
      tone: "info",
      text: "Aún sin rango. Define Precio mín y máx y pulsa «Guardar rango» para poder repreciar.",
    };
  if (!n.repricingEnabled)
    return {
      tone: "info",
      text: "Reprecio pausado. Activa «Reprecio automático» para que el motor actúe.",
    };
  if (n.buyBoxStatus === "WON")
    return {
      tone: "ok",
      text: "Tienes la Buy Box. El motor mantiene tu posición.",
    };
  if (
    n.buyBoxStatus === "LOST" &&
    n.buyBoxPrice != null &&
    n.priceMin >= n.buyBoxPrice
  )
    return {
      tone: "warn",
      text: `Tu mínimo (${f(n.priceMin)}) es ≥ al precio de la Buy Box (${f(
        n.buyBoxPrice,
      )}). Baja el mínimo por debajo de ${f(n.buyBoxPrice)} para poder ganarla.`,
    };
  if (n.lastReason === "min_floor" || n.lastReason === "margin_floor")
    return {
      tone: "warn",
      text: "El motor topó con tu suelo (mínimo o margen): no puede bajar más. Baja el mínimo o el margen objetivo para competir.",
    };
  if (n.buyBoxStatus === "LOST")
    return {
      tone: "warn",
      text: "Otro vendedor tiene la Buy Box. Revisa tu estrategia/rango y ejecuta un ciclo.",
    };
  return {
    tone: "info",
    text: "Repreciando. Pulsa «Ejecutar reprecio ahora» (barra izquierda) para ver el resultado del próximo ciclo.",
  };
}

export function errMsg(code: string): string {
  // Caso especial: el motor adjunta los conteos al final del code.
  // Formato esperado: "active_limit_reached:42/50".
  if (code.startsWith("active_limit_reached")) {
    const m = code.match(/active_limit_reached:(\d+)\/(\d+|Infinity)/);
    if (m) {
      return `Has llegado al máximo de productos con reprecio activo (${m[1]}/${m[2]}). Pausa alguno o sube de plan.`;
    }
    return "Has llegado al máximo de productos con reprecio activo. Sube de plan para añadir más.";
  }
  const map: Record<string, string> = {
    price_max_must_be_greater_or_equal_to_min:
      "El máximo debe ser ≥ al mínimo",
    missing_price_range: "Define mín y máx primero",
    listing_not_repriceable:
      "Sin precio/ASIN en Amazon: no se puede repreciar",
    fixed_price_required: "Indica un precio fijo válido",
    cost_required: "Indica el coste del producto",
    invalid_undercut: "Valor de ajuste no válido",
    invalid_rating: "La valoración mínima debe estar entre 0 y 5",
    listing_not_found_or_not_owned: "Producto no encontrado",
    unauthorized: "Sesión expirada",
    validation_failed: "Datos inválidos",
  };
  return map[code] ?? code;
}
