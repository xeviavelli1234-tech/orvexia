import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import {
  parseCsv,
  groupProductsFromRows,
  generateTemplate,
} from "@/lib/catalog/csv-import";
import { applyCsvProducts } from "@/lib/catalog/csv-apply";
import { revalidatePath } from "next/cache";

export const maxDuration = 60;

/**
 * GET /api/admin/catalog/import
 * Devuelve la plantilla CSV vacía.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = await isAdminUser(session.userId);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return new Response(generateTemplate(), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="orvexia-catalogo-plantilla.csv"',
    },
  });
}

/**
 * POST /api/admin/catalog/import
 * Body: texto CSV directo (content-type text/csv o text/plain).
 * Devuelve resumen del import + errores por fila.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = await isAdminUser(session.userId);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Aceptamos texto plano o un campo "csv" en JSON; lo más simple es leer texto.
  let csv = "";
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const b = await req.json();
      csv = typeof b?.csv === "string" ? b.csv : "";
    } else {
      csv = await req.text();
    }
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!csv.trim()) {
    return NextResponse.json({ error: "empty_csv" }, { status: 400 });
  }
  if (csv.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "too_large", max: "5MB" }, { status: 413 });
  }

  const parse = parseCsv(csv);
  if (parse.errors.length > 0 && parse.rows.length === 0) {
    return NextResponse.json({
      ok: false,
      stage: "parse",
      errors: parse.errors.slice(0, 50),
      totalLines: parse.totalLines,
    });
  }

  const grouped = groupProductsFromRows(parse.rows);
  const apply = await applyCsvProducts(grouped);

  revalidatePath("/categorias");
  revalidatePath("/ofertas-destacadas");
  revalidatePath("/bajadas-recientes");

  return NextResponse.json({
    ok: true,
    parsed: {
      totalLines: parse.totalLines,
      validRows: parse.rows.length,
      errors: parse.errors.slice(0, 50),
      errorCount: parse.errors.length,
    },
    products: grouped.length,
    apply,
  });
}
