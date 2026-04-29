export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuyersGuide from "@/components/BuyersGuide";
import { getGuideBySlug } from "@/lib/guides/config";
import { getCategoryPicks } from "@/lib/guides/picks";

const config = getGuideBySlug("microondas");

export const metadata: Metadata = {
  title: "Mejor Microondas 2026: grill, convección y ganadores reales | Orvexia",
  description: "Microondas 2026 con precios actualizados y ganadores recalculados en cada visita. Solo micro, grill o convección: la mejor opción según tu uso.",
  keywords: config?.keywords,
  alternates: { canonical: "/guias/mejor-microondas" },
  openGraph: {
    title: "Mejor Microondas 2026: comparativa real y ganadores",
    description: "Solo micro, grill o convección. Comparativa con precios actualizados y ganadores recalculados en cada visita.",
    type: "article",
  },
};

export default async function Page() {
  if (!config) notFound();
  const picks = await getCategoryPicks(config.category);
  return <BuyersGuide config={config} picks={picks} />;
}
