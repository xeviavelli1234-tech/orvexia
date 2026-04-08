import { NextRequest, NextResponse } from "next/server";
import { getBuySignal } from "@/lib/buySignal";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const productId = searchParams.get("productId");
  const store     = searchParams.get("store");

  if (!productId || !store) {
    return NextResponse.json({ error: "productId y store son requeridos" }, { status: 400 });
  }

  try {
    const signal = await getBuySignal(productId, store);
    if (!signal) {
      return NextResponse.json({ error: "Producto u oferta no encontrada" }, { status: 404 });
    }
    return NextResponse.json(signal);
  } catch (err) {
    console.error("[buy-signal]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
