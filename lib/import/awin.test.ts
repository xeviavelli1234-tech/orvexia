import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseInStock,
  extractAwProductId,
  extractImages,
  computeOfferUpdate,
} from "./awin";

// Las claves en los fixtures siguen los nombres reales de columnas de los feeds
// Awin de FNAC y El Corte Inglés. Diferencias clave:
//   - FNAC:  saving_percent  (singular)
//   - ECI:   savings_percent (plural)
//   - Ambos usan in_stock = "1"/"0" y stock_status como texto opcional
//   - URLs de Awin: pclick.php?p=<aw_product_id>&a=<advertiser>&m=<merchant>

// ── extractAwProductId ──────────────────────────────────────────────────────

test("extractAwProductId: URL típica de Awin (FNAC)", () => {
  const url = "https://www.awin1.com/pclick.php?p=44372459927&a=2854543&m=77630";
  assert.equal(extractAwProductId(url), "44372459927");
});

test("extractAwProductId: URL con parámetros reordenados (ECI)", () => {
  const url = "https://www.awin1.com/pclick.php?m=12345&a=99&p=42067514518";
  assert.equal(extractAwProductId(url), "42067514518");
});

test("extractAwProductId: p al inicio del query (cred.php)", () => {
  const url = "https://www.awin1.com/cread.php?p=43474319343&awinmid=12345";
  assert.equal(extractAwProductId(url), "43474319343");
});

test("extractAwProductId: URL sin parámetro p → null", () => {
  assert.equal(extractAwProductId("https://www.fnac.es/algo-directo"), null);
  assert.equal(extractAwProductId("https://www.awin1.com/cread.php?a=123&m=456"), null);
});

test("extractAwProductId: URL vacía → null", () => {
  assert.equal(extractAwProductId(""), null);
});

test("extractAwProductId: decodifica caracteres URL-encoded", () => {
  // En la práctica el aw_product_id es numérico, pero el extractor decode por si acaso
  const url = "https://www.awin1.com/pclick.php?p=abc%20123&a=1&m=2";
  assert.equal(extractAwProductId(url), "abc 123");
});

// ── parseInStock ────────────────────────────────────────────────────────────

test("parseInStock: in_stock=1 → true (caso típico FNAC disponible)", () => {
  assert.equal(parseInStock({ in_stock: "1" }), true);
});

test("parseInStock: in_stock=0 → false (caso típico agotado)", () => {
  assert.equal(parseInStock({ in_stock: "0" }), false);
});

test("parseInStock: is_for_sale=0 → false (descatalogado en ECI)", () => {
  assert.equal(parseInStock({ in_stock: "1", is_for_sale: "0" }), false);
});

test("parseInStock: stock_status 'agotado' → false (sobreescribe in_stock)", () => {
  assert.equal(parseInStock({ in_stock: "1", stock_status: "agotado" }), false);
  assert.equal(parseInStock({ in_stock: "1", stock_status: "Sin stock" }), false);
  assert.equal(parseInStock({ in_stock: "1", stock_status: "no disponible" }), false);
  assert.equal(parseInStock({ in_stock: "1", stock_status: "out of stock" }), false);
});

test("parseInStock: stock_status 'disponible' → true", () => {
  assert.equal(parseInStock({ stock_status: "disponible" }), true);
  assert.equal(parseInStock({ stock_status: "in stock" }), true);
  assert.equal(parseInStock({ stock_status: "available" }), true);
});

test("parseInStock: stock_quantity negativo → false", () => {
  assert.equal(parseInStock({ in_stock: "1", stock_quantity: "-5" }), false);
});

test("parseInStock: fila sin señal de stock → false (defensivo, asume agotado)", () => {
  // El parser exige una señal explícita (in_stock=1 o stock_status con palabra
  // de disponibilidad). Sin nada, marca agotado para evitar mostrar precios stale.
  assert.equal(parseInStock({}), false);
});

test("parseInStock: stock_status vacío + in_stock=1 → true", () => {
  // Caso real FNAC: a veces stock_status viene como string vacío
  assert.equal(parseInStock({ in_stock: "1", stock_status: "" }), true);
});

// ── extractImages ───────────────────────────────────────────────────────────

test("extractImages: prioriza merchant_image_url sobre alternativas", () => {
  const imgs = extractImages({
    merchant_image_url: "https://cdn.fnac.es/main.jpg",
    aw_image_url: "https://cdn.awin.com/thumb.jpg",
    alternate_image: "https://cdn.fnac.es/alt1.jpg",
  });
  assert.equal(imgs[0], "https://cdn.fnac.es/main.jpg");
  assert.equal(imgs.length, 3);
});

test("extractImages: dedup URLs repetidas", () => {
  const imgs = extractImages({
    merchant_image_url: "https://cdn.fnac.es/a.jpg",
    large_image: "https://cdn.fnac.es/a.jpg",
    alternate_image: "https://cdn.fnac.es/b.jpg",
  });
  assert.deepEqual(imgs, ["https://cdn.fnac.es/a.jpg", "https://cdn.fnac.es/b.jpg"]);
});

test("extractImages: descarta URLs no http(s)", () => {
  const imgs = extractImages({
    merchant_image_url: "/relative/path.jpg",
    large_image: "data:image/png;base64,xxx",
    aw_image_url: "https://valid.com/x.jpg",
  });
  assert.deepEqual(imgs, ["https://valid.com/x.jpg"]);
});

