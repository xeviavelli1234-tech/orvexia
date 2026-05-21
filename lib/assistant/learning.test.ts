import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tokenize,
  jaccard,
  clusterQuestions,
  bestLearnedTopic,
  parseKeywords,
  serializeKeywords,
  parseFollowUps,
  serializeFollowUps,
} from "./learning";

test("tokenize quita acentos, stopwords y palabras de 1-2 letras", () => {
  const t = tokenize("¿Cómo configuro el rango mínimo y máximo?");
  assert.ok(t.includes("configuro"));
  assert.ok(t.includes("rango"));
  assert.ok(t.includes("minimo"));
  assert.ok(t.includes("maximo"));
  assert.ok(!t.includes("el"));
  assert.ok(!t.includes("y"));
});

test("jaccard simétrico, 1 si idénticos, 0 si disjuntos", () => {
  assert.equal(jaccard(["a", "b"], ["a", "b"]), 1);
  assert.equal(jaccard(["a"], ["b"]), 0);
  assert.equal(
    jaccard(["a", "b", "c"], ["b", "c", "d"]),
    jaccard(["b", "c", "d"], ["a", "b", "c"]),
  );
});

test("clusterQuestions agrupa preguntas similares en un solo cluster", () => {
  const inputs = [
    { id: "1", question: "¿Cómo configuro el rango mínimo y máximo?" },
    { id: "2", question: "Necesito ayuda configurando el mínimo y máximo del rango" },
    { id: "3", question: "¿Cuánto cuesta el plan Pro?" },
    { id: "4", question: "Precio del plan Pro por mes" },
  ];
  const clusters = clusterQuestions(inputs, 0.2);
  // Esperamos al menos 2 clusters distintos (rango vs plan)
  assert.ok(clusters.length >= 2);
  // Las 2 primeras y las 2 últimas deben caer juntas
  const rangoCluster = clusters.find((c) => c.questions.some((q) => q.id === "1"));
  const planCluster = clusters.find((c) => c.questions.some((q) => q.id === "3"));
  assert.ok(rangoCluster && rangoCluster.questions.some((q) => q.id === "2"));
  assert.ok(planCluster && planCluster.questions.some((q) => q.id === "4"));
});

test("clusterQuestions extrae keywords top por frecuencia", () => {
  const c = clusterQuestions(
    [
      { id: "a", question: "Configurar rango mínimo y máximo del producto" },
      { id: "b", question: "Ajustar el rango mínimo y máximo en el producto" },
      { id: "c", question: "Cambiar mínimo del producto en el rango máximo" },
    ],
    0.2,
  );
  const cluster = c[0];
  assert.ok(cluster.keywords.length > 0);
  // "rango", "minimo", "maximo", "producto" deberían aparecer
  assert.ok(cluster.keywords.includes("rango"));
  assert.ok(cluster.keywords.includes("minimo"));
  assert.ok(cluster.keywords.includes("maximo"));
});

test("bestLearnedTopic prefiere topic con keywords coincidentes", () => {
  const topics = [
    {
      id: "t1",
      keywords: "rango,minimo,maximo",
      answer: "El rango Mín/Máx limita el precio.",
      followUps: "",
      usageCount: 0,
      helpfulCount: 0,
      unhelpfulCount: 0,
    },
    {
      id: "t2",
      keywords: "plan,precio,suscripcion",
      answer: "Hay plan trial y pro.",
      followUps: "",
      usageCount: 0,
      helpfulCount: 0,
      unhelpfulCount: 0,
    },
  ];
  const m = bestLearnedTopic("Cómo configuro el rango mínimo", topics, 0.2);
  assert.ok(m);
  assert.equal(m!.id, "t1");
});

test("bestLearnedTopic devuelve null si nada llega al umbral", () => {
  const topics = [
    {
      id: "t1",
      keywords: "alphabeta,gamma,delta",
      answer: "x",
      followUps: "",
      usageCount: 0,
      helpfulCount: 0,
      unhelpfulCount: 0,
    },
  ];
  const m = bestLearnedTopic("Cómo hago algo distinto totalmente", topics, 0.5);
  assert.equal(m, null);
});

test("bestLearnedTopic: el feedback positivo empuja al ganador", () => {
  const base = {
    answer: "x",
    followUps: "",
    usageCount: 0,
    unhelpfulCount: 0,
  };
  const topics = [
    { id: "a", keywords: "rango,minimo", helpfulCount: 0, ...base },
    { id: "b", keywords: "rango,minimo", helpfulCount: 5, ...base },
  ];
  const m = bestLearnedTopic("rango minimo", topics, 0.1);
  assert.equal(m!.id, "b");
});

test("serializeKeywords / parseKeywords son inversas", () => {
  const ks = ["uno", "dos", "tres"];
  assert.deepEqual(parseKeywords(serializeKeywords(ks)), ks);
  assert.deepEqual(parseKeywords("  a,, b ,c "), ["a", "b", "c"]);
});

test("serializeFollowUps / parseFollowUps usan '|'", () => {
  const fu = ["¿Y luego?", "¿Cómo se activa?"];
  assert.deepEqual(parseFollowUps(serializeFollowUps(fu)), fu);
  assert.deepEqual(parseFollowUps(""), []);
});
