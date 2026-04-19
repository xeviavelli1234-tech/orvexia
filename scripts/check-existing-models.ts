import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
async function main() {
  const models = ["55PUS8400", "55UD8004SWOS", "32FD7004SWOS", "TQ55Q7FAAUXXC", "55PUS7000"];
  const found = await prisma.product.findMany({ where: { model: { in: models } }, select: { model: true, slug: true, name: true } });
  console.log(JSON.stringify(found, null, 2));
}
main().finally(() => prisma.$disconnect());
