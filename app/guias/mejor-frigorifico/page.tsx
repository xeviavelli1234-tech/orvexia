export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuyersGuide from "@/components/BuyersGuide";
import { getGuideBySlug } from "@/lib/guides/config";
import { getCategoryPicks } from "@/lib/guides/picks";

const config = getGuideBySlug("frigorifico");

export const metadata: Metadata = {
  title: "Mejor Frigorífico 2026: comparativa y ganadores reales | Orvexia",
  description: "Comparamos los mejores frigoríficos de 2026 con precios reales, valoraciones de compradores y ganadores que se recalculan en cada visita. Combi, americano, No Frost.",
  keywords: config?.keywords,
  alternates: { canonical: "/guias/mejor-frigorifico" },
  openGraph: {
    title: "Mejor Frigorífico 2026: comparativa real y ganadores",
    description: "Combi, americano, No Frost: comparativa con precios actualizados y ganadores recalculados en cada visita.",
    type: "article",
  },
};

export default async function Page() {
  if (!config) notFound();
  const picks = await getCategoryPicks(config.category);
  return <BuyersGuide config={config} picks={picks} />;
}
