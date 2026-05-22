import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractSpecs } from "./extractor";

describe("extractSpecs · TVs", () => {
  it("Samsung QLED 55\" 4K Q80C", () => {
    const s = extractSpecs({
      name: 'Samsung TQ55Q80C QLED 55" 4K UHD Smart TV',
      description: null,
      category: "TELEVISORES",
    });
    assert.equal(s.sizeInches, 55);
    assert.equal(s.tech, "QLED");
    assert.equal(s.resolution, "4K UHD");
  });

  it("LG OLED evo 65 con Dolby Vision y 120 Hz", () => {
    const s = extractSpecs({
      name: 'LG OLED evo C3 65 pulgadas 120 Hz Dolby Vision HDR10 webOS',
      description: null,
      category: "TELEVISORES",
    });
    assert.equal(s.sizeInches, 65);
    assert.equal(s.tech, "OLED");
    assert.equal(s.refreshHz, 120);
    assert.deepEqual(s.hdr, ["HDR10", "Dolby Vision"]);
    assert.equal(s.os, "webOS");
  });

  it("Sony Bravia 7 Mini LED Google TV", () => {
    const s = extractSpecs({
      name: 'Sony Bravia 7 K65XR70AEP Mini LED 4K Google TV',
      description: null,
      category: "TELEVISORES",
    });
    assert.equal(s.tech, "Mini LED");
    assert.equal(s.os, "Google TV");
    assert.equal(s.resolution, "4K UHD");
  });

  it("Hisense 8K", () => {
    const s = extractSpecs({
      name: 'Hisense 75U8K 8K Mini LED Smart TV',
      description: null,
      category: "TELEVISORES",
    });
    assert.equal(s.resolution, "8K");
  });
});

describe("extractSpecs · Lavadoras", () => {
  it("Samsung 9 kg 1400 rpm Inverter clase A", () => {
    const s = extractSpecs({
      name: 'Samsung WW90T534DAW 9 kg 1400 rpm Inverter Clase A',
      description: null,
      category: "LAVADORAS",
    });
    assert.equal(s.capacityKg, 9);
    assert.equal(s.rpm, 1400);
    assert.equal(s.inverter, true);
    assert.equal(s.energyClass, "A");
  });

  it("Secadora bomba de calor 8 kg", () => {
    const s = extractSpecs({
      name: 'Bosch WTR85V40ES 8 kg Bomba de Calor',
      description: null,
      category: "SECADORAS",
    });
    assert.equal(s.capacityKg, 8);
    assert.equal(s.bombaCalor, true);
  });
});

describe("extractSpecs · Frigoríficos", () => {
  it("Samsung Combi No Frost 350 L", () => {
    const s = extractSpecs({
      name: 'Samsung RB34T652ESA Combi No Frost 350 L Clase A++',
      description: null,
      category: "FRIGORIFICOS",
    });
    assert.equal(s.fridgeType, "Combi");
    assert.equal(s.noFrost, true);
    assert.equal(s.capacityLiters, 350);
    assert.equal(s.energyClass, "A++");
  });

  it("Side by Side americano", () => {
    const s = extractSpecs({
      name: 'LG GSL480PZXF Side by Side Americano 600 litros',
      description: null,
      category: "FRIGORIFICOS",
    });
    // Prioridad: Side by Side gana sobre Americano
    assert.equal(s.fridgeType, "Side by Side");
    assert.equal(s.capacityLiters, 600);
  });
});

describe("extractSpecs · Lavavajillas", () => {
  it("Bosch 14 cubiertos 44 dB", () => {
    const s = extractSpecs({
      name: 'Bosch SMV4HVX31E 14 cubiertos 44 dB Clase E',
      description: null,
      category: "LAVAVAJILLAS",
    });
    assert.equal(s.cubiertos, 14);
    assert.equal(s.noiseDb, 44);
  });
});

describe("extractSpecs · Hornos / Microondas", () => {
  it("Horno pirolítico de 71 L con convección", () => {
    const s = extractSpecs({
      name: 'Balay 3HB5848A0 71 L Pirolítico convección Clase A',
      description: null,
      category: "HORNOS",
    });
    assert.equal(s.volumeLiters, 71);
    assert.equal(s.pyrolytic, true);
    assert.equal(s.convection, true);
  });
});

describe("extractSpecs · Cafeteras", () => {
  it("Nespresso 19 bar", () => {
    const s = extractSpecs({
      name: 'Krups Nespresso Vertuo XN911B Cafetera 19 bar',
      description: null,
      category: "CAFETERAS",
    });
    assert.equal(s.bars, 19);
    assert.equal(s.capsule, "Nespresso");
  });

  it("Dolce Gusto", () => {
    const s = extractSpecs({
      name: 'Krups Genio S KP240810 Dolce Gusto 15 bar',
      description: null,
      category: "CAFETERAS",
    });
    assert.equal(s.capsule, "Dolce Gusto");
  });
});

describe("extractSpecs · Aspiradoras", () => {
  it("Robot con HEPA y 90 min de batería", () => {
    const s = extractSpecs({
      name: 'iRobot Roomba i7+ 90 min HEPA WiFi',
      description: null,
      category: "ASPIRADORAS",
    });
    assert.equal(s.batteryMin, 90);
    assert.equal(s.hepa, true);
    assert.equal(s.wifi, true);
  });
});

describe("extractSpecs · Comunes", () => {
  it("clase A+++ y WiFi", () => {
    const s = extractSpecs({
      name: 'Algo Clase A+++',
      description: 'Tiene WiFi y Bluetooth',
      category: "FRIGORIFICOS",
    });
    assert.equal(s.energyClass, "A+++");
    assert.equal(s.wifi, true);
    assert.equal(s.bluetooth, true);
  });

  it("no inventa specs cuando no las hay", () => {
    const s = extractSpecs({
      name: 'Producto desconocido',
      description: null,
      category: "OTROS",
    });
    assert.deepEqual(s, {});
  });
});
