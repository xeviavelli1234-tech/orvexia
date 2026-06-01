require("dotenv").config({ path: ".env.local" });

const { Client } = require("pg");
const { normalizeDatabaseUrl } = require("../lib/db-url.cjs");

const TARGET_COUNT = Number.parseInt(
  (process.argv.find((a) => a.startsWith("--count=")) || "").split("=")[1] || "20",
  10
);

function normalizeOffer(priceCurrent, priceOld, discountPercent) {
  let nextPriceOld = priceOld;
  let nextDiscount = discountPercent;

  if (!(typeof priceCurrent === "number" && Number.isFinite(priceCurrent) && priceCurrent > 0)) {
    return { priceOld: null, discountPercent: null };
  }

  if (!(typeof nextPriceOld === "number" && Number.isFinite(nextPriceOld) && nextPriceOld > priceCurrent)) {
    nextPriceOld = null;
  }

  if (nextPriceOld === null) {
    nextDiscount = null;
  } else {
    const inferred = Math.round(((nextPriceOld - priceCurrent) / nextPriceOld) * 100);
    const candidate =
      typeof nextDiscount === "number" && Number.isFinite(nextDiscount) ? Math.round(nextDiscount) : inferred;
    nextDiscount = candidate > 0 && candidate <= 95 ? candidate : inferred;
    if (!(nextDiscount > 0 && nextDiscount <= 95)) nextDiscount = null;
  }

  return { priceOld: nextPriceOld, discountPercent: nextDiscount };
}

async function main() {
  if (!Number.isInteger(TARGET_COUNT) || TARGET_COUNT < 1) {
    throw new Error(`--count inválido: ${TARGET_COUNT}`);
  }

  const client = new Client({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) });
  await client.connect();
  await client.query("BEGIN");

  try {
    const all = await client.query(
      `
      select
        o.id as offer_id,
        o."productId" as product_id,
        o."priceCurrent" as price_current,
        o."priceOld" as price_old,
        o."discountPercent" as discount_percent
      from "Offer" o
      join "Product" p on p.id = o."productId"
      where lower(o.store) like '%fnac%'
        and p.category = 'LAVADORAS'
      order by o."updatedAt" desc, p."updatedAt" desc, p."createdAt" desc
      `
    );

    const keep = all.rows.slice(0, TARGET_COUNT);
    const remove = all.rows.slice(TARGET_COUNT);

    for (const row of remove) {
      // eslint-disable-next-line no-await-in-loop
      await client.query(`delete from "Offer" where id = $1`, [row.offer_id]);
    }

    for (const row of remove) {
      // eslint-disable-next-line no-await-in-loop
      const remaining = await client.query(`select 1 from "Offer" where "productId" = $1 limit 1`, [row.product_id]);
      if (remaining.rowCount === 0) {
        // eslint-disable-next-line no-await-in-loop
        await client.query(`delete from "Product" where id = $1`, [row.product_id]);
      }
    }

    let normalized = 0;
    for (const row of keep) {
      const normalizedData = normalizeOffer(
        Number(row.price_current),
        row.price_old === null ? null : Number(row.price_old),
        row.discount_percent === null ? null : Number(row.discount_percent)
      );

      const oldChanged = normalizedData.priceOld !== (row.price_old === null ? null : Number(row.price_old));
      const discountChanged =
        normalizedData.discountPercent !== (row.discount_percent === null ? null : Number(row.discount_percent));

      if (!oldChanged && !discountChanged) continue;

      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `
        update "Offer"
        set "priceOld" = $1, "discountPercent" = $2
        where id = $3
        `,
        [normalizedData.priceOld, normalizedData.discountPercent, row.offer_id]
      );
      normalized += 1;
    }

    await client.query("COMMIT");
    console.log(
      JSON.stringify(
        {
          ok: true,
          totalFound: all.rowCount,
          kept: keep.length,
          removedOffers: remove.length,
          normalizedOffers: normalized,
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

