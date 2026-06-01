// Gemelo CommonJS de lib/db-url.ts para los scripts .cjs (que se ejecutan con
// `node`, no con tsx, y no pueden importar el módulo TS). Mantener ambos en
// sincronía. Ver lib/db-url.ts para la explicación completa del porqué.
//
// Fija el modo SSL a `verify-full` para conservar el comportamiento seguro
// actual y silenciar el warning de pg/pg-connection-string. Las URLs sin
// `sslmode` (p. ej. localhost) o vacías quedan intactas.
function normalizeDatabaseUrl(url) {
  if (!url) return url;
  return url.replace(
    /([?&]sslmode=)(?:prefer|require|verify-ca)(?=&|$)/i,
    "$1verify-full",
  );
}

module.exports = { normalizeDatabaseUrl };
