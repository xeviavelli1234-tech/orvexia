import { test } from "node:test";
import assert from "node:assert/strict";
import { maskEmail, EmailNotConfiguredError } from "./email";

// ── maskEmail ────────────────────────────────────────────────────────────────

test("maskEmail: email normal preserva los 2 primeros chars y el dominio", () => {
  assert.equal(maskEmail("juan.perez@example.com"), "ju***@example.com");
  assert.equal(maskEmail("alicia@gmail.com"), "al***@gmail.com");
});

test("maskEmail: local-part de 2 chars sigue mostrando los 2 (no agrega más mask)", () => {
  // Aceptable: el slice(0,2) toma los 2 chars, no rompe nada con local cortos.
  assert.equal(maskEmail("ab@x.com"), "ab***@x.com");
});

test("maskEmail: local-part de 1 char muestra ese char + ***", () => {
  assert.equal(maskEmail("a@x.com"), "a***@x.com");
});

test("maskEmail: sin @ → fallback completo", () => {
  assert.equal(maskEmail("notanemail"), "***");
  assert.equal(maskEmail(""), "***");
});

test("maskEmail: @ al inicio (sin local) → fallback completo (evita filtrar dominio puro)", () => {
  assert.equal(maskEmail("@example.com"), "***");
});

test("maskEmail: preserva caracteres especiales del local-part en el preview", () => {
  // No es lo ideal pero es comportamiento determinista: los 2 primeros chars literales.
  assert.equal(maskEmail("j+spam@example.com"), "j+***@example.com");
});

// ── EmailNotConfiguredError ──────────────────────────────────────────────────

test("EmailNotConfiguredError: es instanceof Error", () => {
  const err = new EmailNotConfiguredError();
  assert.ok(err instanceof Error);
  assert.ok(err instanceof EmailNotConfiguredError);
});

test("EmailNotConfiguredError: name distintivo (para clasificar en catch)", () => {
  const err = new EmailNotConfiguredError();
  assert.equal(err.name, "EmailNotConfiguredError");
});

test("EmailNotConfiguredError: mensaje describe el problema", () => {
  const err = new EmailNotConfiguredError();
  assert.match(err.message, /RESEND_API_KEY/);
});

test("EmailNotConfiguredError: distinguible de Error genérico en runtime", () => {
  // Caso real: el catch en logSendFailure usa instanceof para decidir si loguea
  // como warn (no configurado) o como error (fallo real). Esto valida ese check.
  const genericErr: unknown = new Error("network fail");
  const cfgErr: unknown = new EmailNotConfiguredError();
  assert.equal(genericErr instanceof EmailNotConfiguredError, false);
  assert.equal(cfgErr instanceof EmailNotConfiguredError, true);
});
