/**
 * GET /api/cron/import-awin-feed?store=<fnac|eci|lg>
 *
 * Sincroniza los feeds Awin con la BD. Reusa toda la lógica de
 * `lib/import/awin.ts` que también usa el CLI `scripts/import-awin-feed.ts`.
 *
 * Si no se pasa `store`, recorre los 3 feeds que tengan URL configurada.
 *
 * En vercel.json se programa una entrada por tienda con horarios escalonados
 * para repartir carga.
 *
 * Protegido con `x-cron-secret = CRON_SECRET`. Sin secret configurado, se
 * puede llamar libremente (cómodo para depurar en local).
 */
import { NextRequest, NextResponse } from "next/server";
import { getFeeds, importStore, resolveFeed, type ImportStats } from "@/lib/import/awin";

export const dynamic = "force-dynamic";
// Importar un feed grande (Fnac/ECI) ronda los 30-90s. Pedimos hasta 5
// minutos para tener margen y poder procesar el feed completo.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  const storeParam = searchParams.get("store")?.toLowerCase().trim();

  const feeds = storeParam
    ? [resolveFeed(storeParam)].filter((f): f is NonNullable<typeof f> => f !== null)
    : getFeeds();

  if (storeParam && feeds.length === 0) {
    return NextResponse.json(
      { error: `Tienda '${storeParam}' no reconocida (usa fnac, eci o lg)` },
      { status: 400 }
    );
  }

  const startedAt = Date.now();
  const results: ImportStats[] = [];

  for (const cfg of feeds) {
    try {
      const stats = await importStore(cfg, { log: (m) => console.log(m) });
      results.push(stats);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[cron import-awin] ${cfg.storeName} falló:`, msg);
      results.push({
        store: cfg.storeName,
        skipped: `fatal: ${msg}`,
        rowsRead: 0, matched: 0, updated: 0, unchanged: 0,
        priceChanged: 0, stockChanged: 0, imagesUpdated: 0, markedOutOfStock: 0, errors: 1,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    results,
  });
}
