import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectCategory, detectIntent, TOPICS } from "./public-core";
import { findBestTopic } from "./matcher";

describe("detectCategory", () => {
  it("detecta frigoríficos en castellano, catalán, inglés y euskera", () => {
    assert.equal(detectCategory("ofertas en nevera"),       "FRIGORIFICOS");
    assert.equal(detectCategory("preu frigorífic"),         "FRIGORIFICOS");
    assert.equal(detectCategory("fridge deals please"),     "FRIGORIFICOS");
    assert.equal(detectCategory("hozkailu merkeak"),        "FRIGORIFICOS");
  });

  it("detecta tele en varios idiomas", () => {
    assert.equal(detectCategory("recomienda una tele"),     "TELEVISORES");
    assert.equal(detectCategory("una televisió bona"),      "TELEVISORES");
    assert.equal(detectCategory("telebista barata"),        "TELEVISORES");
  });

  it("detecta lavadora vs secadora vs lavavajillas", () => {
    assert.equal(detectCategory("una rentadora"),           "LAVADORAS");
    assert.equal(detectCategory("una assecadora"),          "SECADORAS");
    assert.equal(detectCategory("rentaplats nou"),          "LAVAVAJILLAS");
  });

  it("no se confunde por palabras sueltas dentro de otras", () => {
    // "telefono" tiene "tele" como subcadena, pero el matcher exige bordes
    assert.equal(detectCategory("mi telefono nuevo"),       null);
  });

  it("devuelve null cuando no hay categoría", () => {
    assert.equal(detectCategory("hola buenas"),             null);
    assert.equal(detectCategory(""),                        null);
  });
});

describe("detectIntent", () => {
  it("intent price con producto detrás", () => {
    const i = detectIntent("precio del Samsung Q80C");
    assert.equal(i?.name, "price");
    assert.match(i?.payload ?? "", /samsung q80c/i);
  });

  it("intent price acepta variantes coloquiales", () => {
    assert.equal(detectIntent("cuánto cuesta la LG OLED55")?.name, "price");
    assert.equal(detectIntent("a cómo está el Bosch SMS")?.name,   "price");
    assert.equal(detectIntent("cual es el precio del horno")?.name, "price");
  });

  it("intent deals con keywords variadas", () => {
    assert.equal(detectIntent("ofertas en lavadoras")?.name,        "deals");
    assert.equal(detectIntent("dame descuentos")?.name,             "deals");
    assert.equal(detectIntent("tienes algún chollo")?.name,         "deals");
    assert.equal(detectIntent("frigoríficos baratos")?.name,        "deals");
  });

  it("intent price_drops", () => {
    assert.equal(detectIntent("¿qué ha bajado esta semana?")?.name,       "price_drops");
    assert.equal(detectIntent("bajadas de precio recientes")?.name,       "price_drops");
  });

  it("intent recommend", () => {
    assert.equal(detectIntent("recomiéndame una lavadora")?.name,         "recommend");
    assert.equal(detectIntent("cuál comprar")?.name,                      "recommend");
    assert.equal(detectIntent("mejor televisor")?.name,                   "recommend");
  });

  it("intent account_state", () => {
    assert.equal(detectIntent("cuántos guardados tengo")?.name,           "account_state");
    assert.equal(detectIntent("mis alertas")?.name,                       "account_state");
  });

  it("intent guides_list", () => {
    assert.equal(detectIntent("qué guías hay")?.name,                     "guides_list");
    assert.equal(detectIntent("guía de compra de neveras")?.name,         "guides_list");
  });

  it("intent compare_help", () => {
    assert.equal(detectIntent("cómo comparo dos productos")?.name,        "compare_help");
    assert.equal(detectIntent("dónde está el comparador")?.name,          "compare_help");
  });

  it("preguntas vacías o sin keywords no matchean", () => {
    assert.equal(detectIntent(""),                                        null);
    assert.equal(detectIntent("hola buenos días"),                        null);
  });
});

describe("TOPICS estáticos", () => {
  it("hay un topic para cada área importante", () => {
    const allKeys = TOPICS.flatMap((t) => t.keys.map((k) => k.toLowerCase()));
    // Áreas mínimas que el asistente debe cubrir
    for (const area of [
      "buscador", "categorias", "guardar", "alerta", "comparador",
      "ficha", "guias", "ofertas destacadas", "comunidad", "opiniones",
      "registro", "login", "2fa", "cookies", "privacidad", "afiliacion",
    ]) {
      assert.ok(
        allKeys.some((k) => k.includes(area)),
        `falta topic que cubra "${area}"`,
      );
    }
  });

  it("topic de búsqueda matchea preguntas reales", () => {
    const m = findBestTopic("cómo se usa el buscador", TOPICS);
    assert.ok(m, "esperaba match para 'cómo se usa el buscador'");
    assert.match(m!.topic.answer, /buscador|buscar/i);
  });

  it("topic de RGPD matchea pregunta sobre borrar cuenta", () => {
    const m = findBestTopic("quiero borrar mi cuenta y mis datos", TOPICS);
    assert.ok(m);
    assert.match(m!.topic.answer, /datos|privacidad|rgpd|borrar/i);
  });

  it("topic de 2FA matchea preguntas comunes", () => {
    const m = findBestTopic("cómo activo el 2FA", TOPICS);
    assert.ok(m);
    assert.match(m!.topic.answer, /2FA|TOTP|autenticador|authenticator/i);
  });
});
