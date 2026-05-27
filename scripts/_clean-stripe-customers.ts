/**
 * Limpia stripeCustomerId/stripeSubscriptionId de TODOS los SellerAccount.
 *
 * Cuándo: al hacer el switch Test → Live. Los customer IDs creados en Test
 * mode ya no existen en Live, así que hay que vaciarlos para que el checkout
 * cree unos nuevos en Live.
 *
 * Cómo: pega DATABASE_URL de Production (Vercel → Settings → Env Vars) y
 * ejecuta `npx tsx scripts/_clean-stripe-customers.ts` desde PowerShell.
 */
import "dotenv/config";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Sin DATABASE_URL — añade a .env o exporta antes con $env:DATABASE_URL=...");
    process.exit(1);
  }
  const c = new Client({ connectionString: url });
  await c.connect();

  // 1. Listar los que se van a limpiar
  const before = await c.query<{
    id: string;
    email: string;
    plan: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }>(`
    SELECT sa.id, u.email, sa.plan, sa."stripeCustomerId", sa."stripeSubscriptionId"
    FROM "SellerAccount" sa
    JOIN "User" u ON u.id = sa."userId"
    WHERE sa."stripeCustomerId" IS NOT NULL OR sa."stripeSubscriptionId" IS NOT NULL
  `);

  if (before.rows.length === 0) {
    console.log("Nada que limpiar. Todos los SellerAccount tienen stripeCustomerId NULL.");
    await c.end();
    return;
  }

  console.log(`\nVan a limpiarse ${before.rows.length} SellerAccount:`);
  console.table(before.rows);

  // 2. UPDATE
  const result = await c.query(`
    UPDATE "SellerAccount"
    SET "stripeCustomerId" = NULL,
        "stripeSubscriptionId" = NULL
    WHERE "stripeCustomerId" IS NOT NULL OR "stripeSubscriptionId" IS NOT NULL
  `);

  console.log(`\nLimpiados ${result.rowCount} registros.`);
  console.log("Ahora el próximo 'Pasar a Pro' creará un customer nuevo en Live mode.");

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
