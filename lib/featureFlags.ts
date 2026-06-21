// Orvexia Repricer / Seller — módulo B2B.
// true = visible y usable (modo demo 100% funcional).
// false = pantalla de mantenimiento en todo /sellers, /dashboard/repricer,
//         tarjeta del dashboard y banda del home.
export const REPRICER_ENABLED = true;

// Visibilidad pública del módulo Repricer.
//  - true (def.): visible y promocionado públicamente (banda en la home y
//    tarjeta en el dashboard) e indexable por buscadores. El modo manual/CSV
//    es autoservicio completo; la conexión OAuth de Amazon va gateada aparte
//    por SP_API_APP_PUBLISHED (este flag NO la activa).
//  - false: NO se promociona (sin banda en la home ni tarjeta en el dashboard)
//    y las páginas llevan noindex. Sigue accesible por URL directa con login.
// Kill-switch por env en Vercel: REPRICER_PUBLIC=false (+ redeploy) lo oculta.
export const REPRICER_PUBLIC = process.env.REPRICER_PUBLIC !== "false";
