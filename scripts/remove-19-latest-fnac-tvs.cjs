require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");
const { normalizeDatabaseUrl } = require("../lib/db-url.cjs");

const REMOVE_COUNT = 19;

async function main() {
  const client = new Client({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) });
  await client.connect();
  await client.query("BEGIN");
  try {
    const latest = await client.query(
      `
      select o.id as offer_id, p.id as product_id, p.name
      from "Offer" o
      join "Product" p on p.id = o."productId"
      where lower(o.store) like '%fnac%'
        and p.category = 'TELEVISORES'
      order by o."updatedAt" desc nulls last, p."updatedAt" desc nulls last
      limit $1
      `,
      [REMOVE_COUNT]
    );

    for (const row of latest.rows) {
      // Remove Fnac offer
      // eslint-disable-next-line no-await-in-loop
      await client.query(`delete from "Offer" where id = $1`, [row.offer_id]);

      // If product has no remaining offers, delete product (cascades histories/signals tied by FK)
      // eslint-disable-next-line no-await-in-loop
      const stillHasOffers = await client.query(
        `select 1 from "Offer" where "productId" = $1 limit 1`,
        [row.product_id]
      );
      if (stillHasOffers.rowCount === 0) {
        // eslint-disable-next-line no-await-in-loop
        await client.query(`delete from "Product" where id = $1`, [row.product_id]);
      }
      console.log(`deleted: ${row.name}`);
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({ removed: latest.rowCount }, null, 2));
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
