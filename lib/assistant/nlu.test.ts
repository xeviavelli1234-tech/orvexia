import { test } from "node:test";
import assert from "node:assert/strict";
import { detectIntent, _internals } from "./nlu";

const { extractMinMax, extractAllPrices, extractCategory, isAnaphoric } = _internals;

test("nlu: greeting reconoce 'hola' y 'buenas'", () => {
  assert.equal(detectIntent("hola").intent, "greeting");
  assert.equal(detectIntent("Buenas").intent, "greeting");
  assert.equal(detectIntent("qué tal").intent, "greeting");
});

test("nlu: thanks reconoce 'gracias'", () => {
  assert.equal(detectIntent("gracias!").intent, "thanks");
  assert.equal(detectIntent("muchas gracias").intent, "thanks");
});

test("nlu: run_now con varias formulaciones", () => {
  assert.equal(detectIntent("lanza un ciclo ahora").intent, "run_now");
  assert.equal(detectIntent("ejecuta el reprecio ya").intent, "run_now");
  assert.equal(detectIntent("reprecia ahora").intent, "run_now");
});

test("nlu: set_range con min y max explícitos", () => {
  const r = detectIntent("pon min 10 y max 20 al Roomba 705");
  assert.equal(r.intent, "set_range");
  assert.equal(r.slots.priceMin, 10);
  assert.equal(r.slots.priceMax, 20);
  assert.ok(r.slots.productRef?.includes("roomba"));
});

test("nlu: set_range con rango 'entre X y Y'", () => {
  const r = detectIntent("ponle el rango entre 15 y 30 al SKU ABC123");
  assert.equal(r.intent, "set_range");
  assert.equal(r.slots.priceMin, 15);
  assert.equal(r.slots.priceMax, 30);
});

test("nlu: set_range con 'X-Y' implícito + keyword rango", () => {
  const r = detectIntent("rango 8.50-12 al producto cafetera Delonghi");
  assert.equal(r.intent, "set_range");
  assert.equal(r.slots.priceMin, 8.5);
  assert.equal(r.slots.priceMax, 12);
});

test("nlu: set_strategy detecta BUYBOX/MATCH/FIXED/MARGIN", () => {
  assert.equal(detectIntent("cambia a buy box el sku X").slots.strategy, "BUYBOX");
  assert.equal(detectIntent("ponle estrategia ganar buybox al X").slots.strategy, "BUYBOX");
  assert.equal(detectIntent("igualar al competidor para el producto Y").slots.strategy, "MATCH");
  assert.equal(detectIntent("usar precio fijo en el Z").slots.strategy, "FIXED");
  assert.equal(detectIntent("modo por margen para el producto W").slots.strategy, "MARGIN");
});

test("nlu: toggle_off detecta pausa", () => {
  const r = detectIntent("pausa el reprecio del Roomba");
  assert.equal(r.intent, "toggle_off");
  assert.ok(r.slots.productRef?.includes("roomba"));
});

test("nlu: toggle_on detecta activar", () => {
  const r = detectIntent("activa el reprecio del SKU-001");
  assert.equal(r.intent, "toggle_on");
});

test("nlu: 'para que sirve' NO es toggle_off (falso positivo)", () => {
  const r = detectIntent("para qué sirve la estrategia margen");
  assert.notEqual(r.intent, "toggle_off");
});

test("nlu: find_products con filtros", () => {
  assert.equal(detectIntent("muéstrame mis productos sin rango").intent, "find_products");
  assert.equal(detectIntent("muéstrame mis productos sin rango").slots.filter, "unconfigured");
  assert.equal(detectIntent("lístame los productos repreciando").slots.filter, "active");
  assert.equal(detectIntent("qué productos tengo sin oferta").slots.filter, "noprice");
});

test("nlu: best_deals", () => {
  assert.equal(detectIntent("dime los chollos de hoy").intent, "best_deals");
  assert.equal(detectIntent("mejores ofertas en lavadoras").intent, "best_deals");
  assert.equal(detectIntent("mejores ofertas en lavadoras").slots.category, "lavadora");
});

test("nlu: list_categories y list_guides", () => {
  assert.equal(detectIntent("qué categorías tenéis").intent, "list_categories");
  assert.equal(detectIntent("qué guías de compra hay").intent, "list_guides");
});

test("nlu: search_catalog con categoría y orden por rating", () => {
  const r = detectIntent("búscame las lavadoras más valoradas");
  assert.equal(r.intent, "search_catalog");
  assert.equal(r.slots.category, "lavadora");
  assert.equal(r.slots.sort, "rating");
});

test("nlu: search_catalog con orden por descuento", () => {
  const r = detectIntent("recomiéndame televisores con más descuento");
  assert.equal(r.intent, "search_catalog");
  assert.equal(r.slots.category, "televisor");
  assert.equal(r.slots.sort, "discount");
});

test("nlu: product_detail con nombre tras 'info de'", () => {
  const r = detectIntent("info del LG OLED C3 55");
  assert.equal(r.intent, "product_detail");
  assert.ok(r.slots.productRef?.includes("lg"));
});

test("nlu: anáfora resuelve productRef desde contexto", () => {
  const r = detectIntent("súbele el max a 30", { lastProductRef: "Roomba 705" });
  assert.equal(r.intent, "set_range");
  assert.equal(r.slots.productRef, "Roomba 705");
  assert.equal(r.slots.priceMax, 30);
});

test("nlu: pregunta libre cae a 'info'", () => {
  assert.equal(detectIntent("explícame qué es la Buy Box").intent, "info");
});

test("extractAllPrices: maneja '10€', '10,50', '10 eur'", () => {
  assert.deepEqual(extractAllPrices("10€ 12,50 y 99 eur"), [10, 12.5, 99]);
});

test("extractMinMax: 'min X max Y'", () => {
  assert.deepEqual(extractMinMax("min 10 max 20"), { min: 10, max: 20 });
});

test("extractMinMax: 'mínimo X y máximo Y' con tildes", () => {
  assert.deepEqual(extractMinMax("mínimo 5 y máximo 50"), { min: 5, max: 50 });
});

test("extractMinMax: rango 'entre X y Y' invertido se ordena", () => {
  assert.deepEqual(extractMinMax("entre 30 y 10"), { min: 10, max: 30 });
});

test("extractCategory: normaliza categorías", () => {
  assert.equal(extractCategory("nevera"), "frigorifico");
  assert.equal(extractCategory("smart tv"), "televisor");
  assert.equal(extractCategory("aire acondicionado"), "aire acondicionado");
});

test("isAnaphoric: detecta pronombres", () => {
  assert.equal(isAnaphoric("súbele el max"), true);
  assert.equal(isAnaphoric("activa el último"), true);
  assert.equal(isAnaphoric("activa el roomba 705"), false);
});