test("extractImages: filtra strings vacíos y undefined", () => {
  const imgs = extractImages({
    merchant_image_url: "",
    aw_image_url: "   ",
    alternate_image: "https://ok.com/x.jpg",
  });
  assert.deepEqual(imgs, ["https://ok.com/x.jpg"]);
});

test("extractImages: limita a 8 (slice máximo del feed)", () => {
  const imgs = extractImages({
    merchant_image_url: "https://a.com/1.jpg",
    large_image: "https://a.com/2.jpg",
    aw_image_url: "https://a.com/3.jpg",
    alternate_image: "https://a.com/4.jpg",
    alternate_image_two: "https://a.com/5.jpg",
    alternate_image_three: "https://a.com/6.jpg",
    alternate_image_four: "https://a.com/7.jpg",
  });
  assert.ok(imgs.length <= 8);
});

// ── computeOfferUpdate (lógica central de precio/descuento/stock) ──────────

test("computeOfferUpdate FNAC: precio + was_price + saving_percent (singular)", () => {
  // Fila representativa de FNAC con descuento real del store
  const row = {
    aw_product_id: "44372459927",
    search_price: "618.97",
    was_price: "799.00",
    saving_percent: "23", // FNAC singular
    in_stock: "1",
  };
  const r = computeOfferUpdate(row);
  assert.ok(r);
  assert.equal(r.priceCurrent, 618.97);
  assert.equal(r.priceOld, 799);
  assert.equal(r.discountPercent, 23);
  assert.equal(r.inStock, true);
});

test("computeOfferUpdate ECI: usa savings_percent (plural)", () => {
  const row = {
    aw_product_id: "42067514518",
    search_price: "1199,99",
    was_price: "1499,00",
    savings_percent: "20", // ECI plural
    in_stock: "1",
  };
  const r = computeOfferUpdate(row);
  assert.ok(r);
  assert.equal(r.priceCurrent, 1199.99);
  assert.equal(r.priceOld, 1499);
  assert.equal(r.discountPercent, 20);
});

test("computeOfferUpdate: fallback al ratio si el feed no manda descuento", () => {
  const row = { search_price: "80", was_price: "100", in_stock: "1" };
  const r = computeOfferUpdate(row);
  assert.ok(r);
  assert.equal(r.discountPercent, 20);
});

test("computeOfferUpdate: precio actual usa search_price > store_price > display_price", () => {
  assert.equal(computeOfferUpdate({ search_price: "10", store_price: "20", display_price: "30" })?.priceCurrent, 10);
  assert.equal(computeOfferUpdate({ store_price: "20", display_price: "30" })?.priceCurrent, 20);
  assert.equal(computeOfferUpdate({ display_price: "30" })?.priceCurrent, 30);
});

test("computeOfferUpdate: sin precio actual → null (no procesable)", () => {
  assert.equal(computeOfferUpdate({}), null);
  assert.equal(computeOfferUpdate({ search_price: "0" }), null);
  assert.equal(computeOfferUpdate({ search_price: "abc" }), null);
});

test("computeOfferUpdate: priceOld ≤ priceCurrent → priceOld=null y descuento=null", () => {
  const r = computeOfferUpdate({ search_price: "100", was_price: "100" });
  assert.ok(r);
  assert.equal(r.priceOld, null);
  assert.equal(r.discountPercent, null);
});

test("computeOfferUpdate: PVPR (rrp_price) con descuento >25% sin was_price → se descarta", () => {
  // Patrón típico: el fabricante dice "PVPR 1000€" pero el store lleva meses a 400€
  const r = computeOfferUpdate({ search_price: "400", rrp_price: "1000" });
  assert.ok(r);
  assert.equal(r.priceOld, null, "PVPR inflado se descarta");
  assert.equal(r.discountPercent, null);
});

test("computeOfferUpdate: PVPR con descuento ≤25% se conserva", () => {
  const r = computeOfferUpdate({ search_price: "800", rrp_price: "1000" });
  assert.ok(r);
  assert.equal(r.priceOld, 1000);
  assert.equal(r.discountPercent, 20);
});

test("computeOfferUpdate: was_price del store SIEMPRE gana sobre rrp_price", () => {
  // El store dice "antes 850, ahora 800" (sólo 5%). PVPR 1500 (que sería 47%) se ignora.
  const r = computeOfferUpdate({ search_price: "800", was_price: "850", rrp_price: "1500" });
  assert.ok(r);
  assert.equal(r.priceOld, 850);
  assert.equal(r.discountPercent, 6);
});

test("computeOfferUpdate: product_price_old equivale a was_price si éste falta", () => {
  const r = computeOfferUpdate({ search_price: "100", product_price_old: "150" });
  assert.ok(r);
  assert.equal(r.priceOld, 150);
  assert.equal(r.discountPercent, 33);
});

test("computeOfferUpdate: respeta el stock derivado", () => {
  const r = computeOfferUpdate({ search_price: "10", in_stock: "0" });
  assert.ok(r);
  assert.equal(r.inStock, false);
});

test("computeOfferUpdate: precio europeo con coma decimal y miles con punto", () => {
  const r = computeOfferUpdate({ search_price: "1.299,99", was_price: "1.599,00" });
  assert.ok(r);
  assert.equal(r.priceCurrent, 1299.99);
  assert.equal(r.priceOld, 1599);
});
