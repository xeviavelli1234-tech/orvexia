/**
 * Lógica pura de filtrado para `notify-external`. Vive en archivo aparte
 * (sin `import "server-only"`) para que sea testeable con tsx --test.
 */

export type AlertCategory = "buybox_lost" | "price_floor" | "error" | "auto_pause" | "weekly";

/**
 * Flags por canal que controlan qué tipos de alerta recibe.
 * Reflejan los campos `alertX` de `NotificationChannel` en Prisma.
 */
export interface ChannelAlertFlags {
  alertBuyBoxLost: boolean;
  alertPriceFloor: boolean;
  alertError: boolean;
  alertAutoPause: boolean;
  alertWeekly: boolean;
}

/**
 * Decide si una notificación de la categoría dada debe dispatch al canal.
 *
 * Función pura: solo depende de los flags del canal y la categoría. Devuelve
 * true si el canal tiene el flag activado para esa categoría.
 */
export function shouldDispatchToChannel(channel: ChannelAlertFlags, category: AlertCategory): boolean {
  switch (category) {
    case "buybox_lost": return channel.alertBuyBoxLost;
    case "price_floor": return channel.alertPriceFloor;
    case "error":       return channel.alertError;
    case "auto_pause":  return channel.alertAutoPause;
    case "weekly":      return channel.alertWeekly;
  }
}
