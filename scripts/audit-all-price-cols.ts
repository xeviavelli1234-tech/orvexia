import * as zlib from "zlib";
import * as fs from "fs";

const FEED_PATH = "C:/Users/xavie/Downloads/datafeed_2854543 (2).csv.gz";

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) { if (c === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else { if (c === '"') inQ = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; }
  }
  out.push(cur); return out;
}

const raw = zlib.gunzipSync(fs.readFileSync(FEED_PATH)).toString("utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const h = parseCsvLine(lines[0]);
const col = (x: string) => h.indexOf(x);

const priceCols = ["search_price","store_price","display_price","product_price_old","savings_percent","saving"];
const idxs = priceCols.map(c => ({ c, i: col(c) })).filter(x => x.i >= 0);
console.log("Columnas precio:", idxs.map(x => x.c));

let rows = 0, diffs = 0;
const samples: string[] = [];
for (let i = 1; i < lines.length; i++) {
  const c = parseCsvLine(lines[i]);
  const mc = (c[col("merchant_category")] || "").toLowerCase();
  if (!mc.includes("lavadora") || mc.includes("accesorios")) continue;
  rows++;
  const vals = Object.fromEntries(idxs.map(x => [x.c, c[x.i]]));
  const sp = parseFloat(String(vals.search_price || "").replace(",", "."));
  const op = parseFloat(String(vals.product_price_old || "").replace(/[€,]/g, "").replace(",", "."));
  const dp = String(vals.display_price || "");
  const stp = parseFloat(String(vals.store_price || "").replace(",", "."));
  const differs = (isFinite(op) && Math.abs(op - sp) > 0.01) || (isFinite(stp) && Math.abs(stp - sp) > 0.01) || (dp && !dp.includes(sp.toFixed(2)));
  if (differs) {
    diffs++;
    if (samples.length < 10) samples.push(`  sp=${vals.search_price} stp=${vals.store_price} dp=${vals.display_price} old=${vals.product_price_old} sav=${vals.savings_percent}`);
  }
}
console.log(`\nLavadoras totales: ${rows}`);
console.log(`Filas con alguna columna precio diferente: ${diffs}`);
console.log("\nSamples:");
samples.forEach(s => console.log(s));
