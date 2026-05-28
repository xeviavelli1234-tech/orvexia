import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const STORE = "PcComponentes";

interface ProductData {
  slug: string;
  name: string;
  brand: string;
  model: string;
  image: string;
  images: string[];
  rating: number;
  reviewCount: number;
  description: string;
  priceCurrent: number;
  priceOld: number | null;
  externalUrl: string;
  inStock: boolean;
}

const products: ProductData[] = [
  // ── Origial ────────────────────────────────────────────────────────────────
  {
    slug: "origial-loadchill-45-inox-lavavajillas-capacidad-10-cubiertos-d-inox",
    name: "Origial LOAD&CHILL 45 INOX Lavavajillas Capacidad 10 Cubiertos D Inox",
    brand: "Origial", model: "ORIDW45IN",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874288/1748-origial-loadchill-45-inox-lavavajillas-capacidad-10-cubiertos-d-inox.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/1087/10874288/1748-origial-loadchill-45-inox-lavavajillas-capacidad-10-cubiertos-d-inox.jpg"],
    rating: 4.4, reviewCount: 18,
    description: "Lavavajillas compacto 45cm con 10 cubiertos, 6 programas, apertura automática de puerta para secado, función media carga, 47dB y consumo de 9L por ciclo. Clase D.",
    priceCurrent: 259.00, priceOld: 319.99,
    externalUrl: "https://www.pccomponentes.com/origial-loadchill-45-inox-lavavajillas-capacidad-10-cubiertos-d-inox",
    inStock: true,
  },
  {
    slug: "origial-oridw60w-loadchill-lavavajillas-capacidad-13-cubiertos-d-blanco",
    name: "Origial ORIDW60W Load&Chill Lavavajillas Capacidad 13 Cubiertos D Blanco",
    brand: "Origial", model: "ORIDW60W",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/43/433723/1380-origial-oridw60w-loadchill-lavavajillas-capacidad-13-cubiertos-d-blanco.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/43/433723/1380-origial-oridw60w-loadchill-lavavajillas-capacidad-13-cubiertos-d-blanco.jpg"],
    rating: 4.4, reviewCount: 525,
    description: "Lavavajillas 60cm con 13 cubiertos, 7 programas, apertura automática de puerta Auto Dry Plus, función media carga, inicio diferido 24h, 47dB y 11L por ciclo. Clase D.",
    priceCurrent: 279.99, priceOld: 339.99,
    externalUrl: "https://www.pccomponentes.com/origial-oridw60w-loadchill-lavavajillas-capacidad-13-cubiertos-d-blanco",
    inStock: true,
  },
  {
    slug: "origial-loadchill-45-lavavajillas-capacidad-10-cubiertos-d-blanco",
    name: "Origial LOAD&CHILL 45 Lavavajillas Capacidad 10 Cubiertos D Blanco",
    brand: "Origial", model: "ORIDW45W",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1087/10875129/1227-origial-loadchill-45-lavavajillas-capacidad-10-cubiertos-d-blanco.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/1087/10875129/1227-origial-loadchill-45-lavavajillas-capacidad-10-cubiertos-d-blanco.jpg"],
    rating: 3.3, reviewCount: 7,
    description: "Lavavajillas compacto 45cm blanco con 10 cubiertos, 6 programas, apertura automática de puerta para secado extra, función media carga, 47dB y 9L por ciclo. Clase D.",
    priceCurrent: 254.99, priceOld: 309.99,
    externalUrl: "https://www.pccomponentes.com/origial-loadchill-45-lavavajillas-capacidad-10-cubiertos-d-blanco",
    inStock: true,
  },
  {
    slug: "origial-oridw60in-loadchill-lavavajillas-capacidad-13-cubiertos-d-inox",
    name: "Origial ORIDW60IN Load&Chill Lavavajillas Capacidad 13 Cubiertos D Inox",
    brand: "Origial", model: "ORIDW60IN",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/43/433725/1431-origial-oridw60in-loadchill-lavavajillas-capacidad-13-cubiertos-d-inox.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/43/433725/1431-origial-oridw60in-loadchill-lavavajillas-capacidad-13-cubiertos-d-inox.jpg"],
    rating: 4.4, reviewCount: 525,
    description: "Lavavajillas 60cm inox con 13 cubiertos, 7 programas, apertura automática de puerta, función media carga, inicio diferido 24h, 47dB y 11L por ciclo. Clase D.",
    priceCurrent: 299.00, priceOld: 369.90,
    externalUrl: "https://www.pccomponentes.com/origial-oridw60in-loadchill-lavavajillas-capacidad-13-cubiertos-d-inox",
    inStock: true,
  },

  // ── Balay ──────────────────────────────────────────────────────────────────
  {
    slug: "lavavajillas-balay-3vs5332ip-14-servicios-clase-c-motor-extrasilencio-y-home-connect",
    name: "Lavavajillas Balay 3VS5332IP 14 servicios Clase C Motor ExtraSilencio y Home Connect",
    brand: "Balay", model: "3VS5332IP",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1097/10978683/1593-lavavajillas-balay-3vs5332ip-14-servicios-clase-c-motor-extrasilencio-y-home-connect.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/1097/10978683/1593-lavavajillas-balay-3vs5332ip-14-servicios-clase-c-motor-extrasilencio-y-home-connect.jpg"],
    rating: 4.8, reviewCount: 4,
    description: "Lavavajillas 60cm inox con 14 servicios, motor ExtraSilencio Inverter, control WiFi Home Connect, AquaStop, cesto superior regulable RackMatic 3 alturas y garantía 10 años cuba. Clase C.",
    priceCurrent: 449.99, priceOld: 679.00,
    externalUrl: "https://www.pccomponentes.com/lavavajillas-balay-3vs5332ip-14-servicios-clase-c-motor-extrasilencio-y-home-connect",
    inStock: true,
  },
  {
    slug: "balay-3vs572ip-lavavajillas-capacidad-13-cubiertos-e",
    name: "Balay 3VS572IP Lavavajillas Capacidad 13 Cubiertos E Acero Inoxidable",
    brand: "Balay", model: "3VS572IP",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/13/137235/1857-balay-3vs572ip-lavavajillas-capacidad-13-cubiertos-e-comprar.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/13/137235/1857-balay-3vs572ip-lavavajillas-capacidad-13-cubiertos-e-comprar.jpg"],
    rating: 4.6, reviewCount: 992,
    description: "Lavavajillas 60cm acero inoxidable con 13 cubiertos, motor ExtraSilencio Inverter, cesto superior regulable 3 alturas, programa automático, función Pausa+carga y garantía 10 años cuba. Clase E.",
    priceCurrent: 423.28, priceOld: 472.00,
    externalUrl: "https://www.pccomponentes.com/balay-3vs572ip-lavavajillas-capacidad-13-cubiertos-e",
    inStock: true,
  },
  {
    slug: "balay-3vs572bp-lavavajillas-capacidad-13-cubiertos-e",
    name: "Balay 3VS572BP Lavavajillas Capacidad 13 Cubiertos E Blanco",
    brand: "Balay", model: "3VS572BP",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/13/137231/1121-balay-3vs572bp-lavavajillas-capacidad-13-cubiertos-e-comprar.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/13/137231/1121-balay-3vs572bp-lavavajillas-capacidad-13-cubiertos-e-comprar.jpg"],
    rating: 4.6, reviewCount: 992,
    description: "Lavavajillas 60cm blanco con 13 cubiertos, motor ExtraSilencio Inverter, cesto superior regulable 3 alturas, programa automático, función Pausa+carga y garantía 10 años cuba. Clase E.",
    priceCurrent: 390.72, priceOld: 442.00,
    externalUrl: "https://www.pccomponentes.com/balay-3vs572bp-lavavajillas-capacidad-13-cubiertos-e",
    inStock: true,
  },
  {
    slug: "balay-3vs506ip-lavavajillas-capacidad-12-cubiertos-e-acero-inoxidable",
    name: "Balay 3VS506IP Lavavajillas Capacidad 12 Cubiertos E Acero Inoxidable",
    brand: "Balay", model: "3VS506IP",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/41/414220/1738-balay-3vs506ip-lavavajillas-capacidad-12-cubiertos-e-acero-inoxidable-mejor-precio.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/41/414220/1738-balay-3vs506ip-lavavajillas-capacidad-12-cubiertos-e-acero-inoxidable-mejor-precio.jpg"],
    rating: 4.6, reviewCount: 359,
    description: "Lavavajillas 60cm acero inoxidable con 12 cubiertos, motor ExtraSilencio Inverter, cesto superior regulable RackMatic, programa automático, función Pausa+carga. Clase E.",
    priceCurrent: 420.04, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/balay-3vs506ip-lavavajillas-capacidad-12-cubiertos-e-acero-inoxidable",
    inStock: true,
  },
  {
    slug: "balay-3vs506bp-lavavajillas-capacidad-12-cubiertos-e-blanco",
    name: "Balay 3VS506BP Lavavajillas Capacidad 12 Cubiertos E Blanco",
    brand: "Balay", model: "3VS506BP",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/45/451439/1652-balay-3vs506bp-lavavajillas-capacidad-12-cubiertos-e-blanco.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/45/451439/1652-balay-3vs506bp-lavavajillas-capacidad-12-cubiertos-e-blanco.jpg"],
    rating: 4.6, reviewCount: 359,
    description: "Lavavajillas 60cm blanco con 12 cubiertos, motor ExtraSilencio Inverter, cesto superior regulable RackMatic, programa automático, función Pausa+carga. Clase E.",
    priceCurrent: 369.68, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/balay-3vs506bp-lavavajillas-capacidad-12-cubiertos-e-blanco",
    inStock: true,
  },
  {
    slug: "lavavajillas-balay-3vf6330sa-14-cubiertos-clase-d-infolight-home-connect-extrasilencio",
    name: "Lavavajillas Balay 3VF6330SA 14 Cubiertos Clase D InfoLight Home Connect ExtraSilencio",
    brand: "Balay", model: "3VF6330SA",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1088/10887966/1814-lavavajillas-balay-3vf6330sa-14-cubiertos-clase-d-infolight-home-connect-extrasilencio.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/1088/10887966/1814-lavavajillas-balay-3vf6330sa-14-cubiertos-clase-d-infolight-home-connect-extrasilencio.jpg"],
    rating: 4.9, reviewCount: 27,
    description: "Lavavajillas integrable 60cm con 14 cubiertos, motor ExtraSilencio Inverter (42dB), WiFi Home Connect, InfoLight, AquaStop, cesto RackMatic y garantía 10 años cuba. Clase D.",
    priceCurrent: 483.82, priceOld: 540.00,
    externalUrl: "https://www.pccomponentes.com/lavavajillas-balay-3vf6330sa-14-cubiertos-clase-d-infolight-home-connect-extrasilencio",
    inStock: true,
  },
  {
    slug: "balay-3vf304np-lavavajillas-12-cubiertos-integrable-e-blanco",
    name: "Balay 3VF304NP Lavavajillas 12 Cubiertos Integrable E Blanco",
    brand: "Balay", model: "3VF304NP",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878903/1682-balay-3vf304np-lavavajillas-12-cubiertos-integrable-e-blanco-foto.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/1087/10878903/1682-balay-3vf304np-lavavajillas-12-cubiertos-integrable-e-blanco-foto.jpg"],
    rating: 4.3, reviewCount: 7,
    description: "Lavavajillas integrable 60cm blanco con 12 cubiertos, motor ExtraSilencio, AquaStop, función media carga, 48dB y 9.5L por ciclo. Clase E.",
    priceCurrent: 374.56, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/balay-3vf304np-lavavajillas-12-cubiertos-integrable-e-blanco",
    inStock: true,
  },
  {
    slug: "balay-3vt4031na-lavavajillas-integrable-capacidad-10-cubiertos-e",
    name: "Balay 3VT4031NA Lavavajillas Integrable Capacidad 10 Cubiertos E",
    brand: "Balay", model: "3VT4031NA",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1081/10819330/1739-balay-3vt4031na-lavavajillas-integrable-capacidad-10-cubiertos-e.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/1081/10819330/1739-balay-3vt4031na-lavavajillas-integrable-capacidad-10-cubiertos-e.jpg"],
    rating: 4.7, reviewCount: 83,
    description: "Lavavajillas integrable 45cm con 10 cubiertos, motor Inverter silencioso (46dB), InfoLight, AquaStop, WiFi Home Connect, 4 programas y garantía 10 años cuba. Clase E.",
    priceCurrent: 411.52, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/balay-3vt4031na-lavavajillas-integrable-capacidad-10-cubiertos-e",
    inStock: true,
  },

  // ── Bosch ──────────────────────────────────────────────────────────────────
  {
    slug: "bosch-serie-2-sms25ai05e-lavavajillas-capacidad-12-cubiertos-e",
    name: "Bosch Serie 2 SMS25AI05E Lavavajillas Capacidad 12 Cubiertos E Acero Inoxidable",
    brand: "Bosch", model: "SMS25AI05E",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/13/137172/1970-bosch-serie-2-sms25ai05e-lavavajillas-capacidad-12-cubiertos-e-comprar.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/13/137172/1970-bosch-serie-2-sms25ai05e-lavavajillas-capacidad-12-cubiertos-e-comprar.jpg"],
    rating: 4.7, reviewCount: 551,
    description: "Lavavajillas 60cm acero inoxidable con 12 cubiertos, motor EcoSilence (48dB), AquaStop, función VarioSpeed (hasta -65% tiempo), 5 programas, 9.5L por ciclo y garantía 10 años cuba. Clase E.",
    priceCurrent: 407.99, priceOld: 448.00,
    externalUrl: "https://www.pccomponentes.com/bosch-serie-2-sms25ai05e-lavavajillas-capacidad-12-cubiertos-e",
    inStock: true,
  },
  {
    slug: "bosch-serie-2-sms25aw05e-lavavajillas-capacidad-12-cubiertos-e",
    name: "Bosch Serie 2 SMS25AW05E Lavavajillas Capacidad 12 Cubiertos E Blanco",
    brand: "Bosch", model: "SMS25AW05E",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/13/137179/1778-bosch-serie-2-sms25aw05e-lavavajillas-capacidad-12-cubiertos-e-comprar.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/13/137179/1778-bosch-serie-2-sms25aw05e-lavavajillas-capacidad-12-cubiertos-e-comprar.jpg"],
    rating: 4.6, reviewCount: 612,
    description: "Lavavajillas 60cm blanco con 12 cubiertos, motor EcoSilence (48dB), AquaStop con garantía de por vida, VarioSpeed, 9.5L por ciclo y garantía 10 años cuba. Clase E.",
    priceCurrent: 354.63, priceOld: 388.00,
    externalUrl: "https://www.pccomponentes.com/bosch-serie-2-sms25aw05e-lavavajillas-capacidad-12-cubiertos-e",
    inStock: true,
  },
  {
    slug: "lavavajillas-bosch-serie-2-sms2htw06e-13-servicios-c-wi-fi-aquasensor-home-connect",
    name: "Lavavajillas Bosch Serie 2 SMS2HTW06E 13 Servicios C Wi-Fi AquaSensor Home Connect Blanco",
    brand: "Bosch", model: "SMS2HTW06E",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1097/10975347/1674-lavavajillas-bosch-serie-2-sms2htw06e-13-servicios-c-wi-fi-aquasensor-home-connect-ba2325d6-67c7-429f-b6e9-019c4eb0960c.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/1097/10975347/1674-lavavajillas-bosch-serie-2-sms2htw06e-13-servicios-c-wi-fi-aquasensor-home-connect-ba2325d6-67c7-429f-b6e9-019c4eb0960c.jpg"],
    rating: 4.6, reviewCount: 4,
    description: "Lavavajillas 60cm blanco con 13 servicios, WiFi Home Connect, AquaSensor, motor EcoSilence (46dB), AquaStop, cesto superior regulable y media carga. Clase C.",
    priceCurrent: 413.99, priceOld: 529.00,
    externalUrl: "https://www.pccomponentes.com/lavavajillas-bosch-serie-2-sms2htw06e-13-servicios-c-wi-fi-aquasensor-home-connect",
    inStock: true,
  },
  {
    slug: "lavavajillas-bosch-serie-4-sms46kw02e-13-servicios-e-con-aquastop-y-secado-extra",
    name: "Lavavajillas Bosch Serie 4 SMS46KW02E 13 Servicios E con AquaStop y Secado Extra",
    brand: "Bosch", model: "SMS46KW02E",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1094/10941762/1409-lavavajillas-bosch-serie-4-sms46kw02e-13-servicios-e-con-aquastop-y-secado-extra.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/1094/10941762/1409-lavavajillas-bosch-serie-4-sms46kw02e-13-servicios-e-con-aquastop-y-secado-extra.jpg"],
    rating: 4.3, reviewCount: 7,
    description: "Lavavajillas 60cm con 13 servicios, AquaStop, función Secado Extra, motor EcoSilence (46dB), cesto superior regulable y media carga. Clase E.",
    priceCurrent: 416.99, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/lavavajillas-bosch-serie-4-sms46kw02e-13-servicios-e-con-aquastop-y-secado-extra",
    inStock: true,
  },
  {
    slug: "lavavajillas-bosch-serie-2-sms2hti06e-13-servicios-clase-c-wi-fi-extradry",
    name: "Lavavajillas Bosch Serie 2 SMS2HTI06E 13 Servicios Clase C Wi-Fi ExtraDry",
    brand: "Bosch", model: "SMS2HTI06E",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1097/10975346/1535-lavavajillas-bosch-serie-2-sms2hti06e-13-servicios-clase-c-wi-fi-extradry.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/1097/10975346/1535-lavavajillas-bosch-serie-2-sms2hti06e-13-servicios-clase-c-wi-fi-extradry.jpg"],
    rating: 5.0, reviewCount: 6,
    description: "Lavavajillas 60cm gris con 13 servicios, WiFi Bosch Home Connect, AquaSensor, ExtraDry, AquaStop, motor EcoSilence (46dB) y 9L por ciclo. Clase C.",
    priceCurrent: 459.00, priceOld: 689.00,
    externalUrl: "https://www.pccomponentes.com/lavavajillas-bosch-serie-2-sms2hti06e-13-servicios-clase-c-wi-fi-extradry",
    inStock: true,
  },

  // ── Beko ───────────────────────────────────────────────────────────────────
  {
    slug: "beko-dvn05320x-lavavajillas-capacidad-13-cubiertos-e-acero-inoxidable",
    name: "Beko DVN05320X Lavavajillas Capacidad 13 Cubiertos E Acero Inoxidable",
    brand: "Beko", model: "DVN05320X",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/35/352878/164-beko-dvn05320x-lavavajillas-capacidad-13-cubiertos-a-acero-inoxidable-opiniones.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/35/352878/164-beko-dvn05320x-lavavajillas-capacidad-13-cubiertos-a-acero-inoxidable-opiniones.jpg"],
    rating: 4.5, reviewCount: 196,
    description: "Lavavajillas 60cm acero inoxidable antihuellas con 13 cubiertos, 5 programas, inicio diferido, media carga, 49dB y 12.9L por ciclo. Clase E.",
    priceCurrent: 303.60, priceOld: 348.00,
    externalUrl: "https://www.pccomponentes.com/beko-dvn05320x-lavavajillas-capacidad-13-cubiertos-e-acero-inoxidable",
    inStock: true,
  },
  {
    slug: "lavavajillas-beko-bdfn26550xc-15-cubiertos-b-fast-steamgloss-selfit-acero-inoxidable",
    name: "Lavavajillas Beko BDFN26550XC 15 cubiertos B Fast+ SteamGloss SelFit Acero Inoxidable",
    brand: "Beko", model: "BDFN26550XC",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1093/10930089/144-lavavajillas-beko-bdfn26550xc-15-cubiertos-b-fast-steamgloss-selfit-acero-inoxidable.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/1093/10930089/144-lavavajillas-beko-bdfn26550xc-15-cubiertos-b-fast-steamgloss-selfit-acero-inoxidable.jpg"],
    rating: 4.3, reviewCount: 9,
    description: "Lavavajillas 60cm acero inoxidable con 15 cubiertos, tecnología Fast+ para ciclos rápidos, SteamGloss para brillo y eliminación de manchas, SelFit, 41dB y 9.9L por ciclo. Clase B.",
    priceCurrent: 375.00, priceOld: 490.00,
    externalUrl: "https://www.pccomponentes.com/lavavajillas-beko-bdfn26550xc-15-cubiertos-b-fast-steamgloss-selfit-acero-inoxidable",
    inStock: true,
  },
  {
    slug: "beko-dvn05320w-lavavajillas-capacidad-13-cubiertos-e-blanco",
    name: "Beko DVN05320W Lavavajillas Capacidad 13 Cubiertos E Blanco",
    brand: "Beko", model: "DVN05320W",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/34/349491/1911-beko-dvn05320w-lavavajillas-capacidad-13-cubiertos-a-blanco-opiniones.jpg",
    images: ["https://thumb.pccomponentes.com/w-530-530/articles/34/349491/1911-beko-dvn05320w-lavavajillas-capacidad-13-cubiertos-a-blanco-opiniones.jpg"],
    rating: 4.5, reviewCount: 196,
    description: "Lavavajillas 60cm blanco con 13 cubiertos, 5 programas (Eco, Intensivo, Clean&Shine, Quick&Shine, Mini), inicio diferido 3/6/9h, media carga y bloqueo infantil. Clase E.",
    priceCurrent: 277.99, priceOld: 302.00,
    externalUrl: "https://www.pccomponentes.com/beko-dvn05320w-lavavajillas-capacidad-13-cubiertos-e-blanco",
    inStock: true,
  },
];

