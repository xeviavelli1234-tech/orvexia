import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SCHEMA_VERSION = "v7-stripe-fields";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion: string | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

// Force-recreate the client if the schema changed since last hot reload
if (globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION) {
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}

export const prisma =
  globalForPrisma.prisma ??
  (globalForPrisma.prisma = createPrismaClient());
