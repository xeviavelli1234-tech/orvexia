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

const CATEGORY_CONTENT: Record<string, {
  intro: string;
  tips: { icon: string; title: string; desc: string }[];
  guideSlug?: string;
}> = {
  televisores: {
    intro: "Elegir un televisor en 2026 puede ser abrumador: OLED, QLED, 4K, 8K, 120 Hz... En esta sección encontrarás los mejores modelos con precios actualizados en tiempo real. Nos centramos en la relación calidad-precio real, no en los modelos más caros.",
    tips: [
      { icon: "📐", title: "Tamaño según distancia", desc: "A 2-3 m: 55\". A 3-4 m: 65\". A más de 4 m: 75\" o más." },
      { icon: "🖥️", title: "OLED vs QLED", desc: "OLED: negros perfectos, ideal para cine. QLED: más brillo, mejor para salones iluminados." },
      { icon: "🎮", title: "Gaming: HDMI 2.1", desc: "Si usas PS5 o Xbox Series X, necesitas HDMI 2.1 para 4K a 120 fps." },
    ],
    guideSlug: "mejor-televisor",
  },
  lavadoras: {
    intro: "Las lavadoras actuales han cambiado mucho: motores Inverter, programas de 15 minutos, consumos clase A... En esta sección comparamos los mejores modelos con precios reales y actualizados para que no pagues de más.",
    tips: [
      { icon: "⚖️", title: "Capacidad por personas", desc: "1-2 personas: 7 kg. 3-4 personas: 8-9 kg. Familias grandes: 10 kg o más." },
      { icon: "🔧", title: "Motor Inverter", desc: "Más silencioso, más eficiente y con garantías de hasta 10 años. Imprescindible desde gama media." },
      { icon: "⚡", title: "Eficiencia energética", desc: "Clase A ahorra hasta 40€ al año frente a clase C. Merece el extra en precio." },
    ],
    guideSlug: "mejor-lavadora",
  },
  frigorificos: {
    intro: "Un frigorífico es una compra para 10-15 años. Elegir bien significa ahorro en electricidad, mejor conservación de alimentos y menos averías. Aquí comparamos los mejores modelos de 2026 con sus precios actualizados al momento.",
    tips: [
      { icon: "📏", title: "Mide tu hueco", desc: "Deja 2-3 cm por los laterales y 5 cm arriba para ventilación. Mide antes de comprar." },
      { icon: "❄️", title: "No Frost total", desc: "Evita el hielo en todos los compartimentos. Mucho más cómodo en el día a día." },
      { icon: "⚡", title: "Clase energética", desc: "Los frigoríficos son el electrodoméstico que más consume (24h al día). Clase D o superior marca diferencia." },
    ],
    guideSlug: "mejor-frigorifico",
  },
  lavavajillas: {
    intro: "Un buen lavavajillas lava mejor, consume menos agua que a mano y dura años sin problemas. En esta sección encontrarás los mejores modelos con precios en tiempo real, desde compactos hasta 15 cubiertos.",
    tips: [
      { icon: "🍽️", title: "Cubiertos según familia", desc: "1-2 personas: lavavajillas compacto (6 cubiertos). 3-4 personas: 12-13 cubiertos. Familias: 15 cubiertos." },
      { icon: "💧", title: "Consumo de agua", desc: "Los mejores modelos usan 6-9 litros por ciclo, menos que fregar a mano." },
      { icon: "🔇", title: "Nivel de ruido", desc: "Menos de 44 dB es silencioso. Para cocinas abiertas al salón, busca menos de 42 dB." },
    ],
    guideSlug: "mejor-lavavajillas",
  },
  secadoras: {
    intro: "Las secadoras de bomba de calor han revolucionado el mercado: consumen hasta un 50% menos que las de condensación tradicional. Compara los mejores modelos con precios actualizados y encuentra la que mejor encaja en tu hogar.",
    tips: [
      { icon: "♨️", title: "Bomba de calor siempre", desc: "Consume hasta el 50% menos que condensación y cuida mejor la ropa. El extra de precio se amortiza en 2-3 años." },
      { icon: "⚖️", title: "Capacidad", desc: "Elige la misma capacidad que tu lavadora o superior. Con 8 kg de lavadora, mínimo 8 kg de secadora." },
      { icon: "📊", title: "Clase energética", desc: "Busca clase A o B. Las secadoras se usan varios días a la semana y el consumo se nota en la factura." },
    ],
    guideSlug: "mejor-secadora",
  },
  hornos: {
    intro: "El horno es el gran olvidado de la cocina hasta que falla o uno se da cuenta de lo que se ha estado perdiendo. Los hornos actuales ofrecen cocción por aire, vapor y programas automáticos. Compara los mejores modelos con precios reales.",
    tips: [
      { icon: "🌀", title: "Aire forzado (convección)", desc: "Cocina más rápido y de forma uniforme. Imprescindible en cualquier horno moderno." },
      { icon: "💦", title: "Función vapor", desc: "El vapor conserva la jugosidad de carnes y pescados y mejora el resultado del pan casero." },
      { icon: "🧹", title: "Autolimpieza", desc: "Pirolítico (quema los restos a 500°C) o catalítico. El pirolítico es más eficaz aunque consume más energía." },
    ],
    guideSlug: "mejor-horno",
  },
  microondas: {
    intro: "El microondas ha evolucionado mucho más allá de recalentar café. Los modelos con grill y convección permiten cocinar, tostar y hornear. Compara los mejores con precios actualizados y encuentra el que encaja en tu cocina.",
    tips: [
      { icon: "📡", title: "Solo micro vs. combinado", desc: "Si solo recalientas: uno básico es suficiente. Si quieres cocinar: busca grill + convección." },
      { icon: "🔢", title: "Potencia mínima", desc: "700W para uso básico. 900-1000W si lo usas a diario o para cocinar de verdad." },
      { icon: "📏", title: "Capacidad", desc: "Para 1-2 personas: 20-23 litros. Para familias: 25-32 litros." },
    ],
    guideSlug: "mejor-microondas",
  },
  aspiradoras: {
    intro: "Aspiradoras robot, escobas sin cable, trineo con bolsa... la oferta es enorme y las diferencias de precio enormes. En esta sección comparamos los mejores modelos con precios en tiempo real para que encuentres la que mejor se adapta a tu hogar.",
    tips: [
      { icon: "🤖", title: "Robot vs. escoba", desc: "Robot: comodidad máxima, ideal para mantenimiento diario. Escoba: más potencia y control para limpieza a fondo." },
      { icon: "🔋", title: "Autonomía", desc: "Escobas: mínimo 40 min en modo normal. Robots: 90-120 min para pisos de hasta 100 m²." },
      { icon: "🐾", title: "Si tienes mascotas", desc: "Busca cepillos anti-enredo y filtros HEPA. Marca la diferencia en pelos y alérgenos." },
    ],
    guideSlug: "mejor-aspiradora",
  },
  cafeteras: {
    intro: "Espresso, cápsulas, filtro, superautomática... cada tipo de cafetera da un resultado diferente y tiene un coste por taza distinto. Aquí comparamos los mejores modelos con precios reales para que encuentres la tuya.",
    tips: [
      { icon: "☕", title: "Coste por taza", desc: "Cápsulas: 0,25-0,45€. Espresso con café molido: 0,05-0,15€. Filtro: menos de 0,05€." },
      { icon: "⚙️", title: "Superautomática", desc: "Muele, tamp y extrae sola. Más cara de entrada pero la experiencia es difícil de igualar." },
      { icon: "🔧", title: "Presión en espresso", desc: "Mínimo 15 bares para una extracción correcta. Muchos modelos básicos no llegan." },
    ],
    guideSlug: "mejor-cafetera",
  },
  aires_acondicionados: {
    intro: "Con los veranos cada vez más calurosos, el aire acondicionado ha pasado de lujo a necesidad. Una bomba de calor además calienta en invierno con una eficiencia imposible para otros sistemas. Compara los mejores modelos con precios reales.",
    tips: [
      { icon: "📐", title: "Frigorías por m²", desc: "Multiplica los m² por 100 para obtener las frigorías necesarias. Con mucho sol, añade un 20% más." },
      { icon: "🔄", title: "Inverter siempre", desc: "Regula la velocidad en lugar de encenderse y apagarse. Hasta un 35% menos de consumo." },
      { icon: "🌡️", title: "Bomba de calor", desc: "Calienta produciendo 3-5 veces más energía de la que consume. Mucho más eficiente que cualquier radiador." },
    ],
    guideSlug: "mejor-aire-acondicionado",
  },
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
      inStock: o.inStock,
    })),
  }));

  const content = CATEGORY_CONTENT[slug.toLowerCase()] ?? null;

  return <CategoryClient products={serialized} meta={meta} content={content} />;
}
