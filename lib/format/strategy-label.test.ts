import { test } from "node:test";
import assert from "node:assert/strict";
import { prettyStrategy } from "./strategy-label";

test("null/undefined/'' → '—'", () => {
  assert.equal(prettyStrategy(null), "—");
  assert.equal(prettyStrategy(undefined), "—");
  assert.equal(prettyStrategy(""), "—");
  assert.equal(prettyStrategy("   "), "—");
});

test("slugs conocidos del motor heurístico", () => {
  assert.equal(prettyStrategy("balanced_midpoint"), "Punto medio");
  assert.equal(prettyStrategy("premium_anchor"), "Anclaje premium");
  assert.equal(prettyStrategy("margin_floor"), "Suelo de margen");
  assert.equal(prettyStrategy("undercut_buybox"), "Bajada agresiva");
});

test("case-insensitive", () => {
  assert.equal(prettyStrategy("BALANCED_MIDPOINT"), "Punto medio");
  assert.equal(prettyStrategy("Premium_Anchor"), "Anclaje premium");
});

test("slug desconocido → cleanup (espacios + capitalización)", () => {
  assert.equal(prettyStrategy("seasonal_lift"), "Seasonal lift");
  assert.equal(prettyStrategy("WEIRD_NEW_STRATEGY"), "Weird new strategy");
});

test("estrategias nativas del motor de reprecio", () => {
  assert.equal(prettyStrategy("buybox_winner"), "Ganar Buy Box (vs. ganador)");
  assert.equal(prettyStrategy("match"), "Igualar competidor");
});