async function main() {
  const existingModels = await prisma.product.findMany({
    where: { model: { in: products.map((p) => p.model) } },
    select: { model: true, name: true },
  });

  if (existingModels.length > 0) {
    console.log("⚠️  Ya existen en BD (se omitirán):");
    existingModels.forEach((p) => console.log(`   - ${p.name} (${p.model})`));
  }

  const existingModelSet = new Set(existingModels.map((p) => p.model));
  const toAdd = products.filter((p) => !existingModelSet.has(p.model));

  let added = 0;
  for (const p of toAdd) {
    const discountPercent = p.priceOld
      ? Math.round((1 - p.priceCurrent / p.priceOld) * 100)
      : 0;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { image: p.image, images: p.images, rating: p.rating, reviewCount: p.reviewCount },
      create: {
        slug: p.slug, name: p.name, category: "LAVAVAJILLAS",
        brand: p.brand, model: p.model, image: p.image, images: p.images,
        rating: p.rating, reviewCount: p.reviewCount, description: p.description,
      },
    });

    const existing = await prisma.offer.findUnique({
      where: { productId_store: { productId: product.id, store: STORE } },
      select: { priceCurrent: true },
    });

    await prisma.offer.upsert({
      where: { productId_store: { productId: product.id, store: STORE } },
      update: { priceCurrent: p.priceCurrent, priceOld: p.priceOld, discountPercent, externalUrl: p.externalUrl, inStock: p.inStock },
      create: { productId: product.id, store: STORE, priceCurrent: p.priceCurrent, priceOld: p.priceOld, discountPercent, externalUrl: p.externalUrl, inStock: p.inStock },
    });

    if (!existing || existing.priceCurrent !== p.priceCurrent) {
      await prisma.priceHistory.create({ data: { productId: product.id, store: STORE, price: p.priceCurrent } });
    }

    const priceInfo = p.priceOld
      ? `${p.priceCurrent.toFixed(2)} € (antes ${p.priceOld.toFixed(2)} €, -${discountPercent}%)`
      : `${p.priceCurrent.toFixed(2)} €`;
    console.log(`✅ ${p.name} — ${priceInfo}`);
    added++;
  }

  console.log(`\n🎉 ${added} productos añadidos | ${existingModels.length} omitidos por duplicado`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
