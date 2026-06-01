require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");
const { normalizeDatabaseUrl } = require("../lib/db-url.cjs");

const CATEGORIES = [
  "FRIGORIFICOS",
  "LAVAVAJILLAS",
  "SECADORAS",
  "HORNOS",
  "MICROONDAS",
  "ASPIRADORAS",
  "CAFETERAS",
  "AIRES_ACONDICIONADOS",
];

async function main() {
  const client = new Client({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) });
  await client.connect();
  await client.query("BEGIN");
  try {
    const targetOffers = await client.query(
      `
      select o.id as offer_id, p.id as product_id, p.name, p.category
      from "Offer" o
      join "Product" p on p.id = o."productId"
      where lower(o.store) like '%fnac%'
        and p.category = any($1::"Category"[])
      `,
      [CATEGORIES]
    );

    let deletedOffers = 0;
    let deletedProducts = 0;
    for (const row of targetOffers.rows) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(`delete from "Offer" where id = $1`, [row.offer_id]);
      deletedOffers += 1;
      // eslint-disable-next-line no-await-in-loop
      const remaining = await client.query(`select 1 from "Offer" where "productId" = $1 limit 1`, [row.product_id]);
      if (remaining.rowCount === 0) {
        // eslint-disable-next-line no-await-in-loop
        await client.query(`delete from "Product" where id = $1`, [row.product_id]);
        deletedProducts += 1;
      }
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({ deletedOffers, deletedProducts }, null, 2));
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
