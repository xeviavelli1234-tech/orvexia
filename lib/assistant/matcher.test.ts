import { test } from "node:test";
import assert from "node:assert/strict";
import { findBestTopic, scoreTopic, normalize } from "./matcher";

const FLOW = {
  keys: ["empezar", "configurar"],
  phrases: ["como reprecio", "primeros pasos", "paso a paso"],
  priority: 3,
};
const SYNC = {
  keys: ["sincronizar", "importar", "productos", "no aparece"],
};
const PLAN = {
  keys: ["trial", "pro", "plan", "precio del plan"],
  phrases: ["cuanto cuesta"],
};

const TOPICS = [FLOW, SYNC, PLAN];

test("normalize: quita acentos y baja a minúsculas", () => {
  assert.equal(normalize("Cómo Reprecio"), "como reprecio");
  assert.equal(normalize("MÁXIMO"), "maximo");
});

test("findBestTopic: 'como reprecio los productos' → flujo (no sync)", () => {
  const r = findBestTopic("como reprecio los productos", TOPICS);
  assert.ok(r);
  assert.equal(r!.topic, FLOW);
});

test("findBestTopic: 'sincronizar productos' → sync", () => {
  const r = findBestTopic("como sincronizo los productos", TOPICS);
  assert.ok(r);
  assert.equal(r!.topic, SYNC);
});

test("findBestTopic: 'cuanto cuesta el plan' → plan (phrase wins)", () => {
  const r = findBestTopic("cuanto cuesta el plan", TOPICS);
  assert.ok(r);
  assert.equal(r!.topic, PLAN);
});

test("findBestTopic: 'primeros pasos' → flujo (phrase exacta)", () => {
  const r = findBestTopic("¿cuáles son los primeros pasos?", TOPICS);
  assert.ok(r);
  assert.equal(r!.topic, FLOW);
});

test("findBestTopic: ignora fragmentos dentro de palabras", () => {
  // "min" no debe matchear "administrador" ni "comino"
  const t = { keys: ["min"] };
  const r = findBestTopic("administrador en comino", [t]);
  assert.equal(r, null);
});

test("findBestTopic: keys cortas (<3) no cuentan", () => {
  const t = { keys: ["tv", "ia"] };
  const r = findBestTopic("una pregunta sobre tv", [t]);
  // tv tiene 2 letras → ignorado
  assert.equal(r, null);
});

test("findBestTopic: keys largas pesan más", () => {
  const corto = { keys: ["plan"] };
  const largo = { keys: ["suscripcion"] };
  const r = findBestTopic("plan y suscripcion", [corto, largo]);
  assert.equal(r!.topic, largo);
});

test("findBestTopic: priority multiplica el score", () => {
  const sinPriority = { keys: ["estrategia"] };
  const conPriority = { keys: ["estrategia"], priority: 5 };
  const r = findBestTopic("dime de estrategia", [sinPriority, conPriority]);
  assert.equal(r!.topic, conPriority);
});

test("findBestTopic: devuelve null si no hay match", () => {
  const r = findBestTopic("xyz abc def", TOPICS);
  assert.equal(r, null);
});

test("scoreTopic: phrase encontrada da score alto", () => {
  const t = { keys: ["a"], phrases: ["hola mundo"] };
  const s = scoreTopic("decir hola mundo a todos", t);
  assert.ok(s.score >= 10);
  assert.equal(s.matchedKey, "hola mundo");
});

test("findBestTopic: pregunta con tilde matchea topic sin tilde", () => {
  const t = { keys: ["sincronizar"], phrases: ["cómo sincronizar"] };
  // Pregunta tipo "Cómo sincronizo" (con tilde, no exacta a la frase)
  const r1 = findBestTopic("Cómo sincronizar mis listings", [t]);
  assert.ok(r1);
  assert.equal(r1!.topic, t);
});

test("findBestTopic: ordena por score, frase > key suelta", () => {
  // Topic A solo tiene una key suelta ("buybox"), Topic B tiene phrase
  // matching exacta. B gana aunque A tenga la key.
  const a = { keys: ["buybox"] };
  const b = { keys: ["abc"], phrases: ["ganar la buybox"] };
  const r = findBestTopic("como ganar la buybox", [a, b]);
  assert.equal(r!.topic, b);
});
