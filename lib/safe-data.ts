import { captureException } from "@/lib/monitoring";

/**
 * Ejecuta una lectura de datos y, si falla (p.ej. la BD no responde por cuota
 * agotada o un corte), registra el error y devuelve `fallback` en lugar de
 * propagar la excepción. Permite que las páginas degraden con elegancia
 * —renderizan su shell con estado vacío— en vez de reventar contra el error
 * boundary global y mostrar "Algo no ha ido bien".
 *
 * Úsalo SOLO para lecturas donde un resultado vacío es un estado aceptable. No
 * lo uses para mutaciones, ni donde el vacío deba traducirse en un 404 real
 * (en ese caso deja que la página decida con notFound()).
 *
 * @param fn       La consulta a ejecutar.
 * @param fallback Valor a devolver si `fn` lanza.
 * @param source   Etiqueta para correlacionar el error en logs/monitorización.
 */
export async function safeData<T>(
  fn: () => Promise<T>,
  fallback: T,
  source: string,
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    // Degradación MANEJADA, no un crash: se registra como warning para no
    // tratarse como error fatal en consola ni en el overlay de dev de Next.
    void captureException(e, { tags: { source }, level: "warning" });
    return fallback;
  }
}
