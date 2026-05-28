require("dotenv").config({ path: ".env.local" });

const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("BEGIN");

  try {
    const beforeOffers = await client.query(
      `
      select count(*)::int as c
      from "Offer"
      where lower(store) like '%pccomponentes%'
      `
    );

    const deletedOffers = await client.query(
      `
      delete from "Offer"
      where lower(store) like '%pccomponentes%'
      returning "productId"
      `
    );

    const touchedProductIds = [...new Set(deletedOffers.rows.map((r) => r.productId))];

    let deletedProducts = 0;
    for (const productId of touchedProductIds) {
      // eslint-disable-next-line no-await-in-loop
      const remaining = await client.query(
        `select 1 from "Offer" where "productId" = $1 limit 1`,
        [productId]
      );
      if (remaining.rowCount === 0) {
        // eslint-disable-next-line no-await-in-loop
        await client.query(`delete from "Product" where id = $1`, [productId]);
        deletedProducts += 1;
      }
    }

    const afterOffers = await client.query(
      `
      select count(*)::int as c
      from "Offer"
      where lower(store) like '%pccomponentes%'
      `
    );

    await client.query("COMMIT");
    console.log(
      JSON.stringify(
        {
          ok: true,
          pccomponentesOffersBefore: beforeOffers.rows[0].c,
          pccomponentesOffersDeleted: deletedOffers.rowCount,
          productsDeletedWithoutAnyOffer: deletedProducts,
          pccomponentesOffersAfter: afterOffers.rows[0].c,
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

