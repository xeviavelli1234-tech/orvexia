import "dotenv/config";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Sin DATABASE_URL");
    process.exit(1);
  }
  const c = new Client({ connectionString: url });
  await c.connect();
  const r = await c.query(`
    SELECT
      "startedAt", "finishedAt", "listingsProcessed",
      "listingsRepriced", "errors", "errorMessage"
    FROM "RepricingRun"
    ORDER BY "startedAt" DESC
    LIMIT 5
  `);
  if (r.rows.length === 0) {
    console.log("No hay RepricingRun todavía — el cron no ha disparado nunca.");
  } else {
    console.table(r.rows);
  }
  await c.end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
