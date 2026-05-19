// Orvexia Repricer / Seller — módulo B2B.
// true = visible y usable (modo demo 100% funcional).
// false = pantalla de mantenimiento en todo /sellers, /dashboard/repricer,
//         tarjeta del dashboard y banda del home.
export const REPRICER_ENABLED = true;

// Visibilidad pública del módulo Repricer.
//  - false (def.): NO se promociona en la web (sin banda en la home ni
//    tarjeta en el dashboard) y las páginas llevan noindex. Sigue siendo
//    accesible escribiendo la URL directa y con login (uso privado /
//    pre-lanzamiento mientras Amazon revisa la publicación).
//  - true: visible y promocionado públicamente (lanzamiento).
// Se controla por env en Vercel: REPRICER_PUBLIC=true
export const REPRICER_PUBLIC = process.env.REPRICER_PUBLIC === "true";
