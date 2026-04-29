export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuyersGuide from "@/components/BuyersGuide";
import { getGuideBySlug } from "@/lib/guides/config";
import { getCategoryPicks } from "@/lib/guides/picks";

const config = getGuideBySlug("cafetera");

export const metadata: Metadata = {
  title: "Mejor Cafetera 2026: espresso, cápsulas y ganadores reales | Orvexia",
  description: "Cafeteras 2026 con precios actualizados y ganadores recalculados en cada visita. Espresso, cápsulas y superautomáticas: la que sirve café como en cafetería.",
  keywords: config?.keywords,
  alternates: { canonical: "/guias/mejor-cafetera" },
  openGraph: {
    title: "Mejor Cafetera 2026: comparativa real y ganadores",
    description: "Espresso, cápsulas o superautomática. Comparativa con precios actualizados y ganadores recalculados en cada visita.",
    type: "article",
  },
};

export default async function Page() {
  if (!config) notFound();
  const picks = await getCategoryPicks(config.category);
  return <BuyersGuide config={config} picks={picks} />;
}
