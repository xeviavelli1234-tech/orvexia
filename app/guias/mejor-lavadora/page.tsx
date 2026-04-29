export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuyersGuide from "@/components/BuyersGuide";
import { getGuideBySlug } from "@/lib/guides/config";
import { getCategoryPicks } from "@/lib/guides/picks";

const config = getGuideBySlug("lavadora");

export const metadata: Metadata = {
  title: "Mejor Lavadora 2026: comparativa real y ganadores | Orvexia",
  description: "Lavadoras 2026 con precios actualizados y ganadores recalculados en cada visita. Inverter, capacidad, RPM y eficiencia: lo que importa de verdad.",
  keywords: config?.keywords,
  alternates: { canonical: "/guias/mejor-lavadora" },
  openGraph: {
    title: "Mejor Lavadora 2026: comparativa real y ganadores",
    description: "Comparativa con precios reales y ganadores recalculados en cada visita. Carga frontal, inverter, 8-10 kg.",
    type: "article",
  },
};

export default async function Page() {
  if (!config) notFound();
  const picks = await getCategoryPicks(config.category);
  return <BuyersGuide config={config} picks={picks} />;
}
