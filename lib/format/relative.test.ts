import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRelativeShort } from "./relative";

const NOW = new Date("2026-05-26T12:00:00Z");

test("null/undefined → '—'", () => {
  assert.equal(formatRelativeShort(null, NOW), "—");
  assert.equal(formatRelativeShort(undefined, NOW), "—");
});

test("fecha inválida → '—'", () => {
  assert.equal(formatRelativeShort("no-es-fecha", NOW), "—");
});

test("hace 30s → 'ahora'", () => {
  assert.equal(
    formatRelativeShort(new Date(NOW.getTime() - 30_000), NOW),
    "ahora",
  );
});

test("hace 5 min → '5 min'", () => {
  assert.equal(
    formatRelativeShort(new Date(NOW.getTime() - 5 * 60_000), NOW),
    "5 min",
  );
});

test("hace 2 h → '2 h'", () => {
  assert.equal(
    formatRelativeShort(new Date(NOW.getTime() - 2 * 3600_000), NOW),
    "2 h",
  );
});

test("hace 3 días → '3 d'", () => {
  assert.equal(
    formatRelativeShort(new Date(NOW.getTime() - 3 * 86400_000), NOW),
    "3 d",
  );
});

test("hace >30 d → fecha corta es-ES", () => {
  const r = formatRelativeShort(
    new Date(NOW.getTime() - 60 * 86400_000),
    NOW,
  );
  // formato es-ES con 2 dígitos: DD/MM/YY
  assert.match(r, /^\d{2}\/\d{2}\/\d{2}$/);
});

test("futuro cercano → 'ahora' (no negativo)", () => {
  assert.equal(
    formatRelativeShort(new Date(NOW.getTime() + 5_000), NOW),
    "ahora",
  );
});

test("acepta ISO string", () => {
  assert.equal(
    formatRelativeShort(
      new Date(NOW.getTime() - 10 * 60_000).toISOString(),
      NOW,
    ),
    "10 min",
  );
});

test("acepta number (ms)", () => {
  assert.equal(
    formatRelativeShort(NOW.getTime() - 2 * 3600_000, NOW),
    "2 h",
  );
});
