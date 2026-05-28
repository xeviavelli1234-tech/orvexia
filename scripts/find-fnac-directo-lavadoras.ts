import * as zlib from "zlib";
import * as fs from "fs";

const FEED_PATH = "C:/Users/xavie/Downloads/datafeed_2854543 (2).csv.gz";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function num(s: string): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(",", ".").replace(/[^\d.]/g, ""));
  return isFinite(n) ? n : null;
}

const raw = zlib.gunzipSync(fs.readFileSync(FEED_PATH)).toString("utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(lines[0]);
const col = (n: string) => headers.indexOf(n);
const iAw = col("aw_product_id");
const iName = col("product_name");
const iBrand = col("brand_name");
const iModel = col("product_model");
const iMc = col("merchant_category");
const iPrice = col("search_price");
const iOld = col("product_price_old");
const iSav = col("savings_percent");
const iFeed = col("data_feed_id");
const iUrl = col("aw_deep_link");
const iImg = col("large_image");
const iMimg = col("merchant_image_url");
const iMurl = col("merchant_deep_link");
const iEan = col("ean");

type Row = { aw: string; name: string; brand: string; mc: string; price: number; old: number | null; sav: number | null; disc: number; feed: string; url: string; mimg: string; murl: string; ean: string };

const rows: Row[] = [];
for (let i = 1; i < lines.length; i++) {
  const c = parseCsvLine(lines[i]);
  const mc = (c[iMc] || "").toLowerCase();
  if (!mc.includes("lavadora")) continue;
  const feed = c[iFeed];
  const price = num(c[iPrice]);
  const old = num(c[iOld]);
  if (!price) continue;
  const disc = old != null && old > price ? Math.round(((old - price) / old) * 100) : 0;
  rows.push({
    aw: c[iAw], name: c[iName], brand: c[iBrand], mc: c[iMc],
    price, old, sav: num(c[iSav]), disc, feed,
    url: c[iUrl], mimg: c[iMimg] || c[col("large_image")], murl: c[iMurl], ean: c[iEan]
  });
}

console.log(`Total lavadoras en feed: ${rows.length}`);
const byFeed: Record<string, { total: number; withDisc: number }> = {};
for (const r of rows) {
  const k = r.feed;
  if (!byFeed[k]) byFeed[k] = { total: 0, withDisc: 0 };
  byFeed[k].total++;
  if (r.disc > 0) byFeed[k].withDisc++;
}
console.log("Por feed:");
for (const [k, v] of Object.entries(byFeed)) {
  const label = k === "92667" ? "DIRECTO_HOGAR" : k === "92680" ? "MARKETPLACE_HOGAR" : k;
  console.log(`  ${label} (${k}): ${v.total} total, ${v.withDisc} con descuento`);
}

const withDisc = rows.filter(r => r.disc > 0).sort((a, b) => b.disc - a.disc);
console.log(`\nTop 30 ofertas reales (cualquier feed):`);
for (const r of withDisc.slice(0, 30)) {
  console.log(`-${r.disc}% | ${r.price}€ (was ${r.old}€) | ${r.brand} | ${r.name.slice(0, 60)} [feed ${r.feed}]`);
}
