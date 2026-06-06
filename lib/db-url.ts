/**
 * Normaliza el `sslmode` de la cadena de conexión a Postgres.
 *
 * `pg` / `pg-connection-string` avisan (SECURITY WARNING) de que los modos
 * `prefer`, `require` y `verify-ca` se tratan HOY como `verify-full`, pero en
 * `pg` v9 / `pg-connection-string` v3 adoptarán la semántica de libpq, que es
 * MÁS DÉBIL (no valida la cadena de certificación ni el host). Para que una
 * futura subida de versión no nos rebaje la seguridad de la conexión sin
 * avisar, fijamos explícitamente `verify-full` cuando detectamos uno de esos
 * alias. En runtime el comportamiento es IDÉNTICO al actual; solo dejamos de
 * depender de un default que va a cambiar (y se silencia el aviso).
 *
 * La sustitución es quirúrgica: solo toca el valor de `sslmode` mediante
 * regex, sin re-serializar la URL entera, para no re-codificar usuario o
 * contraseña y romper la autenticación. Si no hay `sslmode`, o ya es
 * `verify-full`/`disable`/etc., la cadena se devuelve intacta.
 */
const ALIASED_SSL_MODES = /([?&]sslmode=)(prefer|require|verify-ca)\b/i;

export function normalizeDatabaseUrl(
  raw: string | undefined,
): string | undefined {
  if (!raw) return raw;
  return raw.replace(ALIASED_SSL_MODES, (_m, prefix: string) => `${prefix}verify-full`);
}
