import { test } from "node:test";
import assert from "node:assert/strict";
import { selectCompetitor, type CompetitorOffer } from "./competition";

const base: CompetitionFiltersT = { ignoreAmazon: true, fulfillment: "ANY", minRating: null };
type CompetitionFiltersT = Parameters<typeof selectCompetitor>[1];

function offer(p: Partial<CompetitorOffer>): CompetitorOffer {
  return {
    sellerId: "S",
    price: 100,
    isAmazon: false,
    isFba: false,
    rating: 4.5,
    isBuyBoxWinner: false,
    ...p,
  };
}

test("elige el más barato que pasa filtros", () => {
  const r = selectCompetitor(
    [offer({ sellerId: "A", price: 30 }), offer({ sellerId: "B", price: 25 })],
    base,
  );
  assert.equal(r.price, 25);
});

test("excluye nuestra propia oferta", () => {
  const r = selectCompetitor(
    [offer({ sellerId: "ME", price: 10 }), offer({ sellerId: "X", price: 40 })],
    base,
    "ME",
  );
  assert.equal(r.price, 40);
});

test("ignora Amazon retail si ignoreAmazon", () => {
  const r = selectCompetitor(
    [offer({ sellerId: "AMZ", price: 20, isAmazon: true }), offer({ sellerId: "X", price: 50 })],
    base,
  );
  assert.equal(r.price, 50);
});

test("incluye Amazon si ignoreAmazon=false", () => {
  const r = selectCompetitor(
    [offer({ sellerId: "AMZ", price: 20, isAmazon: true })],
    { ...base, ignoreAmazon: false },
  );
  assert.equal(r.price, 20);
});

test("filtro FBA solo considera ofertas FBA", () => {
  const r = selectCompetitor(
    [offer({ price: 10, isFba: false }), offer({ price: 30, isFba: true })],
    { ...base, fulfillment: "FBA" },
  );
  assert.equal(r.price, 30);
});

test("filtro FBM solo considera ofertas FBM", () => {
  const r = selectCompetitor(
    [offer({ price: 10, isFba: false }), offer({ price: 30, isFba: true })],
    { ...base, fulfillment: "FBM" },
  );
  assert.equal(r.price, 10);
});

test("valoración mínima descarta vendedores flojos o sin rating", () => {
  const r = selectCompetitor(
    [
      offer({ price: 10, rating: 2 }),
      offer({ price: 15, rating: null }),
      offer({ price: 22, rating: 4.8 }),
    ],
    { ...base, minRating: 4 },
  );
  assert.equal(r.price, 22);
});

test("sin ofertas elegibles → price null", () => {
  const r = selectCompetitor(
    [offer({ sellerId: "AMZ", price: 5, isAmazon: true })],
    base,
  );
  assert.equal(r.price, null);
});

test("Buy Box: WON si la gana nuestra cuenta", () => {
  const r = selectCompetitor(
    [offer({ sellerId: "ME", price: 9, isBuyBoxWinner: true }), offer({ sellerId: "X", price: 20 })],
    base,
    "ME",
  );
  assert.equal(r.buyBox, "WON");
});

test("Buy Box: LOST si la gana otro", () => {
  const r = selectCompetitor(
    [offer({ sellerId: "X", price: 9, isBuyBoxWinner: true })],
    base,
    "ME",
  );
  assert.equal(r.buyBox, "LOST");
});

test("Buy Box: UNKNOWN si nadie la marca", () => {
  const r = selectCompetitor([offer({ sellerId: "X", price: 9 })], base, "ME");
  assert.equal(r.buyBox, "UNKNOWN");
});

test("Buy Box: precio real = el de la oferta ganadora", () => {
  const r = selectCompetitor(
    [
      offer({ sellerId: "X", price: 12.5, isBuyBoxWinner: true }),
      offer({ sellerId: "Y", price: 9 }),
    ],
    base,
    "ME",
  );
  assert.equal(r.buyBox, "LOST");
  assert.equal(r.buyBoxPrice, 12.5);
  assert.equal(r.price, 9);
});

test("Buy Box: buyBoxPrice null si nadie la marca", () => {
  const r = selectCompetitor([offer({ sellerId: "X", price: 9 })], base, "ME");
  assert.equal(r.buyBoxPrice, null);
});

test("excluir vendedor (lista negra) lo ignora como competidor", () => {
  const r = selectCompetitor(
    [offer({ sellerId: "DUMPER", price: 5 }), offer({ sellerId: "X", price: 30 })],
    { ...base, excludeSellers: ["dumper"] },
  );
  assert.equal(r.price, 30);
});

test("solo competir contra ciertos vendedores (lista blanca)", () => {
  const r = selectCompetitor(
    [
      offer({ sellerId: "A", price: 10 }),
      offer({ sellerId: "RIVAL", price: 25 }),
    ],
    { ...base, onlySellers: ["rival"] },
  );
  assert.equal(r.price, 25);
});

test("lista blanca vacía → no filtra por vendedor", () => {
  const r = selectCompetitor(
    [offer({ sellerId: "A", price: 10 })],
    { ...base, onlySellers: [] },
  );
  assert.equal(r.price, 10);
});
