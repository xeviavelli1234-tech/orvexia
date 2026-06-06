import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeDatabaseUrl } from "@/lib/db-url";

const SCHEMA_VERSION = "v7-stripe-fields";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion: string | undefined;
};

function createPrismaClient() {
  // verify-full explícito (ver lib/db-url.ts): mismo comportamiento que hoy,
  // sin depender del default que pg v9 va a debilitar, y sin el SECURITY WARNING.
  const adapter = new PrismaPg(normalizeDatabaseUrl(process.env.DATABASE_URL)!);
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
