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
//
// El Repricer ya está lanzado públicamente (landing /repricer, prueba gratis y
// banner de captación), así que su visibilidad SEO debe estar SIEMPRE activa:
// dejamos el flag fijado en true para que ni un REPRICER_PUBLIC=false heredado
// en Vercel pueda volver a meter `noindex` ni quitar los enlaces internos
// (home/dashboard) que dan descubribilidad a la landing en buscadores.
export const REPRICER_PUBLIC = true;
