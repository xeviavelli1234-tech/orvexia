import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalize, expandQuery, scoreProduct } from "./index";

describe("normalize", () => {
  it("baja a minúsculas y quita tildes", () => {
    assert.equal(normalize("Frigorífico"), "frigorifico");
    assert.equal(normalize("Televisión"), "television");
    // La ñ se descompone también (deseable: "espana" encuentra "España").
    assert.equal(normalize("AÑO"), "ano");
  });

  it("colapsa espacios y signos", () => {
    assert.equal(normalize("  Smart   TV!! "), "smart tv");
    assert.equal(normalize("65''"), "65");
  });
});

describe("expandQuery", () => {
  it("convierte coloquialismos en categoría", () => {
    const eq = expandQuery("nevera");
    assert.deepEqual(eq.categoryHints, ["FRIGORIFICOS"]);
    assert.ok(eq.expandedTerms.includes("frigorifico"));
  });

  it("detecta TVs con tele o tv", () => {
    assert.deepEqual(expandQuery("tele").categoryHints, ["TELEVISORES"]);
    assert.deepEqual(expandQuery("tv 65").categoryHints, ["TELEVISORES"]);
  });

  it("autocorrige erratas comunes de marca", () => {
    const eq = expandQuery("samnsung");
    assert.ok(eq.expandedTerms.includes("samsung"));
  });

  it("entiende bigramas como 'aire acondicionado'", () => {
    const eq = expandQuery("aire acondicionado");
    assert.deepEqual(eq.categoryHints, ["AIRES_ACONDICIONADOS"]);
  });

  it("combina marca + categoría", () => {
    const eq = expandQuery("samsung nevera");
    assert.ok(eq.tokens.includes("samsung"));
    assert.ok(eq.expandedTerms.includes("frigorifico"));
    assert.deepEqual(eq.categoryHints, ["FRIGORIFICOS"]);
  });

  it("ignora queries vacíos", () => {
    const eq = expandQuery("  ");
    assert.equal(eq.expandedTerms.length, 0);
    assert.equal(eq.categoryHints.length, 0);
  });

  // ── Multi-idioma ────────────────────────────────────────────────────────
  it("catalán: 'rentadora' → lavadora", () => {
    const eq = expandQuery("rentadora");
    assert.deepEqual(eq.categoryHints, ["LAVADORAS"]);
    assert.ok(eq.expandedTerms.includes("lavadora"));
  });

  it("catalán: 'rentaplats' y 'rentavaixella' → lavavajillas", () => {
    assert.deepEqual(expandQuery("rentaplats").categoryHints, ["LAVAVAJILLAS"]);
    assert.deepEqual(expandQuery("rentavaixella").categoryHints, ["LAVAVAJILLAS"]);
  });

  it("catalán: 'assecadora' → secadora", () => {
    const eq = expandQuery("assecadora");
    assert.deepEqual(eq.categoryHints, ["SECADORAS"]);
    assert.ok(eq.expandedTerms.includes("secadora"));
  });

  it("catalán: 'microones' y 'forn'", () => {
    assert.deepEqual(expandQuery("microones").categoryHints, ["MICROONDAS"]);
    assert.deepEqual(expandQuery("forn").categoryHints, ["HORNOS"]);
  });

  it("catalán: 'televisió' con tilde se normaliza y matchea", () => {
    const eq = expandQuery("televisió");
    assert.deepEqual(eq.categoryHints, ["TELEVISORES"]);
    assert.ok(eq.expandedTerms.includes("televisor"));
  });

  it("catalán: bigrama 'aire condicionat'", () => {
    const eq = expandQuery("aire condicionat");
    assert.deepEqual(eq.categoryHints, ["AIRES_ACONDICIONADOS"]);
    assert.ok(eq.expandedTerms.includes("aire acondicionado"));
  });

  it("inglés: 'fridge', 'washing machine', 'dishwasher'", () => {
    assert.deepEqual(expandQuery("fridge").categoryHints, ["FRIGORIFICOS"]);
    assert.deepEqual(expandQuery("washing machine").categoryHints, ["LAVADORAS"]);
    assert.deepEqual(expandQuery("dishwasher").categoryHints, ["LAVAVAJILLAS"]);
  });

  it("inglés: 'oven', 'microwave', 'vacuum'", () => {
    assert.deepEqual(expandQuery("oven").categoryHints, ["HORNOS"]);
    assert.deepEqual(expandQuery("microwave").categoryHints, ["MICROONDAS"]);
    assert.deepEqual(expandQuery("vacuum").categoryHints, ["ASPIRADORAS"]);
  });

  it("inglés: combina marca + categoría → 'samsung fridge'", () => {
    const eq = expandQuery("samsung fridge");
    assert.ok(eq.tokens.includes("samsung"));
    assert.deepEqual(eq.categoryHints, ["FRIGORIFICOS"]);
    assert.ok(eq.expandedTerms.includes("frigorifico"));
  });

  it("gallego: 'neveira' y 'lavalouza'", () => {
    assert.deepEqual(expandQuery("neveira").categoryHints, ["FRIGORIFICOS"]);
    assert.deepEqual(expandQuery("lavalouza").categoryHints, ["LAVAVAJILLAS"]);
  });

  it("euskera: 'hozkailu' (frigorífico) y 'garbigailu' (lavadora)", () => {
    assert.deepEqual(expandQuery("hozkailu").categoryHints, ["FRIGORIFICOS"]);
    assert.deepEqual(expandQuery("garbigailu").categoryHints, ["LAVADORAS"]);
  });

  it("euskera: bigrama 'kafe makina' → cafetera", () => {
    const eq = expandQuery("kafe makina");
    assert.deepEqual(eq.categoryHints, ["CAFETERAS"]);
    assert.ok(eq.expandedTerms.includes("cafetera"));
  });
});

describe("scoreProduct", () => {
  const product = {
    name: "Samsung Frigorífico Combi RB34T652ESA No Frost",
    brand: "Samsung",
    model: "RB34T652ESA",
    description: "Frigorífico combi de Samsung con tecnología No Frost",
    category: "FRIGORIFICOS",
  };

  it("brand exacto suma mucho", () => {
    const s = scoreProduct(product, expandQuery("samsung"));
    assert.ok(s >= 400, `esperaba ≥400, obtuve ${s}`);
  });

  it("modelo exacto suma todavía más", () => {
    const s = scoreProduct(product, expandQuery("RB34T652ESA"));
    assert.ok(s >= 600, `esperaba ≥600, obtuve ${s}`);
  });

  it("categoría sugerida ('nevera') suma incluso sin texto", () => {
    const otro = { ...product, brand: "Bosch" };
    const s = scoreProduct(otro, expandQuery("nevera"));
    assert.ok(s >= 200, `esperaba ≥200 por la categoría, obtuve ${s}`);
  });

  it("una palabra de la descripción puntúa poco", () => {
    const only = { ...product, name: "X1", brand: "X", model: "" };
    const s = scoreProduct(only, expandQuery("tecnologia"));
    // sólo descripción → ~10 puntos
    assert.ok(s < 60, `esperaba <60, obtuve ${s}`);
  });

  it("hits accent-insensitive: 'frigorifico' encuentra 'Frigorífico'", () => {
    const s = scoreProduct(product, expandQuery("frigorifico"));
    assert.ok(s > 0, `esperaba puntuación >0, obtuve ${s}`);
  });
});
