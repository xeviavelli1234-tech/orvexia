export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuyersGuide from "@/components/BuyersGuide";
import { getGuideBySlug } from "@/lib/guides/config";
import { getCategoryPicks } from "@/lib/guides/picks";

const config = getGuideBySlug("aire-acondicionado");

export const metadata: Metadata = {
  title: "Mejor Aire Acondicionado 2026: split inverter y ganadores reales | Orvexia",
  description: "Aires acondicionados 2026 con precios actualizados y ganadores recalculados en cada visita. Split inverter, bomba de calor y frigorías: lo que importa.",
  keywords: config?.keywords,
  alternates: { canonical: "/guias/mejor-aire-acondicionado" },
  openGraph: {
    title: "Mejor Aire Acondicionado 2026: split inverter y ganadores",
    description: "Split inverter y bomba de calor. Comparativa con precios actualizados y ganadores recalculados en cada visita.",
    type: "article",
  },
};

export default async function Page() {
  if (!config) notFound();
  const picks = await getCategoryPicks(config.category);
  return <BuyersGuide config={config} picks={picks} />;
}
