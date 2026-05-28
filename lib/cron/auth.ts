/**
 * Autorización de endpoints de cron.
 *
 * FAIL-CLOSED en producción: si `CRON_SECRET` no está configurado, NO se
 * permite la ejecución. Esto evita que, ante un despiste de configuración,
 * cualquiera pueda disparar imports masivos, envíos de email o el repricer
 * (que consume cuota real de Amazon SP-API).
 *
 * En desarrollo/test sin secret se permite, para no estorbar el trabajo local.
 *
 * Devuelve `null` si la petición está autorizada, o el código HTTP a devolver
 * (401 no autorizado / 503 sin configurar) si no lo está.
 */
export function cronAuthError(req: {
  headers: { get(name: string): string | null };
}): number | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Sin secret configurado: rechazar en producción, permitir en dev/test.
    return process.env.NODE_ENV === "production" ? 503 : null;
  }
  const provided = req.headers.get("x-cron-secret");
  const bearer = req.headers.get("authorization");
  if (provided === secret || bearer === `Bearer ${secret}`) return null;
  return 401;
}
