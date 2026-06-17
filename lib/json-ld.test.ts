import { test } from "node:test";
import assert from "node:assert/strict";
import { jsonLdScript } from "./json-ld";

test("escapa </script> para que no rompa el bloque <script>", () => {
  const out = jsonLdScript({ name: "TV </script><svg onload=alert(1)>" });
  assert.ok(!out.includes("<"), out);
  assert.ok(!out.includes(">"), out);
  // sigue siendo JSON válido y recupera el valor original
  assert.equal(JSON.parse(out).name, "TV </script><svg onload=alert(1)>");
});

test("escapa & pero CONSERVA los espacios normales", () => {
  const out = jsonLdScript({ a: "Tom & Jerry", b: "uno dos tres" });
  assert.ok(!out.includes("&"), out);
  const parsed = JSON.parse(out);
  assert.equal(parsed.a, "Tom & Jerry");
  assert.equal(parsed.b, "uno dos tres"); // espacios intactos, no convertidos
});

test("U+2028/U+2029 se escapan y el resultado parsea", () => {
  const ls = String.fromCharCode(0x2028);
  const ps = String.fromCharCode(0x2029);
  const out = jsonLdScript({ x: `a${ls}b${ps}c` });
  assert.ok(!out.includes(ls) && !out.includes(ps), "sin separadores literales");
  assert.equal(JSON.parse(out).x, `a${ls}b${ps}c`);
});
