/**
 * Decide el HTTP status del cron `check-discounts` según el resultado.
 *
 * Reglas:
 *   - 500 si había trabajo elegible pero no se envió NADA → cron fallido,
 *     Vercel/monitoring lo verá rojo.
 *   - 207 (Multi-Status) si hay envíos pero también errores → parcial.
 *   - 200 si todo OK o no había nada que hacer (eligible = 0).
 *
 * @param eligible Número de candidatos que debían recibir un email.
 * @param sent     Número de emails efectivamente enviados.
 * @param errorCount Número de errores acumulados en el ciclo.
 */
export function decideCronStatus(eligible: number, sent: number, errorCount: number): number {
  if (eligible > 0 && sent === 0) return 500;
  if (errorCount > 0) return 207;
  return 200;
}
