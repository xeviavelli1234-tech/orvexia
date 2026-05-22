/**
 * import-awin-feed.ts
 * Sincroniza precios, descuento y stock de las ofertas afiliadas a Awin
 * (típicamente El Corte Inglés y Fnac) descargando los datafeeds oficiales.
 *
 * Toda la lógica vive en `lib/import/awin.ts`; este fichero es sólo un
 * wrapper CLI para uso manual / debugging local. En producción el cron
 * `/api/cron/import-awin-feed` reusa el mismo módulo.
 *
 * Variables de entorno requeridas:
 *   - DATABASE_URL              → conexión a Postgres
 *   - AWIN_FEED_URL_ECI         → URL completa del feed de ECI (con apikey)
 *   - AWIN_FEED_URL_FNAC        → URL completa del feed de Fnac (opcional)
 *   - AWIN_FEED_URL_LG          → URL completa del feed de LG España (opcional)
 *
 * Uso:
 *   npx tsx scripts/import-awin-feed.ts          # actualiza todas las tiendas con URL definida
 *   npx tsx scripts/import-awin-feed.ts eci      # solo ECI
 *   npx tsx scripts/import-awin-feed.ts fnac     # solo Fnac
 *   npx tsx scripts/import-awin-feed.ts lg       # solo LG
 *   npx tsx scripts/import-awin-feed.ts --dry-run
 */
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL");
  process.exit(0);
}

// Importamos después de cargar el env para que el singleton de Prisma
// lo lea con todas las variables ya disponibles.
import { prisma } from "../lib/prisma";
import { getFeeds, importStore, resolveFeed } from "../lib/import/awin";

const DRY_RUN = process.argv.includes("--dry-run");
const STORE_FILTER = process.argv.slice(2).find((a) => !a.startsWith("--"))?.toLowerCase();

async function main() {
  const feeds = STORE_FILTER
    ? [resolveFeed(STORE_FILTER)].filter((f): f is NonNullable<typeof f> => f !== null)
    : getFeeds();

  if (STORE_FILTER && feeds.length === 0) {
    console.log(`⚠️  Tienda "${STORE_FILTER}" no reconocida`);
    process.exit(1);
  }

  for (const cfg of feeds) {
    await importStore(cfg, { dryRun: DRY_RUN, log: (m) => console.log(m) });
  }
  console.log("\n✅ Sincronización terminada");
}

main()
  .catch((e) => { console.error("❌ fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
