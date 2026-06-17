/**
 * Serializa datos a JSON seguro para incrustar en
 * <script type="application/ld+json" dangerouslySetInnerHTML=...>.
 *
 * JSON.stringify NO escapa `<`, `>`, `&` ni los separadores de línea
 * U+2028/U+2029, así que un valor de catálogo de un feed externo que contenga
 * `</script>` cerraría el bloque y ejecutaría JS arbitrario (XSS almacenado).
 * Escapamos esos caracteres a su forma `\uXXXX` (sigue siendo JSON válido).
 */
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), "g");
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), "g");

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LINE_SEP, "\\u2028")
    .replace(PARA_SEP, "\\u2029");
}
