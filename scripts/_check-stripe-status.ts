// Verificación de Test 4: confirma que el webhook actualizó el seller.
import "dotenv/config";
import { Client } from "pg";
import { normalizeDatabaseUrl } from "../lib/db-url";

async function main() {
  // Ajusta DATABASE_URL según tu setup. Si pruebas con Neon de Vercel,
  // copia DATABASE_URL desde Vercel → Settings → Environment Variables.
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Sin DATABASE_URL — añade a .env o exporta antes");
    process.exit(1);
  }
  const c = new Client({ connectionString: normalizeDatabaseUrl(url) });
  await c.connect();
  const r = await c.query<{
    email: string;
    plan: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }>(`
    SELECT u.email, sa.plan, sa."stripeCustomerId", sa."stripeSubscriptionId"
    FROM "SellerAccount" sa
    JOIN "User" u ON u.id = sa."userId"
    WHERE sa."stripeCustomerId" IS NOT NULL
    ORDER BY sa."updatedAt" DESC
    LIMIT 5
  `);
  if (r.rows.length === 0) {
    console.log("Ningún SellerAccount con stripeCustomerId. El webhook no actualizó nada.");
  } else {
    console.table(r.rows);
  }
  await c.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
