require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const zlib = require("zlib");
const { Client } = require("pg");
const { normalizeDatabaseUrl } = require("../lib/db-url.cjs");

const TARGET_COUNT = Number.parseInt(
  (process.argv.find((a) => a.startsWith("--count=")) || "").split("=")[1] || "20",
  10
);
const STORE = "Fnac";
const FEED_PATHS = [
  "C:\\Users\\xavie\\Downloads\\datafeed_2854543 (1).csv.gz",
  "C:\\Users\\xavie\\Downloads\\datafeed_2854543.csv.gz",
];

function parseCsvLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1;
      let value = "";
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          value += '"';
          i += 2;
        } else if (line[i] === '"') {
          i += 1;
          break;
        } else {
          value += line[i];
          i += 1;
        }
      }
      fields.push(value);
      if (line[i] === ",") i += 1;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

function rowToRecord(headers, values) {
  const out = {};
  headers.forEach((h, idx) => {
    out[h] = values[idx] || "";
  });
  return out;
}

function parsePrice(raw) {
  const cleaned = String(raw || "").replace(/[^0-9.,-]/g, "").trim();
  if (!cleaned) return null;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;
  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (hasDot) {
    normalized = /\.\d{1,2}$/.test(cleaned) ? cleaned : cleaned.replace(/\./g, "");
  }
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseBooleanLike(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return null;
  if (/^(1|y|yes|true|in.?stock|available|disponible|on)$/i.test(v)) return true;
  if (/^(0|n|no|false|out.?of.?stock|unavailable|agotado|off)$/i.test(v)) return false;
  return null;
}

function normalizeUrl(raw) {
  const value = String(raw || "").trim().replace(/^ssl:/i, "https:");
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return null;
  return value.replace(/\?.*$/, "");
}

function extractWrappedImage(raw) {
  try {
    const u = new URL(raw);
    const wrapped = u.searchParams.get("url");
    if (!wrapped) return null;
    return normalizeUrl(decodeURIComponent(wrapped));
  } catch {
    return null;
  }
}

function dedupeImages(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = normalizeUrl(value);
    if (!normalized) continue;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= 10) break;
  }
  return out;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function makeId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function resolveFeedPath() {
  const arg = process.argv.find((a) => a.startsWith("--file="));
  if (arg) {
    const p = arg.slice("--file=".length);
    if (!fs.existsSync(p)) throw new Error(`No existe --file: ${p}`);
    return p;
  }
  for (const p of FEED_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No encontré el feed local .csv.gz en Descargas.");
}

function isStrictFridge(row) {
  const name = String(row.product_name || "").toLowerCase();
  const include = /(frigor[ií]fico|refrigerador|congelador)/i.test(name);
  if (!include) return false;
  const exclude = /(candado|cuaderno|tostadora|microondas|filtro|accesorio|bolsa|funda|combi clean|refrigerador de leche|refrigerador de aire|nevera port[aá]til|camping|mini nevera|bombilla|lamparita|jarra|arcoroc|tapa|frigor[ií]fico.*l[aá]mpara)/i.test(
    name
  );
  if (exclude) return false;
  const price = parsePrice(row.search_price) || parsePrice(row.store_price) || parsePrice(row.display_price) || 0;
  if (price < 120) return false;
  return true;
}

async function main() {
  const feedPath = resolveFeedPath();
  const raw = zlib.gunzipSync(fs.readFileSync(feedPath)).toString("utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("Feed vacío o inválido.");

  const headers = parseCsvLine(lines[0].replace(/^\uFEFF/, ""));
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    if (!values.length) continue;
    rows.push(rowToRecord(headers, values));
  }

  const candidates = rows.filter(isStrictFridge);
  if (!candidates.length) throw new Error("No hay candidatos de frigorífico con filtro estricto.");

  const client = new Client({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) });
  await client.connect();
  await client.query("BEGIN");

  try {
    const existing = await client.query(
      `
      select lower(trim(p.name)) as name_key,
             lower(coalesce(p.model, '')) as model_key,
             lower(coalesce(o."externalUrl", '')) as url_key
      from "Offer" o
      join "Product" p on p.id = o."productId"
      where p.category = 'FRIGORIFICOS'
      `
    );
    const seenNameModel = new Set(existing.rows.map((r) => `${r.name_key}::${r.model_key}`));
    const seenUrl = new Set(existing.rows.map((r) => r.url_key).filter(Boolean));

    let inserted = 0;
    const logs = [];
    for (const row of candidates) {
      if (inserted >= TARGET_COUNT) break;
      const name = String(row.product_name || "").trim();
      if (!name) continue;
      const model = String(row.model_number || row.merchant_product_id || "").trim();
      const key = `${name.toLowerCase()}::${model.toLowerCase()}`;
      if (seenNameModel.has(key)) continue;

      const externalUrl = String(row.aw_deep_link || row.merchant_deep_link || "").trim();
      if (!externalUrl) continue;
      const urlKey = externalUrl.toLowerCase();
      if (seenUrl.has(urlKey)) continue;

      const priceCurrent = parsePrice(row.search_price) || parsePrice(row.store_price) || parsePrice(row.display_price);
      if (!priceCurrent) continue;

      const oldCandidates = [
        parsePrice(row.product_price_old),
        parsePrice(row.rrp_price),
        parsePrice(row.base_price_amount),
        parsePrice(row.base_price),
      ].filter((x) => x && x > 0);
      let priceOld = oldCandidates.length ? Math.max(...oldCandidates) : null;
      if (priceOld && priceOld <= priceCurrent) priceOld = null;

      let discountPercent = null;
      const sp = parsePrice(row.savings_percent || row.saving_percent);
      if (sp) discountPercent = Math.round(sp);
      if (!discountPercent && priceOld && priceOld > priceCurrent) {
        discountPercent = Math.round(((priceOld - priceCurrent) / priceOld) * 100);
      }
      if (discountPercent !== null && (discountPercent <= 0 || discountPercent > 95)) discountPercent = null;

      const inStockValues = [
        parseBooleanLike(row.in_stock),
        parseBooleanLike(row.stock_status),
        parseBooleanLike(row.is_for_sale),
        parseBooleanLike(row.web_offer),
      ].filter((v) => v !== null);
      const inStock = inStockValues.length ? inStockValues.some(Boolean) : true;

      const wrappedMain = extractWrappedImage(row.aw_image_url);
      const wrappedThumb = extractWrappedImage(row.aw_thumb_url);
      const images = dedupeImages([
        row.large_image,
        row.merchant_image_url,
        row.alternate_image,
        row.alternate_image_two,
        row.alternate_image_three,
        row.alternate_image_four,
        row.merchant_thumb_url,
        wrappedMain,
        wrappedThumb,
        row.aw_image_url,
      ]);
      const image = images[0] || null;
      const brand = String(row.brand_name || "").trim() || name.split(" ")[0] || "FNAC";

      const slugBase =
        slugify(`${name} ${model} ${row.aw_product_id || ""}`) || slugify(name) || `frigorifico-fnac-${Date.now()}`;
      let slug = slugBase;
      let attempt = 1;
      while ((await client.query('select 1 from "Product" where slug = $1 limit 1', [slug])).rowCount > 0) {
        attempt += 1;
        slug = `${slugBase}-${attempt}`;
      }

      const now = new Date();
      const productId = makeId();
      const offerId = makeId();
      const historyId = makeId();
      const description = String(row.description || "").trim().slice(0, 2000) || null;

      await client.query(
        `
        insert into "Product"
        ("id","slug","name","category","brand","model","image","images","description","rating","reviewCount","createdAt","updatedAt")
        values
        ($1,$2,$3,$4::"Category",$5,$6,$7,$8,$9,$10,$11,$12,$13)
        `,
        [productId, slug, name, "FRIGORIFICOS", brand, model || "N/A", image, images, description, null, null, now, now]
      );

      await client.query(
        `
        insert into "Offer"
        ("id","productId","store","priceCurrent","priceOld","discountPercent","externalUrl","inStock","updatedAt")
        values
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [offerId, productId, STORE, priceCurrent, priceOld, discountPercent, externalUrl, inStock, now]
      );

      await client.query(
        `
        insert into "PriceHistory"
        ("id","productId","store","price","recordedAt")
        values
        ($1,$2,$3,$4,$5)
        `,
        [historyId, productId, STORE, priceCurrent, now]
      );

      seenNameModel.add(key);
      seenUrl.add(urlKey);
      inserted += 1;
      logs.push(`${inserted}. ${name} | ${priceCurrent.toFixed(2)}€`);
    }

    if (inserted < TARGET_COUNT) {
      throw new Error(`Solo encontré ${inserted} frigoríficos válidos con filtro estricto.`);
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({ ok: true, inserted }, null, 2));
    logs.forEach((line) => console.log(line));
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
