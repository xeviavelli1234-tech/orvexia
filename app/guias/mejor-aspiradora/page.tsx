export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuyersGuide from "@/components/BuyersGuide";
import { getGuideBySlug } from "@/lib/guides/config";
import { getCategoryPicks } from "@/lib/guides/picks";

const config = getGuideBySlug("aspiradora");

export const metadata: Metadata = {
  title: "Mejor Aspiradora 2026: robot, escoba y ganadores reales | Orvexia",
  description: "Aspiradoras 2026 con precios actualizados y ganadores recalculados en cada visita. Robot, escoba sin cable o trineo: la que mejor encaja en tu casa.",
  keywords: config?.keywords,
  alternates: { canonical: "/guias/mejor-aspiradora" },
  openGraph: {
    title: "Mejor Aspiradora 2026: robot, escoba y ganadores",
    description: "Robot vs escoba sin cable. Comparativa con precios actualizados y ganadores recalculados en cada visita.",
    type: "article",
  },
};

export default async function Page() {
  if (!config) notFound();
  const picks = await getCategoryPicks(config.category);
  return <BuyersGuide config={config} picks={picks} />;
}
