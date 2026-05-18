/**
 * Ventana horaria de reprecio — FUNCIÓN PURA, testeable.
 * Las horas se interpretan en Europe/Madrid. endHour es exclusivo
 * (24 = fin de día). Soporta franjas que cruzan medianoche.
 */

export function hourInMadrid(now: Date): number {
  const s = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  // "24" puede aparecer en algunos entornos para medianoche
  const h = parseInt(s, 10) % 24;
  return Number.isFinite(h) ? h : 0;
}

export function isWithinSchedule(
  hour: number,
  startHour: number,
  endHour: number,
): boolean {
  const h = ((hour % 24) + 24) % 24;
  const start = Math.max(0, Math.min(23, startHour));
  const end = Math.max(1, Math.min(24, endHour));

  // 0–24 (o start==end) → siempre activo
  if (start === 0 && end >= 24) return true;
  if (start === end) return true;

  if (start < end) {
    // franja normal: [start, end)
    return h >= start && h < end;
  }
  // franja nocturna que cruza medianoche: [start, 24) ∪ [0, end)
  return h >= start || h < end;
}

/** ¿Debe ejecutarse el ciclo ahora según la programación de la cuenta? */
export function isScheduleAllowed(
  scheduleEnabled: boolean,
  startHour: number,
  endHour: number,
  now: Date = new Date(),
): boolean {
  if (!scheduleEnabled) return true;
  return isWithinSchedule(hourInMadrid(now), startHour, endHour);
}
