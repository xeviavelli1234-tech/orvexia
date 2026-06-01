import { PrismaClient } from "../app/generated/prisma/client";
import { getDatabaseUrl } from "../lib/db-url";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: getDatabaseUrl() }) });

p.product.count({
  where: { category: "MICROONDAS", offers: { some: { store: { equals: "Fnac", mode: "insensitive" } } } }
}).then(c => { console.log("fnac microondas in DB:", c); return p.$disconnect(); });
