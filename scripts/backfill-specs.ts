/**
 * backfill-specs.ts
 *
 * Recorre TODOS los productos del catálogo y rellena `Product.specs` con
 * la salida actual de lib/specs/extractor.ts. Idempotente: lo puedes lanzar
 * cuantas veces quieras; sólo escribe si las specs cambian.
 *
 * Uso:
 *   npx tsx scripts/backfill-specs.ts            # actualiza todo
 *   npx tsx scripts/backfill-specs.ts --dry-run  # sólo log, no escribe
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  no DATABASE_URL");
  process.exit(0);
}

import { prisma } from "../lib/prisma";
import { extractSpecs } from "../lib/specs/extractor";
import type { Prisma } from "../app/generated/prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true, name: true, description: true, category: true, specs: true,
    },
  });
  console.log(`📦 ${products.length} productos en BD`);

  let updated = 0;
  let unchanged = 0;
  let empty = 0;

  for (const p of products) {
    const next = extractSpecs({
      name: p.name,
      description: p.description,
      category: p.category,
    });
    const prev = p.specs ?? {};

    if (deepEqual(prev, next)) { unchanged++; continue; }
    if (Object.keys(next).length === 0) empty++;

    if (DRY_RUN) {
      console.log(`🔎 ${p.id} :: ${JSON.stringify(prev)} → ${JSON.stringify(next)}`);
    } else {
      await prisma.product.update({
        where: { id: p.id },
        data: { specs: next as unknown as Prisma.InputJsonValue },
      });
    }
    updated++;
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   ${DRY_RUN ? "cambiarían" : "actualizados"}: ${updated}`);
  console.log(`   sin cambios:    ${unchanged}`);
  console.log(`   sin specs:      ${empty}`);
}

main()
  .catch((e) => { console.error("❌ fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
