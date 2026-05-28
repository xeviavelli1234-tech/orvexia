import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const SLUG = "origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d";

const images = [
  "https://thumb.pccomponentes.com/w-530-530/articles/1089/10893967/1239-origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d.jpg",
  "https://thumb.pccomponentes.com/w-530-530/articles/1089/10893967/2991-origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d-foto.jpg",
  "https://thumb.pccomponentes.com/w-530-530/articles/1089/10893967/3317-origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d-982ed216-bb79-4f85-a737-3bc307875fcb.jpg",
  "https://thumb.pccomponentes.com/w-530-530/articles/1089/10893967/429-origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d-11d51464-017f-4175-8615-99eb80bb0001.jpg",
  "https://thumb.pccomponentes.com/w-530-530/articles/1089/10893967/5343-origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d-1a520990-c666-49a3-b622-473c58c6cf0c.jpg",
  "https://thumb.pccomponentes.com/w-530-530/articles/1089/10893967/6859-origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d-d9f20bca-afe3-41e9-bdb5-ed9eec9ee8ae.jpg",
  "https://thumb.pccomponentes.com/w-530-530/articles/1089/10893967/7163-origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d-9747a156-a3e7-4106-b9f9-094823318826.jpg",
  "https://thumb.pccomponentes.com/w-530-530/articles/1089/10893967/8335-origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d-80a59632-3ce6-4203-9dca-33850bcb7af2.jpg",
  "https://thumb.pccomponentes.com/w-530-530/articles/1089/10893967/9968-origial-drycare-oridry8awd-8-kg-carga-frontal-secadora-con-bomba-de-calor-8-kg-d-5faaae54-e511-4515-8716-f08f065185bf.jpg",
];

async function main() {
  const updated = await prisma.product.update({
    where: { slug: SLUG },
    data: { image: images[0], images },
  });
  console.log(`✅ ${updated.name}`);
  console.log(`   image: ${updated.image}`);
  console.log(`   images: ${(updated.images as string[]).length} URLs guardadas`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
