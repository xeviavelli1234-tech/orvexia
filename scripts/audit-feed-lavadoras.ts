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
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const raw = zlib.gunzipSync(fs.readFileSync(FEED_PATH)).toString("utf8");
const lines = raw.split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(lines[0]);
const col = (name: string) => headers.indexOf(name);
const iMc = col("merchant_category");
const iPrice = col("search_price");
const iOld = col("product_price_old");
const iSav = col("savings_percent");
const iAwId = col("aw_product_id");
const iName = col("product_name");
const iFeed = col("data_feed_id");

let total = 0, withOld = 0;
const samples: string[] = [];
for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  const mc = (cols[iMc] || "").toLowerCase();
  if (!mc.includes("lavadora")) continue;
  total++;
  if (cols[iOld] && cols[iOld].trim() !== "") {
    withOld++;
    if (samples.length < 5) samples.push(`feed=${cols[iFeed]} mc="${cols[iMc]}" price=${cols[iPrice]} old=${cols[iOld]} sav=${cols[iSav]} aw=${cols[iAwId]}`);
  }
}
console.log(`lavadora rows: ${total} | with product_price_old: ${withOld}`);
console.log("\nSamples with discount:");
samples.forEach(s => console.log("  " + s));

// Check our 20 lavadoras aw_ids
const ourIds = new Set(["37592171192","37592171317","37592171424","37592171473","37592171538","37592173601","37592173602","37592173603","37592173604","37592173607","37592175014","40528620966","43197892982","38443430988","37592175044","37592175046","37592175058","37592175066","38915696129","44372459927"]);
const ourRows: Record<string, { price: string; old: string; sav: string; feed: string; mc: string }> = {};
for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  if (ourIds.has(cols[iAwId])) {
    ourRows[cols[iAwId]] = { price: cols[iPrice], old: cols[iOld], sav: cols[iSav], feed: cols[iFeed], mc: cols[iMc] };
  }
}
console.log("\nOur 20 lavadoras:");
for (const id of ourIds) {
  const r = ourRows[id];
  if (!r) { console.log(`  ${id} NOT IN FEED`); continue; }
  console.log(`  feed=${r.feed} mc="${r.mc}" price=${r.price} old=${r.old} sav=${r.sav}`);
}
