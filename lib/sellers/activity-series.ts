/**
 * Serie diaria de actividad del repricer para el dashboard "Resumen".
 *
 * Vive en lib (no en el componente) para que el cálculo dependiente de la hora
 * actual no se considere impuro dentro del render de un Server/Client Component.
 */

export interface ActivitySeriesPoint {
  /** Etiqueta corta del día, p.ej. "22/6". */
  key: string;
  changes: number;
  errors: number;
  events: number;
}

export interface ActivityEventLike {
  createdAt: Date;
  success: boolean;
  priceBefore: number;
  priceAfter: number;
}

/** Reparte los eventos en buckets diarios de los últimos `days` días. */
export function buildActivitySeries(
  events: ActivityEventLike[],
  days = 14,
): ActivitySeriesPoint[] {
  const DAY_MS = 86_400_000;
  const nowMs = Date.now();
  const series: ActivitySeriesPoint[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(nowMs - (days - 1 - i) * DAY_MS);
    return {
      key: `${d.getDate()}/${d.getMonth() + 1}`,
      changes: 0,
      errors: 0,
      events: 0,
    };
  });
  for (const e of events) {
    const idx = days - 1 - Math.floor((nowMs - e.createdAt.getTime()) / DAY_MS);
    if (idx < 0 || idx >= days) continue;
    series[idx].events++;
    if (!e.success) series[idx].errors++;
    else if (Math.abs(e.priceAfter - e.priceBefore) > 0.0001) series[idx].changes++;
  }
  return series;
}
