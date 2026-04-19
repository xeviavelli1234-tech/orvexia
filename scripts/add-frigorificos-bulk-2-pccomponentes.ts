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
  {
    slug: "beko-b1rcne364w-frigorifico-combi-e-blanco",
    name: "Beko B1RCNE364W Frigorífico Combi No Frost 316L NeoFrost Dual Cooling Clase E Blanco",
    brand: "Beko", model: "B1RCNE364W",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1026/10263333/1346-beko-b1rcne364w-frigorifico-combi-e-blanco.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1026/10263333/1346-beko-b1rcne364w-frigorifico-combi-e-blanco.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1026/10263333/2334-beko-b1rcne364w-frigorifico-combi-e-blanco-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1026/10263333/3917-beko-b1rcne364w-frigorifico-combi-e-blanco-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1026/10263333/4388-beko-b1rcne364w-frigorifico-combi-e-blanco-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1026/10263333/520-beko-b1rcne364w-frigorifico-combi-e-blanco-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1026/10263333/6606-beko-b1rcne364w-frigorifico-combi-e-blanco-d4ed863f-2a74-49f9-b1f4-f2383d137072.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1026/10263333/7331-beko-b1rcne364w-frigorifico-combi-e-blanco-b2e0f336-6210-45a2-a1c6-19bd8bc02abc.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1026/10263333/8981-beko-b1rcne364w-frigorifico-combi-e-blanco-5fe38cb0-982a-48dd-8228-b26a977dbb4e.jpg",
    ],
    rating: 4.7, reviewCount: 61,
    description: "Combi 316L (210L nevera + 106L congelador) con No Frost total NeoFrost Dual Cooling, AeroFlow, apertura 90° SmoothFit, LED, puerta reversible, 37dB y clase E.",
    priceCurrent: 365.00, priceOld: 462.00,
    externalUrl: "https://www.pccomponentes.com/beko-b1rcne364w-frigorifico-combi-e-blanco",
    inStock: true,
  },
  {
    slug: "candy-cncq2t518ew-frigorifico-combi-no-frost-279l-blanco",
    name: "Candy Fresco CNCQ2T518EW Frigorífico Combi No Frost 279L 182.5cm Clase E Blanco",
    brand: "Candy", model: "CNCQ2T518EW",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1092/10928645/1534-frigorifico-candy-fresco-cncq2t518ew-279l-blanco-combi-no-frost-1825mm-clase-e-cfd9aee3-8de3-485a-ab3a-f3baef381844.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10928645/1534-frigorifico-candy-fresco-cncq2t518ew-279l-blanco-combi-no-frost-1825mm-clase-e-cfd9aee3-8de3-485a-ab3a-f3baef381844.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10928645/2947-frigorifico-candy-fresco-cncq2t518ew-279l-blanco-combi-no-frost-1825mm-clase-e-b6442007-3583-43cb-8d3d-fbdfa558a4bb.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10928645/3223-frigorifico-candy-fresco-cncq2t518ew-279l-blanco-combi-no-frost-1825mm-clase-e-7505054e-57de-400c-a732-45e8df54de10.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10928645/4223-frigorifico-candy-fresco-cncq2t518ew-279l-blanco-combi-no-frost-1825mm-clase-e-be3410f8-d1b2-457b-b08a-802084e51ec5.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10928645/5256-frigorifico-candy-fresco-cncq2t518ew-279l-blanco-combi-no-frost-1825mm-clase-e-4dd6b5d7-ea01-49be-87bd-bff36a33cf19.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10928645/6826-frigorifico-candy-fresco-cncq2t518ew-279l-blanco-combi-no-frost-1825mm-clase-e-fb697786-76d7-4d36-beff-85dc48d88b9d.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10928645/7163-frigorifico-candy-fresco-cncq2t518ew-279l-blanco-combi-no-frost-1825mm-clase-e-cdb7ba70-d9f1-449b-90ba-bd883f77cb81.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10928645/8583-frigorifico-candy-fresco-cncq2t518ew-279l-blanco-combi-no-frost-1825mm-clase-e-25951541-cd60-475a-b659-8cff3e6bf0c4.jpg",
    ],
    rating: 5.0, reviewCount: 1,
    description: "Combi No Frost 279L con refrigeración dinámica multi-flujo, control electrónico, iluminación LED, puertas reversibles y diseño compacto 55cm de ancho. Clase E.",
    priceCurrent: 328.38, priceOld: 362.00,
    externalUrl: "https://www.pccomponentes.com/frigorifico-candy-fresco-cncq2t518ew-279l-blanco-combi-no-frost-1825mm-clase-e",
    inStock: true,
  },
  {
    slug: "origial-coolfreeze-mini-46l-frigorifico-mini-e-negro",
    name: "Origial COOL&FREEZE MINI 46L Frigorífico Mini 46L Clase E Negro",
    brand: "Origial", model: "ORIMINI46LBE",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/1717-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/1717-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/2401-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/3367-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/4715-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/5585-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/6718-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/7890-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/8294-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-a18457bd-fd9c-4248-941b-d371fe305c4c.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/9898-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-a1e0a656-60e7-451d-8e27-3d9245181fca.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10830646/10291-origial-coolfreeze-mini-46l-frigorifico-mini-e-negro-b8ca27c7-0754-4e80-8c33-fc44cd2f6e7b.jpg",
    ],
    rating: 4.7, reviewCount: 56,
    description: "Mini frigorífico 46L negro con zona Cold Zone (4L, 0 a -3°C), temperatura 2-8°C, puerta reversible, 41dB, clase E y 3 años de garantía en compresor.",
    priceCurrent: 109.00, priceOld: 139.90,
    externalUrl: "https://www.pccomponentes.com/origial-coolfreeze-mini-46l-frigorifico-mini-e-negro",
    inStock: true,
  },
  {
    slug: "aspes-af145503e-frigorifico-2-puertas-e-blanca",
    name: "Aspes AF145503E Frigorífico 2 Puertas 206L 4 Estrellas LED Clase E Blanco",
    brand: "Aspes", model: "AF145503E",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886171/1199-aspes-af145503e-frigorifico-2-puertas-e-blanca.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886171/1199-aspes-af145503e-frigorifico-2-puertas-e-blanca.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886171/2220-aspes-af145503e-frigorifico-2-puertas-e-blanca-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886171/3433-aspes-af145503e-frigorifico-2-puertas-e-blanca-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886171/4268-aspes-af145503e-frigorifico-2-puertas-e-blanca-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886171/5961-aspes-af145503e-frigorifico-2-puertas-e-blanca-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886171/6304-aspes-af145503e-frigorifico-2-puertas-e-blanca-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886171/7260-aspes-af145503e-frigorifico-2-puertas-e-blanca-dc4e80c7-3daa-4222-95a1-8deb1ec327dd.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886171/8969-aspes-af145503e-frigorifico-2-puertas-e-blanca-4b2ac760-8904-4cb5-8d39-49ec239448c9.jpg",
    ],
    rating: 4.6, reviewCount: 10,
    description: "Frigorífico 2 puertas 206L con congelador 4 estrellas, iluminación LED, puertas reversibles, descongelación manual y clase E. Ideal para espacios reducidos.",
    priceCurrent: 195.00, priceOld: 259.00,
    externalUrl: "https://www.pccomponentes.com/aspes-af145503e-frigorifico-2-puertas-e-blanca",
    inStock: true,
  },
  {
    slug: "origial-orisbs182nfin-frigorifico-americano-4-puertas-482l-dispensador",
    name: "Origial COOL&FREEZE Americano 4 Puertas 482L No Frost Clase E Inox Dispensador de Agua",
    brand: "Origial", model: "ORISBS182NFIN-4DWD",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/1800-coolfreeze-4-door-inox-dispensador-frigorifico-americano-4-puertas-482l-e-inox-con-dispensador-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/1800-coolfreeze-4-door-inox-dispensador-frigorifico-americano-4-puertas-482l-e-inox-con-dispensador-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/2345-origial-frigorifico-americano-cool-freeze-4-puertas-482l-e-inox-con-dispensador.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/251-coolfreeze-4-door-inox-dispensador-frigorifico-americano-4-puertas-482l-e-inox-con-dispensador-e09d79ae-4eef-4754-b806-76e61db8e5f2.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/3561-coolfreeze-4-door-inox-dispensador-frigorifico-americano-4-puertas-482l-e-inox-con-dispensador-7a631e10-810c-4095-b50c-a65844fcbc83.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/4262-coolfreeze-4-door-inox-dispensador-frigorifico-americano-4-puertas-482l-e-inox-con-dispensador-d299cfbb-4796-4225-90fc-e0cb7c03972c.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/5114-coolfreeze-4-door-inox-dispensador-frigorifico-americano-4-puertas-482l-e-inox-con-dispensador-0edeaedc-9396-49e4-aa1b-b8243ff3dc22.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/6938-coolfreeze-4-door-inox-dispensador-frigorifico-americano-4-puertas-482l-e-inox-con-dispensador-ef868497-41c6-4c3e-993c-8f363cbf6052.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/786-coolfreeze-4-door-inox-dispensador-frigorifico-americano-4-puertas-482l-e-inox-con-dispensador-93892550-c363-4abd-8952-e409a0326bf6.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/8866-coolfreeze-4-door-inox-dispensador-frigorifico-americano-4-puertas-482l-e-inox-con-dispensador-9d13af9b-76af-46e4-9ab7-ec980f437dc8.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874286/9992-coolfreeze-4-door-inox-dispensador-frigorifico-americano-4-puertas-482l-e-inox-con-dispensador-6f1d90f6-1f21-457a-b362-a20f0c60d615.jpg",
    ],
    rating: 4.3, reviewCount: 12,
    description: "Americano 4 puertas 482L (321L nevera + 161L congelador) Total No Frost, dispensador de agua exterior, pantalla digital, LED, clase E. 83.3cm ancho × 182cm alto.",
    priceCurrent: 639.00, priceOld: 999.99,
    externalUrl: "https://www.pccomponentes.com/origial-frigorifico-americano-cool-freeze-4-puertas-482l-e-inox-con-dispensador",
    inStock: true,
  },
  {
    slug: "corbero-cf2ph14321w-frigorifico-dos-puertas-e-blanco",
    name: "Corberó CF2PH14321W Frigorífico Dos Puertas 206L Clase E Blanco",
    brand: "Corberó", model: "CF2PH14321W",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/47/475348/1142-corbero-cf2ph14321w-frigorifico-dos-puertas-e-blanco.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/47/475348/1142-corbero-cf2ph14321w-frigorifico-dos-puertas-e-blanco.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/47/475348/2235-corbero-cf2ph14321w-frigorifico-dos-puertas-e-blanco-comprar.jpg",
    ],
    rating: 4.5, reviewCount: 14,
    description: "Frigorífico 2 puertas 206L (169L nevera + 37L congelador), clase E, refrigeración estática, puertas reversibles, estantes de vidrio y termostato mecánico.",
    priceCurrent: 224.99, priceOld: 249.00,
    externalUrl: "https://www.pccomponentes.com/corbero-cf2ph14321w-frigorifico-dos-puertas-e-blanco",
    inStock: true,
  },
  {
    slug: "lg-gbv3100cpy-frigorifico-combi-c-inox-antihuellas",
    name: "LG GBV3100CPY Frigorífico Combi 344L Linear Cooling Clase C Acero Inoxidable Antihuellas",
    brand: "LG", model: "GBV3100CPY",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1083/10835753/1337-lg-gbv3100cpy-frigorifico-combi-c-acero-inoxidable-antihuellas.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10835753/1337-lg-gbv3100cpy-frigorifico-combi-c-acero-inoxidable-antihuellas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10835753/2527-lg-gbv3100cpy-frigorifico-combi-c-acero-inoxidable-antihuellas-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10835753/390-lg-gbv3100cpy-frigorifico-combi-c-acero-inoxidable-antihuellas-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10835753/4834-lg-gbv3100cpy-frigorifico-combi-c-acero-inoxidable-antihuellas-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10835753/5459-lg-gbv3100cpy-frigorifico-combi-c-acero-inoxidable-antihuellas-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10835753/6122-lg-gbv3100cpy-frigorifico-combi-c-acero-inoxidable-antihuellas-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10835753/7453-lg-gbv3100cpy-frigorifico-combi-c-acero-inoxidable-antihuellas-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1083/10835753/8407-lg-gbv3100cpy-frigorifico-combi-c-acero-inoxidable-antihuellas-foto.jpg",
    ],
    rating: 4.8, reviewCount: 36,
    description: "Combi 344L con Linear Cooling para temperatura estable, Multi Air Flow, pantalla LED, clase C, 10 años de garantía en compresor y acabado antihuellas.",
    priceCurrent: 702.01, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/lg-gbv3100cpy-frigorifico-combi-c-acero-inoxidable-antihuellas",
    inStock: true,
  },
  {
    slug: "hisense-rt267d4awe-frigorifico-2-puertas-206l-143cm-e-blanco",
    name: "Hisense RT267D4AWE Frigorífico 2 Puertas Defrost 143cm 206L Clase E Blanco LED",
    brand: "Hisense", model: "RT267D4AWE",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1095/10959985/1773-frigorifico-dos-puertas-hisense-rt267d4awe-defrost-143-cm-206l-e-blanco-puerta-reversible-led.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10959985/1773-frigorifico-dos-puertas-hisense-rt267d4awe-defrost-143-cm-206l-e-blanco-puerta-reversible-led.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10959985/2268-frigorifico-dos-puertas-hisense-rt267d4awe-defrost-143-cm-206l-e-blanco-puerta-reversible-led-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10959985/3902-frigorifico-dos-puertas-hisense-rt267d4awe-defrost-143-cm-206l-e-blanco-puerta-reversible-led-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10959985/4707-frigorifico-dos-puertas-hisense-rt267d4awe-defrost-143-cm-206l-e-blanco-puerta-reversible-led-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10959985/5994-frigorifico-dos-puertas-hisense-rt267d4awe-defrost-143-cm-206l-e-blanco-puerta-reversible-led-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10959985/6342-frigorifico-dos-puertas-hisense-rt267d4awe-defrost-143-cm-206l-e-blanco-puerta-reversible-led-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10959985/762-frigorifico-dos-puertas-hisense-rt267d4awe-defrost-143-cm-206l-e-blanco-puerta-reversible-led-review.jpg",
    ],
    rating: 4.5, reviewCount: 0,
    description: "Frigorífico 2 puertas 206L, 143cm, puerta reversible, iluminación LED, cajón de verduras con control de humedad y sistema Defrost. Clase E, 40dB.",
    priceCurrent: 260.98, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/frigorifico-dos-puertas-hisense-rt267d4awe-defrost-143-cm-206l-e-blanco-puerta-reversible-led",
    inStock: true,
  },
  {
    slug: "beko-b1rcne364g-frigorifico-combi-no-frost-e-gris",
    name: "Beko B1RCNE364G Frigorífico Combi No Frost 316L NeoFrost Dual Cooling Clase E Gris",
    brand: "Beko", model: "B1RCNE364G",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1081/10812389/1774-beko-b1rcne364g-frigorifico-combi-no-frost-e-gris-opiniones.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1081/10812389/1774-beko-b1rcne364g-frigorifico-combi-no-frost-e-gris-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1081/10812389/2729-beko-b1rcne364g-frigorifico-combi-no-frost-e-gris-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1081/10812389/377-beko-b1rcne364g-frigorifico-combi-no-frost-e-gris-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1081/10812389/4921-beko-b1rcne364g-frigorifico-combi-no-frost-e-gris-13c004d4-b06a-42f9-a3fb-6c82330303c2.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1081/10812389/5676-beko-b1rcne364g-frigorifico-combi-no-frost-e-gris-35a2bfa3-29ff-4f8c-9188-8bb05e338ab5.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1081/10812389/6296-beko-b1rcne364g-frigorifico-combi-no-frost-e-gris-dfa90db8-f516-434d-8efd-37f5811d8f33.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1081/10812389/7727-beko-b1rcne364g-frigorifico-combi-no-frost-e-gris-c752c80a-c409-4bd8-b591-24124fdc3322.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1081/10812389/881-beko-b1rcne364g-frigorifico-combi-no-frost-e-gris-386712d8-2eaa-466c-9286-f564aa2619f6.jpg",
    ],
    rating: 4.7, reviewCount: 7,
    description: "Combi 316L (210L nevera + 106L congelador) No Frost total NeoFrost Dual Cooling, Multi Air Flow, LED, puerta reversible, 37dB, clase E. Color gris.",
    priceCurrent: 447.99, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/beko-b1rcne364g-frigorifico-combi-no-frost-e-gris",
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
        slug: p.slug, name: p.name, category: "FRIGORIFICOS",
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
