export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuyersGuide from "@/components/BuyersGuide";
import { getGuideBySlug } from "@/lib/guides/config";
import { getCategoryPicks } from "@/lib/guides/picks";

const config = getGuideBySlug("secadora");

export const metadata: Metadata = {
  title: "Mejor Secadora 2026: bomba de calor con precios reales | Orvexia",
  description: "Secadoras 2026 con precios actualizados y ganadores recalculados en cada visita. Bomba de calor, capacidad y consumo: las que ahorran de verdad.",
  keywords: config?.keywords,
  alternates: { canonical: "/guias/mejor-secadora" },
  openGraph: {
    title: "Mejor Secadora 2026: bomba de calor y ganadores reales",
    description: "Secadoras de bomba de calor con precios actualizados y ganadores recalculados en cada visita.",
    type: "article",
  },
};

export default async function Page() {
  if (!config) notFound();
  const picks = await getCategoryPicks(config.category);
  return <BuyersGuide config={config} picks={picks} />;
}
