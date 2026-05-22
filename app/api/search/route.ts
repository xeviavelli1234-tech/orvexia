import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/search";

/**
 * GET /api/search?q=<query>
 *
 * Autocompletar del header / hero. Devuelve hasta 6 productos ordenados
 * por relevancia (ver `lib/search/index.ts`: sinónimos, sin tildes,
 * correcciones de marca, scoring por relevancia).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const hits = await searchProducts(q, { limit: 6 });

  return NextResponse.json({
    results: hits.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      image: p.image ?? p.images[0] ?? null,
      offers: p.offers.slice(0, 1).map((o) => ({
        priceCurrent: o.priceCurrent,
        discountPercent: o.discountPercent,
      })),
    })),
  });
}
