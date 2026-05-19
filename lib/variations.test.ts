import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAsin,
  familyKey,
  isVariationChild,
  groupByParent,
} from "./variations";

test("normalizeAsin: trim + mayúsculas", () => {
  assert.equal(normalizeAsin("  b08abc  "), "B08ABC");
  assert.equal(normalizeAsin(null), "");
});

test("familyKey usa el padre si existe, si no el propio ASIN", () => {
  assert.equal(familyKey({ asin: "A1" }), "A1");
  assert.equal(familyKey({ asin: "A1", parentAsin: "P9" }), "P9");
  assert.equal(familyKey({ asin: "a1", parentAsin: " p9 " }), "P9");
});

test("isVariationChild solo si el padre difiere del propio ASIN", () => {
  assert.equal(isVariationChild({ asin: "A1" }), false);
  assert.equal(isVariationChild({ asin: "A1", parentAsin: "" }), false);
  assert.equal(isVariationChild({ asin: "A1", parentAsin: "A1" }), false);
  assert.equal(isVariationChild({ asin: "A1", parentAsin: "P" }), true);
});

test("groupByParent agrupa las variaciones por familia", () => {
  const g = groupByParent([
    { asin: "C1", parentAsin: "P" },
    { asin: "C2", parentAsin: "P" },
    { asin: "S1" },
  ]);
  assert.equal(g.length, 2);
  const fam = g.find((x) => x.key === "P");
  assert.ok(fam && fam.items.length === 2);
  const solo = g.find((x) => x.key === "S1");
  assert.ok(solo && solo.items.length === 1);
});
