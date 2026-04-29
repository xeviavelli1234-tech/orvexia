export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuyersGuide from "@/components/BuyersGuide";
import { getGuideBySlug } from "@/lib/guides/config";
import { getCategoryPicks } from "@/lib/guides/picks";

const config = getGuideBySlug("televisor");

export const metadata: Metadata = {
  title: "Mejor Televisor 2026: comparativa real OLED, QLED y Mini-LED | Orvexia",
  description: "Comparativa de televisores 2026 con precios actualizados y ganadores recalculados en cada visita. OLED, QLED, Mini-LED, gaming y Smart TV.",
  keywords: config?.keywords,
  alternates: { canonical: "/guias/mejor-televisor" },
  openGraph: {
    title: "Mejor Televisor 2026: comparativa real y ganadores",
    description: "OLED vs QLED vs Mini-LED. Comparativa con precios reales y ganadores recalculados en cada visita.",
    type: "article",
  },
};

export default async function Page() {
  if (!config) notFound();
  const picks = await getCategoryPicks(config.category);
  return <BuyersGuide config={config} picks={picks} />;
}
