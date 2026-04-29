export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuyersGuide from "@/components/BuyersGuide";
import { getGuideBySlug } from "@/lib/guides/config";
import { getCategoryPicks } from "@/lib/guides/picks";

const config = getGuideBySlug("lavavajillas");

export const metadata: Metadata = {
  title: "Mejor Lavavajillas 2026: comparativa con precios reales | Orvexia",
  description: "Lavavajillas 2026 con precios actualizados y ganadores recalculados en cada visita. Cubiertos, ruido, secado y consumo de agua: lo que importa.",
  keywords: config?.keywords,
  alternates: { canonical: "/guias/mejor-lavavajillas" },
  openGraph: {
    title: "Mejor Lavavajillas 2026: comparativa real y ganadores",
    description: "Comparativa con precios actualizados y ganadores recalculados en cada visita. 12-14 cubiertos, silencioso y eficiente.",
    type: "article",
  },
};

export default async function Page() {
  if (!config) notFound();
  const picks = await getCategoryPicks(config.category);
  return <BuyersGuide config={config} picks={picks} />;
}
