/**
 * Valida un parámetro `next` de redirección post-login.
 *
 * Solo acepta rutas relativas del mismo origen. Rechaza URLs absolutas
 * ("https://evil.com"), protocol-relative ("//evil.com") y "/\" para evitar
 * ataques de open-redirect. Devuelve la ruta si es segura, o null.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.startsWith("/\\")) return null;
  return raw;
}
