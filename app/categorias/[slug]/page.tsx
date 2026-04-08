import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Category } from "@/app/generated/prisma/client";
import CategoryClient from "./CategoryClient";

const CATEGORY_META: Record<string, {
  key: Category; label: string; icon: string;
  color: string; bg: string; gradient: string; desc: string;
}> = {
  televisores:          { key: "TELEVISORES",          label: "Televisores",          icon: "📺", color: "#2563EB", bg: "#EFF6FF", gradient: "from-[#1E40AF] to-[#2563EB]", desc: "Smart TV, QLED, OLED, 4K y más" },
  lavadoras:            { key: "LAVADORAS",             label: "Lavadoras",            icon: "🫧", color: "#7C3AED", bg: "#F5F3FF", gradient: "from-[#6D28D9] to-[#7C3AED]", desc: "Carga frontal, superior y secadora-lavadora" },
  frigorificos:         { key: "FRIGORIFICOS",          label: "Frigoríficos",         icon: "🧊", color: "#0891B2", bg: "#ECFEFF", gradient: "from-[#0E7490] to-[#0891B2]", desc: "Combi, americano, bajo encimera" },
  lavavajillas:         { key: "LAVAVAJILLAS",          label: "Lavavajillas",         icon: "🍽️", color: "#059669", bg: "#ECFDF5", gradient: "from-[#047857] to-[#059669]", desc: "Integrado, libre instalación y compacto" },
  secadoras:            { key: "SECADORAS",             label: "Secadoras",            icon: "💨", color: "#D97706", bg: "#FFFBEB", gradient: "from-[#B45309] to-[#D97706]", desc: "Bomba de calor y condensación" },
  hornos:               { key: "HORNOS",                label: "Hornos",               icon: "🔥", color: "#DC2626", bg: "#FEF2F2", gradient: "from-[#B91C1C] to-[#DC2626]", desc: "Integrable, sobremesa y microondas-horno" },
  microondas:           { key: "MICROONDAS",            label: "Microondas",           icon: "📡", color: "#9333EA", bg: "#FAF5FF", gradient: "from-[#7E22CE] to-[#9333EA]", desc: "Grill, convección y libre instalación" },
  aspiradoras:          { key: "ASPIRADORAS",           label: "Aspiradoras",          icon: "🌀", color: "#0369A1", bg: "#F0F9FF", gradient: "from-[#075985] to-[#0369A1]", desc: "Robot, sin cable y con bolsa" },
  cafeteras:            { key: "CAFETERAS",             label: "Cafeteras",            icon: "☕", color: "#92400E", bg: "#FEF3C7", gradient: "from-[#78350F] to-[#92400E]", desc: "Espresso, cápsulas y de goteo" },
  aires_acondicionados: { key: "AIRES_ACONDICIONADOS",  label: "Aire acondicionado",   icon: "❄️", color: "#0284C7", bg: "#F0F9FF", gradient: "from-[#075985] to-[#0284C7]", desc: "Split, portátil y multisplit" },
};

async function getProducts(category: Category) {
  return prisma.product.findMany({
    where: { category },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = CATEGORY_META[slug.toLowerCase()];
  if (!meta) notFound();

  const products = await getProducts(meta.key);

  const serialized = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category as string,
    description: p.description,
    image: p.image,
    images: p.images as string[],
    rating: p.rating,
    reviewCount: p.reviewCount,
    offers: p.offers.map((o) => ({
      store: o.store,
      priceCurrent: o.priceCurrent,
      priceOld: o.priceOld,
      discountPercent: o.discountPercent,
      externalUrl: o.externalUrl,
    })),
  }));

  return <CategoryClient products={serialized} meta={meta} />;
}
