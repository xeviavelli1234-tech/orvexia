require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");
const { normalizeDatabaseUrl } = require("../lib/db-url.cjs");

async function main() {
  const client = new Client({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) });
  await client.connect();
  await client.query("BEGIN");
  try {
    const bad = await client.query(
      `
      select p.id, p.name
      from "Product" p
      join "Offer" o on o."productId" = p.id
      where lower(o.store) like '%fnac%'
        and p.category = 'TELEVISORES'
        and (
          lower(p.name) like '%marcadores%'
          or lower(p.name) like '%tote bag%'
          or lower(p.name) like '%paperblanks%'
        )
      `
    );

    for (const row of bad.rows) {
      // Deleting product cascades related offers/history via FK.
      // eslint-disable-next-line no-await-in-loop
      await client.query('delete from "Product" where id = $1', [row.id]);
      console.log(`deleted: ${row.name}`);
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({ deleted: bad.rowCount }, null, 2));
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
