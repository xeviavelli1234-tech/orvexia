/**
 * Normaliza la connection string de Postgres fijando el modo SSL.
 *
 * `pg` / `pg-connection-string` avisan que en la próxima major (pg v9 /
 * pg-connection-string v3) los modos `prefer`, `require` y `verify-ca`
 * dejarán de ser alias de `verify-full` y pasarán a la semántica de libpq,
 * que es más débil (cifra pero no verifica el certificado del servidor).
 *
 * Hoy esos modos ya verifican el certificado completo, así que reescribimos
 * a `verify-full` explícito: mantiene exactamente el comportamiento actual,
 * lo deja a prueba del cambio de la próxima major y silencia el warning.
 *
 * Si la URL no trae `sslmode` (p. ej. localhost sin TLS) no se toca, para no
 * romper conexiones locales que no usan SSL.
 */
export function normalizeDatabaseUrl(url: string): string {
  return url.replace(
    /([?&]sslmode=)(?:prefer|require|verify-ca)(?=&|$)/i,
    "$1verify-full",
  );
}

/**
 * Devuelve la `DATABASE_URL` ya normalizada. Lanza un error claro si falta,
 * en lugar de propagar un fallo críptico desde el driver.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está definida");
  }
  return normalizeDatabaseUrl(url);
}
