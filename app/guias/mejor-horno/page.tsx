export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BuyersGuide from "@/components/BuyersGuide";
import { getGuideBySlug } from "@/lib/guides/config";
import { getCategoryPicks } from "@/lib/guides/picks";

const config = getGuideBySlug("horno");

export const metadata: Metadata = {
  title: "Mejor Horno 2026: pirolítico, vapor y ganadores reales | Orvexia",
  description: "Hornos 2026 con precios actualizados y ganadores recalculados en cada visita. Pirolítico, vapor y convección: los que cocinan mejor.",
  keywords: config?.keywords,
  alternates: { canonical: "/guias/mejor-horno" },
  openGraph: {
    title: "Mejor Horno 2026: pirolítico, vapor y ganadores reales",
    description: "Comparativa de hornos pirolíticos y con vapor con precios actualizados y ganadores recalculados en cada visita.",
    type: "article",
  },
};

export default async function Page() {
  if (!config) notFound();
  const picks = await getCategoryPicks(config.category);
  return <BuyersGuide config={config} picks={picks} />;
}
