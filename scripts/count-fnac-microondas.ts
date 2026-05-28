import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

p.product.count({
  where: { category: "MICROONDAS", offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } } }
}).then(c => { console.log("fnac microondas in DB:", c); return p.$disconnect(); });
