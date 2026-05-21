import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, __resetRateLimitForTests } from "./rate-limit";

test("rateLimit: no limita por debajo del umbral", () => {
  __resetRateLimitForTests();
  for (let i = 0; i < 5; i++) {
    assert.equal(rateLimit("test", "k", 5, 60_000), false);
  }
});

test("rateLimit: limita cuando supera", () => {
  __resetRateLimitForTests();
  for (let i = 0; i < 5; i++) {
    rateLimit("test", "k", 5, 60_000);
  }
  // La 6ª devuelve true (length > limit)
  assert.equal(rateLimit("test", "k", 5, 60_000), true);
});

test("rateLimit: claves distintas no se mezclan", () => {
  __resetRateLimitForTests();
  for (let i = 0; i < 6; i++) rateLimit("test", "a", 5, 60_000);
  assert.equal(rateLimit("test", "b", 5, 60_000), false);
});

test("rateLimit: namespaces distintos no se mezclan", () => {
  __resetRateLimitForTests();
  for (let i = 0; i < 6; i++) rateLimit("ns1", "k", 5, 60_000);
  assert.equal(rateLimit("ns2", "k", 5, 60_000), false);
});

test("rateLimit: key vacía no cuenta", () => {
  __resetRateLimitForTests();
  for (let i = 0; i < 100; i++) {
    assert.equal(rateLimit("test", "", 5, 60_000), false);
  }
});
