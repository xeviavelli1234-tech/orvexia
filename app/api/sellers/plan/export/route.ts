import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/sellers/plan/export
 *
 * Devuelve el plan de precios sugerido (modo manual) como CSV descargable.
 * Lee los valores previamente cacheados por /api/sellers/plan/generate.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("unauthorized", { status: 401 });
  }
  const account = await getSellerAccountByUserId(session.userId);
  if (!account) return new Response("no_account", { status: 404 });
  if (account.mode !== "manual") return new Response("not_manual_mode", { status: 400 });

  const listings = await prisma.sellerListing.findMany({
    where: { sellerAccountId: account.id },
    orderBy: [{ suggestedAt: "desc" }, { title: "asc" }],
    select: {
      sku: true,
      title: true,
      priceCurrent: true,
      priceMin: true,
      priceMax: true,
      currency: true,
      suggestedPrice: true,
      suggestedAt: true,
      suggestedConfidence: true,
      suggestedStrategy: true,
      suggestedReason: true,
    },
  });

  const rows = [
    [
      "sku",
      "title",
      "currency",
      "price_current",
      "price_min",
      "price_max",
      "price_suggested",
      "delta_pct",
      "confidence",
      "strategy",
      "reason",
      "generated_at",
    ],
  ];
  for (const l of listings) {
    const sug = l.suggestedPrice ?? null;
    const delta =
      sug != null && l.priceCurrent > 0
        ? ((sug - l.priceCurrent) / l.priceCurrent) * 100
        : null;
    rows.push([
      l.sku,
      l.title,
      l.currency,
      fmt(l.priceCurrent),
      l.priceMin == null ? "" : fmt(l.priceMin),
      l.priceMax == null ? "" : fmt(l.priceMax),
      sug == null ? "" : fmt(sug),
      delta == null ? "" : delta.toFixed(2),
      l.suggestedConfidence == null ? "" : Math.round(l.suggestedConfidence).toString(),
      l.suggestedStrategy ?? "",
      l.suggestedReason ?? "",
      l.suggestedAt?.toISOString() ?? "",
    ]);
  }

  const csv = rows.map((cells) => cells.map(csvCell).join(",")).join("\n") + "\n";
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orvexia-plan-precios-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/** Escape a CSV cell (RFC 4180 minimal). */
function csvCell(v: string): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
