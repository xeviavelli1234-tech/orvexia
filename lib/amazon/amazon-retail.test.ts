import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAmazonRetail,
  parseAmazonRetailOverride,
} from "./amazon-retail";
import { MARKETPLACE_IDS } from "./endpoints";

test("reconoce el SellerId de Amazon ES en el marketplace ES", () => {
  assert.equal(
    isAmazonRetail("A1AT7YVPFBWXBL", MARKETPLACE_IDS.ES),
    true,
  );
});

test("un vendedor normal NO es Amazon", () => {
  assert.equal(isAmazonRetail("A2TERCERO123", MARKETPLACE_IDS.ES), false);
});

test("el ID de Amazon ES no cuenta en otro marketplace (IDs por mercado)", () => {
  // El ID de ES no debe identificar a Amazon en DE (cada mercado tiene el suyo).
  assert.equal(isAmazonRetail("A1AT7YVPFBWXBL", MARKETPLACE_IDS.DE), false);
});

test("override por entorno (extraIds) reconoce a Amazon", () => {
  assert.equal(
    isAmazonRetail("A2NUEVOAMZ", MARKETPLACE_IDS.NL, ["A2NUEVOAMZ"]),
    true,
  );
});

test("case-insensitive y con espacios", () => {
  assert.equal(
    isAmazonRetail("  a1at7yvpfbwxbl  ", MARKETPLACE_IDS.ES),
    true,
  );
});

test("sin sellerId → false (no se puede afirmar)", () => {
  assert.equal(isAmazonRetail(undefined, MARKETPLACE_IDS.ES), false);
  assert.equal(isAmazonRetail("", MARKETPLACE_IDS.ES), false);
  assert.equal(isAmazonRetail(null, MARKETPLACE_IDS.ES), false);
});

test("marketplace desconocido sin override → false", () => {
  assert.equal(isAmazonRetail("A1AT7YVPFBWXBL", "MARKET_RARO"), false);
});

test("parseAmazonRetailOverride: CSV → array limpio", () => {
  assert.deepEqual(parseAmazonRetailOverride(" A1 , ,A2 "), ["A1", "A2"]);
  assert.deepEqual(parseAmazonRetailOverride(undefined), []);
  assert.deepEqual(parseAmazonRetailOverride(""), []);
});
