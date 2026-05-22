import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCsv,
  parsePrice,
  normalizeCategory,
  normalizeBoolean,
  slugify,
  splitCsvFields,
  splitCsvLines,
  groupProductsFromRows,
} from "./csv-import";

test("parsePrice acepta múltiples formatos europeos/americanos", () => {
  assert.equal(parsePrice("19.99"), 19.99);
  assert.equal(parsePrice("19,99"), 19.99);
  assert.equal(parsePrice("1.299,99"), 1299.99);
  assert.equal(parsePrice("1,299.99"), 1299.99);
  assert.equal(parsePrice("1.299"), 1.3); // se redondea a 2 decimales
  assert.equal(parsePrice("2 299,90 €"), 2299.9);
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice("abc"), null);
});

test("normalizeCategory acepta alias en es/en, con/sin acentos", () => {
  assert.equal(normalizeCategory("Televisores"), "TELEVISORES");
  assert.equal(normalizeCategory("tv"), "TELEVISORES");
  assert.equal(normalizeCategory("Frigoríficos"), "FRIGORIFICOS");
  assert.equal(normalizeCategory("nevera"), "FRIGORIFICOS");
  assert.equal(normalizeCategory("Lavadora"), "LAVADORAS");
  assert.equal(normalizeCategory("aire acondicionado"), "AIRES_ACONDICIONADOS");
  assert.equal(normalizeCategory("xxx"), null);
});

test("normalizeBoolean: tolera vacío y variantes", () => {
  assert.equal(normalizeBoolean(""), true);
  assert.equal(normalizeBoolean("", false), false);
  assert.equal(normalizeBoolean("false"), false);
  assert.equal(normalizeBoolean("FALSE"), false);
  assert.equal(normalizeBoolean("0"), false);
  assert.equal(normalizeBoolean("yes"), true);
  assert.equal(normalizeBoolean("sí"), true);
});

test("slugify limpia acentos y caracteres raros", () => {
  assert.equal(slugify("LG", "OLED65C44LA", 'LG OLED evo C4 65"'), "lg-oled65c44la-lg-oled-evo-c4-65");
  assert.ok(slugify("Bosch", "WAU28T40ES", "Bosch Serie 6 / 9 kg").includes("bosch"));
});

test("splitCsvFields respeta comillas dobles", () => {
  assert.deepEqual(
    splitCsvFields('LG,OLED,"LG OLED 65, evo",TELEVISORES'),
    ["LG", "OLED", "LG OLED 65, evo", "TELEVISORES"],
  );
});

test("splitCsvLines respeta saltos de línea dentro de comillas", () => {
  const text = `a,b\n"primera\nlínea",ok\nfin,end`;
  const lines = splitCsvLines(text);
  assert.equal(lines.length, 3);
});

test("parseCsv: cabecera con columnas obligatorias", () => {
  const csv = `brand,model,name,category,store,price,external_url
LG,OLED65C44LA,LG OLED C4 65,TELEVISORES,Amazon,2299.00,https://amzn.eu/x`;
  const r = parseCsv(csv);
  assert.equal(r.errors.length, 0);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].price, 2299.0);
  assert.equal(r.rows[0].store, "Amazon");
});

test("parseCsv: falta columna obligatoria → error claro", () => {
  const csv = `brand,model,name
LG,OLED,Test`;
  const r = parseCsv(csv);
  assert.ok(r.errors.length > 0);
  const missing = r.errors.find((e) => e.field === "category");
  assert.ok(missing);
});

test("parseCsv: fila solo-producto (sin store/price/url) es válida", () => {
  const csv = `brand,model,name,category,description,store,price,external_url
LG,OLED77C44LA,LG OLED C4 77 pulgadas,TELEVISORES,Modelo 2024,,,`;
  const r = parseCsv(csv);
  assert.equal(r.errors.length, 0);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].store, null);
  assert.equal(r.rows[0].price, null);
  assert.equal(r.rows[0].externalUrl, null);
});

test("parseCsv: triada de oferta parcial → error claro", () => {
  const csv = `brand,model,name,category,store,price,external_url
LG,M,N,TELEVISORES,Amazon,,https://x`;
  const r = parseCsv(csv);
  assert.equal(r.rows.length, 0);
  assert.ok(r.errors.some((e) => e.field === "offer"));
});

test("parseCsv: precios inválidos generan error sin colapsar el resto", () => {
  const csv = `brand,model,name,category,store,price,external_url
LG,OLED,A,TELEVISORES,Amazon,abc,https://x
LG,OLED2,B,TELEVISORES,Amazon,99.99,https://y`;
  const r = parseCsv(csv);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].model, "OLED2");
  assert.ok(r.errors.some((e) => e.field === "price"));
});

test("parseCsv: price_old menor o igual al precio actual se descarta", () => {
  const csv = `brand,model,name,category,store,price,price_old,external_url
LG,X,A,TELEVISORES,Amazon,100,90,https://x
LG,Y,B,TELEVISORES,Amazon,80,100,https://y`;
  const r = parseCsv(csv);
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].priceOld, null); // price_old < price → descartado
  assert.equal(r.rows[1].priceOld, 100);
});

test("parseCsv: tolera BOM al inicio", () => {
  const csv = `﻿brand,model,name,category,store,price,external_url
LG,OLED,Test,TELEVISORES,Amazon,99,https://x`;
  const r = parseCsv(csv);
  assert.equal(r.errors.length, 0);
  assert.equal(r.rows.length, 1);
});

test("groupProductsFromRows: misma (brand,model) → 1 producto con N ofertas", () => {
  const csv = `brand,model,name,category,store,price,external_url
LG,OLED65C44LA,LG OLED C4 65,TELEVISORES,Amazon,2299,https://a
LG,OLED65C44LA,LG OLED C4 65,TELEVISORES,MediaMarkt,2349,https://b
LG,OLED55C44LA,LG OLED C4 55,TELEVISORES,Amazon,1599,https://c`;
  const { rows } = parseCsv(csv);
  const products = groupProductsFromRows(rows);
  assert.equal(products.length, 2);
  const c465 = products.find((p) => p.model === "OLED65C44LA")!;
  assert.equal(c465.offers.length, 2);
  assert.ok(c465.offers.some((o) => o.store === "Amazon"));
  assert.ok(c465.offers.some((o) => o.store === "MediaMarkt"));
});

test("groupProductsFromRows: misma tienda repetida en el producto se sobrescribe (no duplica)", () => {
  const csv = `brand,model,name,category,store,price,external_url
LG,M,N,TELEVISORES,Amazon,100,https://a
LG,M,N,TELEVISORES,Amazon,90,https://b`;
  const { rows } = parseCsv(csv);
  const products = groupProductsFromRows(rows);
  assert.equal(products.length, 1);
  assert.equal(products[0].offers.length, 1);
  assert.equal(products[0].offers[0].price, 90); // queda la última
});
