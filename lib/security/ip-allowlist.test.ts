import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAllowlist,
  serializeAllowlist,
  isIpAllowed,
} from "./ip-allowlist";

test("parseAllowlist tolera comas, espacios y saltos", () => {
  assert.deepEqual(parseAllowlist(" 1.1.1.1 , 2.2.2.2\n3.3.3.0/24"), [
    "1.1.1.1",
    "2.2.2.2",
    "3.3.3.0/24",
  ]);
  assert.deepEqual(parseAllowlist(""), []);
});

test("serializeAllowlist usa comas", () => {
  assert.equal(serializeAllowlist(["1.1.1.1", "2.2.2.2"]), "1.1.1.1,2.2.2.2");
});

test("vacío = permite todo", () => {
  assert.equal(isIpAllowed("1.2.3.4", ""), true);
  assert.equal(isIpAllowed(null, ""), true);
});

test("sin IP y con allowlist activa → bloquea", () => {
  assert.equal(isIpAllowed(null, "1.2.3.0/24"), false);
});

test("IP exacta", () => {
  assert.equal(isIpAllowed("1.2.3.4", "1.2.3.4"), true);
  assert.equal(isIpAllowed("1.2.3.5", "1.2.3.4"), false);
});

test("CIDR /24 IPv4", () => {
  assert.equal(isIpAllowed("1.2.3.7", "1.2.3.0/24"), true);
  assert.equal(isIpAllowed("1.2.4.7", "1.2.3.0/24"), false);
});

test("CIDR /16 IPv4", () => {
  assert.equal(isIpAllowed("1.2.99.99", "1.2.0.0/16"), true);
  assert.equal(isIpAllowed("1.3.0.1", "1.2.0.0/16"), false);
});

test("CIDR /0 admite todo", () => {
  assert.equal(isIpAllowed("8.8.8.8", "0.0.0.0/0"), true);
});

test("Varias reglas separadas por coma", () => {
  const rules = "10.0.0.0/24,192.168.1.5";
  assert.equal(isIpAllowed("10.0.0.99", rules), true);
  assert.equal(isIpAllowed("192.168.1.5", rules), true);
  assert.equal(isIpAllowed("192.168.1.6", rules), false);
});

test("IPv6 exacta y CIDR /64", () => {
  assert.equal(isIpAllowed("2001:db8::1", "2001:db8::1"), true);
  assert.equal(isIpAllowed("2001:db8:0:0:1::5", "2001:db8::/32"), true);
  assert.equal(isIpAllowed("2002::1", "2001:db8::/32"), false);
});

test("IP malformada no rompe ni autoriza", () => {
  assert.equal(isIpAllowed("not.an.ip", "1.2.3.0/24"), false);
  assert.equal(isIpAllowed("1.2.3.4", "badrule/24"), false);
});
