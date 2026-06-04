/**
 * Resolución del secreto que firma y verifica los JWT de sesión.
 *
 * FAIL-CLOSED en producción: si `AUTH_SECRET` no está configurado, abortamos.
 * Firmar (o verificar) un JWT con un secreto público permitiría a cualquiera
 * forjar sesiones con un userId arbitrario y suplantar usuarios. En dev/test
 * usamos un valor fijo para no bloquear el trabajo local.
 *
 * Lazy + memoizado: se evalúa al usarse (no al importar el módulo), para que
 * `next build` —que recolecta módulos con NODE_ENV=production— no falle si la
 * variable solo existe en runtime.
 *
 * Vive en su propio módulo (sin `next/headers` ni `jose`) para poder importarse
 * también desde el middleware (`proxy.ts`) sin arrastrar dependencias de
 * servidor al bundle del runtime de edge.
 */
let cachedSecret: Uint8Array | null = null;

export function getSessionSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET no está configurado en producción. Aborta: firmar JWT con un secreto por defecto es inseguro.",
    );
  }
  cachedSecret = new TextEncoder().encode(
    s ?? "dev-only-insecure-secret-do-not-use-in-production",
  );
  return cachedSecret;
}
