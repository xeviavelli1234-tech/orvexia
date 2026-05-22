import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseTags,
  normalizeTags,
  addTag,
  removeTag,
  collectTags,
} from "./tags";

test("parseTags limpia espacios y vacíos", () => {
  assert.deepEqual(parseTags(" a , b ,, c "), ["a", "b", "c"]);
  assert.deepEqual(parseTags(""), []);
  assert.deepEqual(parseTags(null), []);
});

test("parseTags deduplica case-insensitive conservando la primera grafía", () => {
  assert.deepEqual(parseTags("Marca, marca, MARCA, otra"), ["Marca", "otra"]);
});

test("normalizeTags acepta array o string", () => {
  assert.equal(normalizeTags(["a", " a ", "b"]), "a,b");
  assert.equal(normalizeTags("x, y, x"), "x,y");
});

test("addTag añade sin duplicar", () => {
  assert.equal(addTag("a,b", "c"), "a,b,c");
  assert.equal(addTag("a,b", "A"), "a,b");
  assert.equal(addTag("", "nueva"), "nueva");
});

test("removeTag quita case-insensitive", () => {
  assert.equal(removeTag("a,b,c", "B"), "a,c");
  assert.equal(removeTag("a", "no-existe"), "a");
});

test("collectTags une, deduplica y ordena", () => {
  assert.deepEqual(
    collectTags(["b,a", "A, c", null, "z"]),
    ["a", "b", "c", "z"],
  );
});

test("límite de longitud por etiqueta", () => {
  const long = "x".repeat(40);
  assert.equal(parseTags(long)[0].length, 24);
});
