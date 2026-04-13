// @ts-nocheck
import * as clientModule from "../app/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = clientModule;
const adapter = new PrismaPg({ connectionString: "postgresql://postgres:4563@localhost:5432/comparacion?schema=public" });
const prisma = new PrismaClient({ adapter });

const product = await prisma.product.findFirst({
  where: { name: { contains: "Cecotec Bolero Dresscode 9610" } },
  include: { offers: true },
});

console.log(JSON.stringify(product, null, 2));
await prisma.$disconnect();
