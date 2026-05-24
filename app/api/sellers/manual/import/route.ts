import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { prisma } from "@/lib/prisma";
import { parseManualCatalogCsv, buildSampleCatalogCsv } from "@/lib/sellers/manualImport";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 10_000;

/**
 * GET /api/sellers/manual/import
 *
 * Devuelve una plantilla CSV de ejemplo. Funciona aunque la cuenta aún no esté
 * en modo manual (es informativo). No requiere sesión: la plantilla es pública.
 */
export async function GET() {
  return new Response(buildSampleCatalogCsv(), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="orvexia-catalogo-plantilla.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/**
 * POST /api/sellers/manual/import
 *
 * Sube un catálogo en CSV para un vendedor en modo manual. Crea o actualiza
 * SellerListing por (cuenta, sku). Las filas inválidas se ignoran y se
 * devuelven en la respuesta para que el cliente las muestre.
 *
 * Aceptamos dos formatos de entrada:
 *  - multipart/form-data con un campo "file"
 *  - text/csv o text/plain con el body directamente
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const account = await getSellerAccountByUserId(session.userId);
  if (!account) return NextResponse.json({ error: "no_account" }, { status: 404 });
  if (account.mode !== "manual") {
    return NextResponse.json({ error: "not_manual_mode" }, { status: 400 });
  }

  // ── Leer CSV de la request (multipart o plano) ────────────────────────
  let csvText = "";
  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  try {
    if (ct.startsWith("multipart/form-data")) {
      const fd = await req.formData();
      const file = fd.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "missing_file" }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "file_too_large", max: MAX_BYTES }, { status: 413 });
      }
      csvText = await file.text();
    } else {
      const raw = await req.text();
      if (raw.length > MAX_BYTES) {
        return NextResponse.json({ error: "file_too_large", max: MAX_BYTES }, { status: 413 });
      }
      csvText = raw;
    }
  } catch (e) {
    console.error("[manual/import] read body failed:", e);
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  const parsed = parseManualCatalogCsv(csvText);
  if (parsed.rows.length === 0) {
    return NextResponse.json(
      {
        error: "no_valid_rows",
        errors: parsed.errors.slice(0, 50),
      },
      { status: 422 },
    );
  }
  if (parsed.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: "too_many_rows", max: MAX_ROWS }, { status: 413 });
  }

  // ── Upsert por (sellerAccountId, sku) ────────────────────────────────
  let inserted = 0;
  let updated = 0;
  for (const row of parsed.rows) {
    const existing = await prisma.sellerListing.findUnique({
      where: { sellerAccountId_sku: { sellerAccountId: account.id, sku: row.sku } },
      select: { id: true },
    });
    if (existing) {
      await prisma.sellerListing.update({
        where: { id: existing.id },
        data: {
          title: row.title,
          imageUrl: row.imageUrl,
          priceCurrent: row.priceCurrent,
          priceMin: row.priceMin ?? null,
          priceMax: row.priceMax ?? null,
          cost: row.cost ?? null,
          currency: row.currency,
          source: "manual",
        },
      });
      updated++;
    } else {
      await prisma.sellerListing.create({
        data: {
          sellerAccountId: account.id,
          asin: "", // no aplica en modo manual
          sku: row.sku,
          title: row.title,
          imageUrl: row.imageUrl,
          priceCurrent: row.priceCurrent,
          priceMin: row.priceMin ?? null,
          priceMax: row.priceMax ?? null,
          cost: row.cost ?? null,
          currency: row.currency,
          source: "manual",
          repricingEnabled: false,
        },
      });
      inserted++;
    }
  }

  await prisma.sellerAccount.update({
    where: { id: account.id },
    data: { lastSyncAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    inserted,
    updated,
    skipped: parsed.errors.length,
    errors: parsed.errors.slice(0, 50),
    total: inserted + updated,
  });
}
