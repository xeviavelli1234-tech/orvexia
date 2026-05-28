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
  // ── Balay ──────────────────────────────────────────────────────────────────
  {
    slug: "balay-3hb2010b0-horno-multifuncion-66l-a-blanco",
    name: "Balay 3HB2010B0 Horno Multifunción 66L A Blanco",
    brand: "Balay", model: "3HB2010B0",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/16/163367/1958-horno-multifuncion-balay-3hb2010b0-66l-manual-puerta-abatible-blanco-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/16/163367/1958-horno-multifuncion-balay-3hb2010b0-66l-manual-puerta-abatible-blanco-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/16/163367/2174-horno-multifuncion-balay-3hb2010b0-66l-manual-puerta-abatible-blanco-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/16/163367/3326-horno-multifuncion-balay-3hb2010b0-66l-manual-puerta-abatible-blanco-especificaciones.jpg",
    ],
    rating: 4.5, reviewCount: 125,
    description: "Horno multifunción 66L eléctrico integrable con 8 funciones de cocción, puerta abatible con triple cristal, grill, 4 alturas de parrilla y control analógico. Clase A.",
    priceCurrent: 285.14, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/balay-3hb2010b0-horno-multifuncion-66l-a-blanco",
    inStock: true,
  },
  {
    slug: "horno-electrico-balay-3hb5131n3-71l-negro-integrado-con-eficiencia-a-y-control-giratorio",
    name: "Horno Eléctrico Balay 3HB5131N3 71L Negro integrado con eficiencia A+ y control giratorio",
    brand: "Balay", model: "3HB5131N3",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1088/10887287/1277-horno-electrico-balay-3hb5131n3-71l-negro-integrado-con-eficiencia-a-y-control-giratorio.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10887287/1277-horno-electrico-balay-3hb5131n3-71l-negro-integrado-con-eficiencia-a-y-control-giratorio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10887287/2675-horno-electrico-balay-3hb5131n3-71l-negro-integrado-con-eficiencia-a-y-control-giratorio-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10887287/3885-horno-electrico-balay-3hb5131n3-71l-negro-integrado-con-eficiencia-a-y-control-giratorio-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10887287/4253-horno-electrico-balay-3hb5131n3-71l-negro-integrado-con-eficiencia-a-y-control-giratorio-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10887287/5559-horno-electrico-balay-3hb5131n3-71l-negro-integrado-con-eficiencia-a-y-control-giratorio-caracteristicas.jpg",
    ],
    rating: 5.0, reviewCount: 3,
    description: "Horno eléctrico integrable 71L negro con 10 funciones de cocción, autolimpieza hidrolítica, control giratorio, puerta SoftClose y gestión de vapor. Clase A+.",
    priceCurrent: 336.91, priceOld: 358.00,
    externalUrl: "https://www.pccomponentes.com/horno-electrico-balay-3hb5131n3-71l-negro-integrado-con-eficiencia-a-y-control-giratorio",
    inStock: true,
  },
  {
    slug: "horno-electrico-balay-3hb4841x3-71l-inox-pirolitico-e-hidrolitico-con-railes-telescopicos",
    name: "Horno Eléctrico Balay 3HB4841X3 71L Inox Pirolítico e Hidrolítico con Raíles Telescópicos",
    brand: "Balay", model: "3HB4841X3",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1093/10935389/1208-horno-electrico-balay-3hb4841x3-71l-inox-pirolitico-e-hidrolitico-con-railes-telescopicos-caracteristicas.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10935389/1208-horno-electrico-balay-3hb4841x3-71l-inox-pirolitico-e-hidrolitico-con-railes-telescopicos-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10935389/2485-horno-electrico-balay-3hb4841x3-71l-inox-pirolitico-e-hidrolitico-con-railes-telescopicos-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10935389/3377-horno-electrico-balay-3hb4841x3-71l-inox-pirolitico-e-hidrolitico-con-railes-telescopicos-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10935389/4262-horno-electrico-balay-3hb4841x3-71l-inox-pirolitico-e-hidrolitico-con-railes-telescopicos-foto.jpg",
    ],
    rating: 4.7, reviewCount: 6,
    description: "Horno eléctrico integrable 71L inox con limpieza pirolítica y hidrolítica, raíles telescópicos, 10 funciones de cocción, puerta SoftClose y cristal cuádruple. Clase A+.",
    priceCurrent: 429.00, priceOld: 478.00,
    externalUrl: "https://www.pccomponentes.com/horno-electrico-balay-3hb4841x3-71l-inox-pirolitico-e-hidrolitico-con-railes-telescopicos",
    inStock: true,
  },
  {
    slug: "balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable",
    name: "Balay 3HB4131X3 Horno Eléctrico Convencional 71L A+ Acero Inoxidable",
    brand: "Balay", model: "3HB4131X3",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/1398-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/1398-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/2152-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/324-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/4541-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/5262-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/682-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/7487-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/897-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/9703-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable-8465620e-3a85-4573-98e2-293f2ee8b4aa.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10871189/10719-balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable-dcbbf04a-9c91-4331-bcd4-8e3eb9d0d420.jpg",
    ],
    rating: 4.9, reviewCount: 15,
    description: "Horno eléctrico integrable 71L acero inoxidable con 9 funciones, autolimpieza hidrolítica, puerta con doble cristal, 5 alturas de rejilla y control por mandos. Clase A+.",
    priceCurrent: 321.85, priceOld: 340.00,
    externalUrl: "https://www.pccomponentes.com/balay-3hb4131x3-horno-electrico-convencional-71l-a-acero-inoxidable",
    inStock: true,
  },
  {
    slug: "horno-multifuncion-balay-3hb2010x0-66l-60cm-limpieza-manual-a-grill-puerta-fria-acero-inoxidable",
    name: "Horno Multifunción Balay 3HB2010X0 66L 60cm Limpieza Manual A Grill Puerta Fría Acero Inoxidable",
    brand: "Balay", model: "3HB2010X0",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/16/163370/1459-horno-multifuncion-balay-3hb2010x0-66l-60cm-limpieza-manual-a-grill-puerta-fria-acero-inoxidable-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/16/163370/1459-horno-multifuncion-balay-3hb2010x0-66l-60cm-limpieza-manual-a-grill-puerta-fria-acero-inoxidable-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/16/163370/2397-horno-multifuncion-balay-3hb2010x0-66l-60cm-limpieza-manual-a-grill-puerta-fria-acero-inoxidable-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/16/163370/395-horno-multifuncion-balay-3hb2010x0-66l-60cm-limpieza-manual-a-grill-puerta-fria-acero-inoxidable-especificaciones.jpg",
    ],
    rating: 4.5, reviewCount: 125,
    description: "Horno multifunción 66L integrable inox con 8 funciones, puerta fría con triple cristal, grill, 4 alturas de parrilla y limpieza manual. Clase A.",
    priceCurrent: 269.00, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/horno-multifuncion-balay-3hb2010x0-66l-60cm-limpieza-manual-a-grill-puerta-fria-acero-inoxidable",
    inStock: true,
  },
  {
    slug: "horno-electrico-balay-3hb5131b3-71l-blanco-con-autolimpieza-hidrolitica-y-bloqueo-infantil",
    name: "Horno Eléctrico Balay 3HB5131B3 71L Blanco con Autolimpieza Hidrolítica y Bloqueo Infantil",
    brand: "Balay", model: "3HB5131B3",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1093/10935381/1295-horno-electrico-balay-3hb5131b3-71l-blanco-con-autolimpieza-hidrolitica-y-bloqueo-infantil-caracteristicas.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10935381/1295-horno-electrico-balay-3hb5131b3-71l-blanco-con-autolimpieza-hidrolitica-y-bloqueo-infantil-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10935381/2529-horno-electrico-balay-3hb5131b3-71l-blanco-con-autolimpieza-hidrolitica-y-bloqueo-infantil-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10935381/3780-horno-electrico-balay-3hb5131b3-71l-blanco-con-autolimpieza-hidrolitica-y-bloqueo-infantil-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10935381/4386-horno-electrico-balay-3hb5131b3-71l-blanco-con-autolimpieza-hidrolitica-y-bloqueo-infantil-foto.jpg",
    ],
    rating: 4.6, reviewCount: 6,
    description: "Horno eléctrico integrable 71L blanco con 10 funciones, autolimpieza hidrolítica, bloqueo infantil, puerta SoftClose con triple cristal y control por mandos. Clase A+.",
    priceCurrent: 336.23, priceOld: 358.00,
    externalUrl: "https://www.pccomponentes.com/horno-electrico-balay-3hb5131b3-71l-blanco-con-autolimpieza-hidrolitica-y-bloqueo-infantil",
    inStock: true,
  },

  // ── Teka ───────────────────────────────────────────────────────────────────
  {
    slug: "horno-electrico-teka-neo-hsb-6360-ss-70l-inox-hydro-autolimpieza-eficiencia-a",
    name: "Horno Eléctrico Teka NEO HSB 6360 SS 70L Inox Hydro Autolimpieza Eficiencia A+",
    brand: "Teka", model: "NEO HSB 6360 SS",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929680/1139-horno-electrico-teka-neo-hsb-6360-ss-70l-inox-hydro-autolimpieza-eficiencia-a-especificaciones.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929680/1139-horno-electrico-teka-neo-hsb-6360-ss-70l-inox-hydro-autolimpieza-eficiencia-a-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929680/2819-horno-electrico-teka-neo-hsb-6360-ss-70l-inox-hydro-autolimpieza-eficiencia-a-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929680/321-horno-electrico-teka-neo-hsb-6360-ss-70l-inox-hydro-autolimpieza-eficiencia-a-opiniones.jpg",
    ],
    rating: 4.8, reviewCount: 6,
    description: "Horno eléctrico integrable 70L inox con autolimpieza Hydro, 9 funciones de cocción, display LED, ventilador de calor envolvente y parrilla telescópica. Clase A+.",
    priceCurrent: 269.00, priceOld: 278.99,
    externalUrl: "https://www.pccomponentes.com/horno-electrico-teka-neo-hsb-6360-ss-70l-inox-hydro-autolimpieza-eficiencia-a",
    inStock: true,
  },
  {
    slug: "horno-electrico-teka-hcb-6370-70-l-negro-inox-con-guia-extraible-y-eficiencia-a",
    name: "Horno Eléctrico Teka HCB 6370 70L Negro/Inox con Guía Extraíble y Eficiencia A+",
    brand: "Teka", model: "HCB 6370",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1098/10982405/1353-horno-electrico-teka-hcb-6370-70-l-negro-inox-con-guia-extraible-y-eficiencia-a.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1098/10982405/1353-horno-electrico-teka-hcb-6370-70-l-negro-inox-con-guia-extraible-y-eficiencia-a.jpg",
    ],
    rating: 5.0, reviewCount: 2,
    description: "Horno eléctrico integrable 70L negro/inox con guía extraíble telescópica, autolimpieza Hydro, 9 funciones de cocción, display TFT táctil y calor envolvente. Clase A+.",
    priceCurrent: 274.98, priceOld: 359.00,
    externalUrl: "https://www.pccomponentes.com/horno-electrico-teka-hcb-6370-70-l-negro-inox-con-guia-extraible-y-eficiencia-a",
    inStock: true,
  },
  {
    slug: "horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro",
    name: "Horno Eléctrico Teka NEO HSB 6466 70L Negro Acero Inox con Autolimpieza Hydro",
    brand: "Teka", model: "NEO HSB 6466",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/1460-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/1460-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/2361-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/3637-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/4125-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/5884-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/6574-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/7155-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/8937-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-517cc461-442e-45ac-a138-284997a1ab5e.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/956-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-65e3f227-c533-4eb2-88f8-cc7644802c04.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/10432-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-bcfbd6d0-d743-4320-9602-36262b83f67f.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/11473-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-8335120a-d800-46f6-a509-009ec78ff45d.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/12793-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-5e1ecf1d-8187-4cd0-9dde-82d67cd29b1c.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/1336-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-5284dbb9-351f-4192-ad79-80d3d3175a06.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934880/14366-horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro-3160b436-48cf-437f-961e-55e4d5318233.jpg",
    ],
    rating: 4.5, reviewCount: 0,
    description: "Horno eléctrico integrable 70L negro/inox con autolimpieza Hydro, 11 funciones de cocción, display TFT táctil, calor envolvente y parrillas telescópicas. Clase A+.",
    priceCurrent: 299.00, priceOld: 339.00,
    externalUrl: "https://www.pccomponentes.com/horno-electrico-teka-neo-hsb-6466-70l-negro-acero-inox-con-autolimpieza-hydro",
    inStock: true,
  },
  {
    slug: "horno-electrico-teka-hbb-6050-ss-70l-inoxido-hydro-integrado-temporizador-digital",
    name: "Horno Eléctrico Teka HBB 6050 SS 70L Inox Hydro Integrado Temporizador Digital",
    brand: "Teka", model: "HBB 6050 SS",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929668/182-horno-electrico-teka-hbb-6050-ss-70l-inoxido-hydro-integrado-temporizador-digital.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929668/182-horno-electrico-teka-hbb-6050-ss-70l-inoxido-hydro-integrado-temporizador-digital.jpg",
    ],
    rating: 4.5, reviewCount: 0,
    description: "Horno eléctrico integrable 70L inox con autolimpieza Hydro, temporizador digital, 7 funciones de cocción, grill y ventilador de calor envolvente. Clase A.",
    priceCurrent: 235.72, priceOld: 399.00,
    externalUrl: "https://www.pccomponentes.com/horno-electrico-teka-hbb-6050-ss-70l-inoxido-hydro-integrado-temporizador-digital",
    inStock: true,
  },

  // ── Bosch ──────────────────────────────────────────────────────────────────
  {
    slug: "horno-electrico-bosch-serie-4-hqa514es3-71-litros-inox-vapor-anadido-3d-hotair-y-guias-telescopicas",
    name: "Horno Eléctrico Bosch Serie 4 HQA514ES3 71 Litros Inox Vapor Añadido 3D Hotair y Guías Telescópicas",
    brand: "Bosch", model: "HQA514ES3",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929565/1868-horno-electrico-bosch-serie-4-hqa514es3-71-litros-inox-vapor-anadido-3d-hotair-y-guias-telescopicas-opiniones.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929565/1868-horno-electrico-bosch-serie-4-hqa514es3-71-litros-inox-vapor-anadido-3d-hotair-y-guias-telescopicas-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929565/2891-horno-electrico-bosch-serie-4-hqa514es3-71-litros-inox-vapor-anadido-3d-hotair-y-guias-telescopicas-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929565/3470-horno-electrico-bosch-serie-4-hqa514es3-71-litros-inox-vapor-anadido-3d-hotair-y-guias-telescopicas-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929565/4635-horno-electrico-bosch-serie-4-hqa514es3-71-litros-inox-vapor-anadido-3d-hotair-y-guias-telescopicas-61826150-2142-45c2-b3a0-e548311601ed.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1092/10929565/5526-horno-electrico-bosch-serie-4-hqa514es3-71-litros-inox-vapor-anadido-3d-hotair-y-guias-telescopicas-0f6ad059-5482-4c51-b8d8-a6fee62c471b.jpg",
    ],
    rating: 4.2, reviewCount: 5,
    description: "Horno eléctrico integrable 71L inox con función vapor añadido, 3D Hotair, guías telescópicas, 10 funciones de cocción, autolimpieza pirolítica y display TFT. Clase A+.",
    priceCurrent: 359.00, priceOld: 396.00,
    externalUrl: "https://www.pccomponentes.com/horno-electrico-bosch-serie-4-hqa514es3-71-litros-inox-vapor-anadido-3d-hotair-y-guias-telescopicas",
    inStock: true,
  },
  {
    slug: "horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro",
    name: "Horno Multifunción Bosch Serie 6 HBG578ES3 Pirolítico 71L 60cm 3D Hotair Acero Inoxidable Negro",
    brand: "Bosch", model: "HBG578ES3",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/1293-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-1d306299-7ed7-49c7-8f6e-3c5f25e39b42.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/1293-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-1d306299-7ed7-49c7-8f6e-3c5f25e39b42.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/2674-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-718f2eb2-0a85-459c-a2e5-bd0cffc006ca.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/3709-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-6c6f2005-e0fa-458b-91e7-f8d70f27ee58.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/4862-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-d2857330-0a28-4e06-9bf2-c3798168160a.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/5119-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-19ed463a-8089-402b-ba47-d802e08e8303.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/6704-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-7f02e917-ee6f-4f52-b0cc-9a7f99d77ce1.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/7785-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-0282affa-dc91-4e03-abe1-d726b1f5731c.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/8139-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-1d6f2df3-593d-456f-83d2-fb585a2b381c.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/9807-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-1786611f-6344-494f-8849-23992006ff22.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10868532/10334-horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro-95748d50-cf91-4ed5-8bf1-be299b3b2aba.jpg",
    ],
    rating: 4.7, reviewCount: 29,
    description: "Horno multifunción integrable 71L inox/negro con limpieza pirolítica, 3D Hotair, 13 funciones de cocción, PerfectBake, display TFT y conexión Home Connect. Clase A+.",
    priceCurrent: 475.00, priceOld: 512.00,
    externalUrl: "https://www.pccomponentes.com/horno-multifuncion-bosch-serie-6-hbg578es3-pirolitico-71l-60cm-3d-hotair-acero-inoxidable-negro",
    inStock: true,
  },

  // ── Beko ───────────────────────────────────────────────────────────────────
  {
    slug: "beko-bbie12300xd-horno-multifuncion-72l-a-acero-inoxidable",
    name: "Beko BBIE12300XD Horno Multifunción 72L A Acero Inoxidable",
    brand: "Beko", model: "BBIE12300XD",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/36/362744/1951-beko-bbie12300xd-horno-multifuncion-72l-acero-inoxidable-opiniones.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/36/362744/1951-beko-bbie12300xd-horno-multifuncion-72l-acero-inoxidable-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/36/362744/2638-beko-bbie12300xd-horno-multifuncion-72l-acero-inoxidable-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/36/362744/3191-beko-bbie12300xd-horno-multifuncion-72l-acero-inoxidable-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/36/362744/475-beko-bbie12300xd-horno-multifuncion-72l-acero-inoxidable-427eb7de-a7a7-429f-a50d-71a421780ff0.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/36/362744/5872-beko-bbie12300xd-horno-multifuncion-72l-acero-inoxidable-700bacf5-efa2-4cd3-afe9-a1cd86664344.jpg",
    ],
    rating: 4.4, reviewCount: 24,
    description: "Horno multifunción integrable 72L acero inoxidable con 8 funciones de cocción, autolimpieza hidrolítica, grill, 5 alturas de parrilla y doble ventilador. Clase A.",
    priceCurrent: 239.00, priceOld: 299.00,
    externalUrl: "https://www.pccomponentes.com/beko-bbie12300xd-horno-multifuncion-72l-a-acero-inoxidable",
    inStock: true,
  },
  {
    slug: "beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-a-cristal-negro",
    name: "Beko BBSE12340XD Pack Horno Multifunción 72L Inox + Placa Inducción 3 Zonas A Cristal Negro",
    brand: "Beko", model: "BBSE12340XD",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/1628-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-95a70eb5-e80a-463c-ade5-f61b0baf4527.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/1628-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-95a70eb5-e80a-463c-ade5-f61b0baf4527.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/2384-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-d4624cec-58c3-4f62-96eb-c2f344781de5.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/3356-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-1e5f1763-70c2-416d-910e-5beaa5076660.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/4517-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-82805913-3775-43da-9e5e-bbadc73ba90a.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/5996-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-6f19db01-5016-44b9-b2f3-a8a5dcdf8aca.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/6642-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-98b655c7-f235-4112-86f1-4de3885e8ed9.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/7673-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-b46c5d2f-8217-4614-b4d7-c98ee08e4eea.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/8656-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-12da2507-7956-4e55-aced-8d3d40ba51e4.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/9193-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-67e9cc51-cff8-4ba2-98ce-3b61ed525869.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/35/357153/10450-beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-cristal-negro-eb7a879e-9c39-4e0e-8e09-cb43a5f6c2d9.jpg",
    ],
    rating: 4.6, reviewCount: 85,
    description: "Pack horno multifunción 72L inox + placa inducción 3 zonas cristal negro. Horno con 8 funciones, autolimpieza hidrolítica, grill y placa flexible con zona turbo. Clase A.",
    priceCurrent: 431.45, priceOld: 549.00,
    externalUrl: "https://www.pccomponentes.com/beko-bbse12340xd-pack-horno-multifuncion-72l-inox-placa-induccion-3-zonas-a-cristal-negro",
    inStock: true,
  },

  // ── Cecotec ────────────────────────────────────────────────────────────────
  {
    slug: "cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro",
    name: "Cecotec Bake&Toast 3090 Black Gyro Horno de Sobremesa 30L 1500W Negro",
    brand: "Cecotec", model: "03819",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/140-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/140-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/2820-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/3684-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/4653-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/5662-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/6362-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/7707-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro-eff9340e-3530-4e27-941f-47bf63804106.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/8872-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro-3085348a-7628-45d9-a4a3-6cd386230dd0.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/9702-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro-2fcb40d8-a3a7-4bce-9771-2e437e0ea91d.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10779870/10260-cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro-be330242-8310-4088-af02-aafc70373247.jpg",
    ],
    rating: 4.8, reviewCount: 21,
    description: "Horno de sobremesa 30L 1500W negro con función Gyro (asador giratorio), 10 modos de cocción, temperatura hasta 230°C, temporizador 60 min y pantalla LED. Sin instalación.",
    priceCurrent: 79.90, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/cecotec-baketoast-3090-black-gyro-horno-de-sobremesa-30l-1500w-negro",
    inStock: true,
  },
  {
    slug: "cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro",
    name: "Cecotec Bake&Toast 6090 Black Gyro Horno Convección de Sobremesa 60L 2200W Negro",
    brand: "Cecotec", model: "03822",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/1829-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/1829-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/2336-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/384-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/4519-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/5381-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/6802-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/7300-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro-e8a3b66e-e943-42ac-987f-e55f499e3e64.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/8493-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro-f4ca839a-57a2-435d-845a-8d141ecff415.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/9314-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro-7c79fbdd-88de-4006-8798-cf1cbca19dc3.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1076/10766460/10162-cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro-ccb3ab29-d1a6-4881-99f9-e63d3663e2e7.jpg",
    ],
    rating: 4.6, reviewCount: 40,
    description: "Horno de convección de sobremesa 60L 2200W negro con función Gyro, 12 modos de cocción, temperatura hasta 230°C, temporizador 90 min y pantalla LED. Sin instalación.",
    priceCurrent: 129.00, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/cecotec-baketoast-6090-black-gyro-horno-conveccion-de-sobremesa-60l-2200w-negro",
    inStock: true,
  },

  // ── Corberó ────────────────────────────────────────────────────────────────
  {
    slug: "corbero-cchm603x-horno-convencional-hidrolitico-70l-a-acero-inoxidable",
    name: "Corberó CCHM603X Horno Convencional Hidrolítico 70L A Acero Inoxidable",
    brand: "Corberó", model: "CCHM603X",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1073/10739535/1470-corbero-cchm603x-horno-convencional-hidrolitico-70l-a-acero-inoxidable-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1073/10739535/1470-corbero-cchm603x-horno-convencional-hidrolitico-70l-a-acero-inoxidable-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1073/10739535/2319-corbero-cchm603x-horno-convencional-hidrolitico-70l-a-acero-inoxidable-mejor-precio.jpg",
    ],
    rating: 4.6, reviewCount: 7,
    description: "Horno convencional integrable 70L acero inoxidable con autolimpieza hidrolítica, 9 funciones de cocción, grill, 5 alturas de parrilla y control analógico. Clase A.",
    priceCurrent: 157.99, priceOld: 229.00,
    externalUrl: "https://www.pccomponentes.com/corbero-cchm603x-horno-convencional-hidrolitico-70l-a-acero-inoxidable",
    inStock: true,
  },

  // ── Orbegozo ───────────────────────────────────────────────────────────────
  {
    slug: "horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led",
    name: "Horno Eléctrico Orbegozo HO 985 10L Negro Doble Cristal Temporizador LED",
    brand: "Orbegozo", model: "HO985",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886182/1747-horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886182/1747-horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886182/2476-horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886182/3772-horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886182/4300-horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886182/5379-horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886182/6180-horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886182/7750-horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1088/10886182/849-horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led-foto.jpg",
    ],
    rating: 2.8, reviewCount: 4,
    description: "Horno eléctrico de sobremesa 10L 900W negro con doble cristal, temporizador LED, 4 funciones de cocción, temperatura hasta 230°C y puerta de cristal. Sin instalación.",
    priceCurrent: 34.99, priceOld: 39.90,
    externalUrl: "https://www.pccomponentes.com/horno-electrico-orbegozo-ho-985-10l-negro-doble-cristal-temporizador-led",
    inStock: true,
  },

  // ── Candy ──────────────────────────────────────────────────────────────────
  {
    slug: "horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable",
    name: "Horno Convencional Candy Idea FIDCP X200 70L 60cm Hidrolítico A Grill Acero Inoxidable",
    brand: "Candy", model: "FIDCP X200",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/1660-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/1660-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/2355-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/3458-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/4853-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/5101-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/6371-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/7911-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/8477-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/9571-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable-ece48642-a91e-4804-9417-bda4450fb4a5.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1070/10707623/10508-horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable-81a1187c-1270-428c-a971-3efc38f55846.jpg",
    ],
    rating: 4.5, reviewCount: 21,
    description: "Horno convencional integrable 70L acero inoxidable con autolimpieza hidrolítica, grill, 8 funciones de cocción, pantalla digital y doble cristal extraíble. Clase A.",
    priceCurrent: 127.99, priceOld: 148.00,
    externalUrl: "https://www.pccomponentes.com/horno-convencional-candy-idea-fidcp-x200-70l-60cm-hidrolitico-a-grill-acero-inoxidable",
    inStock: true,
  },
  {
    slug: "pack-horno-encimera-candy-pci26pcxci633c-70-l-y-3-zonas",
    name: "Pack Horno + Encimera Candy PCI26PCXCI633C 70L y 3 Zonas",
    brand: "Candy", model: "PCI26PCXCI633C",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1095/10956583/1279-pack-horno-encimera-candy-pci26pcxci633c-70-l-y-3-zonas.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10956583/1279-pack-horno-encimera-candy-pci26pcxci633c-70-l-y-3-zonas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10956583/2540-horno-electrico-candy-pci26pcxci633c-70-l-inox-autolimpieza-hidrolitica-y-pirolitica-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10956583/3983-pack-horno-encimera-candy-pci26pcxci633c-70-l-y-3-zonas-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10956583/4640-pack-horno-encimera-candy-pci26pcxci633c-70-l-y-3-zonas-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10956583/515-pack-horno-encimera-candy-pci26pcxci633c-70-l-y-3-zonas-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10956583/6458-pack-horno-encimera-candy-pci26pcxci633c-70-l-y-3-zonas-opiniones.jpg",
    ],
    rating: 4.5, reviewCount: 0,
    description: "Pack horno + encimera de inducción Candy. Horno 70L con autolimpieza hidrolítica y pirolítica, 10 funciones, + encimera 3 zonas de inducción cristal negro. Clase A+.",
    priceCurrent: 404.22, priceOld: 499.00,
    externalUrl: "https://www.pccomponentes.com/pack-horno-encimera-candy-pci26pcxci633c-70-l-y-3-zonas",
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
        slug: p.slug, name: p.name, category: "HORNOS",
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
