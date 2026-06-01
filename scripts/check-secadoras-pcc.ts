import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

const URLS = [
  "https://www.pccomponentes.com/origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d",
  "https://www.pccomponentes.com/bosch-serie-4-wtr83200es-secadora-independiente-carga-frontal-8-kg-e-blanco",
  "https://www.pccomponentes.com/balay-3sb288be-secadora-con-bomba-de-calor-carga-frontal-8kg-e-blanca",
  "https://www.pccomponentes.com/secadora-de-bomba-de-calor-samsung-dv90dg6845lku3-9-kg-a-con-ia-wi-fi-puerta-reversible",
  "https://www.pccomponentes.com/secadora-de-bomba-de-calor-candy-cro-eh9n2te-s-9-kg-clase-d-wi-fi-y-programas-inteligentes",
  "https://www.pccomponentes.com/secadora-de-bomba-de-calor-bosch-wtr85v00es-8-kg-clase-energetica-d-autodry-y-antiarrugas",
  "https://www.pccomponentes.com/secadora-de-bomba-de-calor-sauber-serie-5-dr8025v-8-kg-clase-e-con-15-programas-e-iluminacion-de-tambor",
  "https://www.pccomponentes.com/secadora-de-condensacion-candy-cro-eh8n2te-s-8-kg-clase-d-con-bomba-de-calor-y-wifi",
  "https://www.pccomponentes.com/secadora-de-bomba-de-calor-beko-bm3t38220wb-8-kg-clase-energetica-e-aquawave",
  "https://www.pccomponentes.com/secadora-de-bomba-de-calor-candy-cro-eh9n4tbe-s-9-kg-clase-b-wi-fi-easycase-kilo-detector",
  "https://www.pccomponentes.com/secadora-de-bomba-de-calor-beko-bm3t37230w-7-kg-clase-energetica-e-aquawave",
  "https://www.pccomponentes.com/secadora-de-condensacion-balay-3sb582be-carga-frontal-8kg-d-blanca",
  "https://www.pccomponentes.com/secadora-de-condensacion-beko-bm3t39220wb-8-kg-clase-energetica-d-aquawave",
  "https://www.pccomponentes.com/secadora-bomba-de-calor-beko-bm3t48249w-8-kg-clase-energetica-c-silenciosa",
  "https://www.pccomponentes.com/haier-i-pro-series-3-hd90-a3939-secadora-bomba-de-calor-de-carga-frontal-9kg-c-blanca",
  "https://www.pccomponentes.com/infiniton-sd-dg85c-secadora-condensacion-carga-frontal-8kg-g-inox",
  "https://www.pccomponentes.com/secadora-de-bomba-de-calor-candy-gd-9n2b-s-9-kg-clase-d-con-ciclos-rapidos-y-antiarrugas",
  "https://www.pccomponentes.com/secadora-bomba-de-calor-beko-bm3t49240w-9-kg-c-aquawave-optisense-motor-prosmart-inverter",
  "https://www.pccomponentes.com/hisense-dhqe800bw2-secadora-de-bomba-de-calor-carga-frontal-8kg-d-blanca",
];

async function main() {
  const offers = await prisma.offer.findMany({
    where: {
      store: { contains: "pccomponentes", mode: "insensitive" },
      externalUrl: { in: URLS },
    },
    include: { product: { select: { name: true, image: true } } },
    orderBy: { priceCurrent: "asc" },
  });

  console.log(`\n✅ ${offers.length}/${URLS.length} URLs encontradas en BD con oferta PcC:\n`);
  for (const o of offers) {
    const hasImg = !!o.product.image ? "🖼️" : "❌ SIN IMAGEN";
    console.log(`  ${hasImg} ${o.priceCurrent.toFixed(2)}€ — ${o.product.name.substring(0, 55)}`);
  }

  const missing = URLS.filter(u => !offers.find(o => o.externalUrl === u));
  if (missing.length) {
    console.log(`\n❌ Faltan ${missing.length} URL(s):`);
    missing.forEach(u => console.log("  " + u));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
