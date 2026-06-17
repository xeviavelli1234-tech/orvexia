import { test } from "node:test";
import assert from "node:assert/strict";
import { isSafeChannelUrl } from "./channel-url";

test("webhook genérico: bloquea destinos internos (IPv4 + IPv6)", () => {
  for (const u of [
    "https://169.254.169.254/x", // metadata cloud
    "https://127.0.0.1/x",
    "https://10.0.0.5/x",
    "https://192.168.1.1/x",
    "https://172.16.0.1/x",
    "https://100.64.0.1/x", // CGNAT
    "https://[::1]/x", // loopback IPv6 (con corchetes)
    "https://[fd00::1]/x", // ULA
    "https://[fe80::1]/x", // link-local
    "https://[::ffff:169.254.169.254]/x", // IPv4-mapped
    "https://foo.internal/x",
    "https://bar.local/x",
    "http://localhost/x",
  ]) {
    assert.equal(isSafeChannelUrl("webhook", u), false, u);
  }
});

test("webhook genérico: acepta https público, rechaza http", () => {
  assert.equal(isSafeChannelUrl("webhook", "https://hooks.zapier.com/abc"), true);
  assert.equal(isSafeChannelUrl("webhook", "https://example.com/hook"), true);
  assert.equal(isSafeChannelUrl("webhook", "http://example.com/hook"), false);
});

test("allowlist por canal conocido", () => {
  assert.equal(isSafeChannelUrl("slack", "https://hooks.slack.com/services/x"), true);
  assert.equal(isSafeChannelUrl("discord", "https://discord.com/api/webhooks/x"), true);
  assert.equal(isSafeChannelUrl("telegram", "https://api.telegram.org/botTOKEN"), true);
  // fuera de allowlist o truco de sufijo
  assert.equal(isSafeChannelUrl("slack", "https://hooks.slack.com.evil.com/x"), false);
  assert.equal(isSafeChannelUrl("telegram", "https://evil.com/x"), false);
});

test("rechaza esquemas peligrosos y URLs inválidas", () => {
  assert.equal(isSafeChannelUrl("webhook", "javascript:alert(1)"), false);
  assert.equal(isSafeChannelUrl("webhook", "file:///etc/passwd"), false);
  assert.equal(isSafeChannelUrl("webhook", "no es una url"), false);
  assert.equal(isSafeChannelUrl("webhook", ""), false);
});
