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
    slug: "origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera",
    name: "Origial COOL&FREEZE MINI 85 L INOX Frigorífico Bajo Encimera 85L Clase E",
    brand: "Origial", model: "ORIMINI85LINE",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899064/1589-origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899064/1589-origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899064/2230-origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899064/3604-origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899064/4802-origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899064/5721-origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899064/6622-origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899064/7285-origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899064/8101-origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox-7e1bf91b-d588-49a3-a3a9-e5a2f109237c.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899064/9573-origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox-c201da83-9ad5-4f00-b997-179184d9d99a.jpg",
    ],
    rating: 4.4, reviewCount: 297,
    description: "Frigorífico bajo encimera 85L con zona Cold Zone (12L, 0 a -3°C), puerta reversible, control electrónico de temperatura, funcionamiento silencioso 40dB y clase energética E.",
    priceCurrent: 129.99, priceOld: 169.99,
    externalUrl: "https://www.pccomponentes.com/origial-coolfreeze-mini-85-l-inox-frigorifico-bajo-encimera-85-litros-e-inox",
    inStock: true,
  },
  {
    slug: "samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable",
    name: "Samsung RB38C607AS9 Frigorífico Combi A 387L No Frost Total WiFi Acero Inoxidable",
    brand: "Samsung", model: "RB38C607AS9/EF",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1074/10745463/1353-samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable-f29ec465-4dac-4ee3-b8cf-f94719e88c4a.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1074/10745463/1353-samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable-f29ec465-4dac-4ee3-b8cf-f94719e88c4a.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1074/10745463/2844-samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable-1af98ebf-45fa-4b5b-87f6-2af356fcb682.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1074/10745463/333-samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable-fd4dbaab-d813-42c2-acee-a8301ecd9510.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1074/10745463/429-samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable-644e71b2-34b2-4aa3-b962-59078d82a43e.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1074/10745463/5198-samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable-687bc1bc-2f27-4d51-a873-6c6860771115.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1074/10745463/6864-samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable-6c5f8b68-8dee-4146-8980-8b0cbec7dc51.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1074/10745463/7128-samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable-704d59ce-3644-43d5-8aa4-1689573066b5.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1074/10745463/8644-samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable-639796fd-fb77-41db-ae6f-2b2f485b4c14.jpg",
    ],
    rating: 4.7, reviewCount: 103,
    description: "Frigorífico combi clase A con No Frost Total, 387L (273L nevera + 114L congelador), WiFi SmartThings, cajón Optimal Fresh+, cajón Humidity Fresh+, 35dB y puertas reversibles.",
    priceCurrent: 889.00, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/samsung-rb38c607as9-frigorifico-combi-a-acero-inoxidable",
    inStock: true,
  },
  {
    slug: "origial-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera",
    name: "Origial COOL&FREEZE MINI 85 L BLACK Frigorífico Bajo Encimera 85L Clase E Negro",
    brand: "Origial", model: "ORIMINI85LBE",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899065/1779-oirigal-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899065/1779-oirigal-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899065/2375-oirigal-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899065/3554-oirigal-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899065/4794-oirigal-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899065/591-oirigal-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899065/6812-oirigal-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899065/719-oirigal-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899065/8387-oirigal-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro-a197b2af-3654-4269-9b99-1985ebaa8ef5.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899065/9270-oirigal-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro-6ccdbc54-d737-4cc6-8ddb-ddd6dbdade25.jpg",
    ],
    rating: 4.4, reviewCount: 297,
    description: "Frigorífico bajo encimera 85L negro con zona Cold Zone (12L), puerta reversible, control electrónico de temperatura, 40dB y clase energética E.",
    priceCurrent: 139.99, priceOld: 174.99,
    externalUrl: "https://www.pccomponentes.com/origial-coolfreeze-mini-85-l-black-frigorifico-bajo-encimera-85-litros-e-negro",
    inStock: true,
  },
  {
    slug: "hisense-rb440n4aca-frigorifico-combi-no-frost-201cm-336l",
    name: "Hisense RB440N4ACA Frigorífico Combi No Frost 201cm 336L Clase A Inox Puertas Reversibles",
    brand: "Hisense", model: "RB440N4ACA",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1089/10892766/14-frigorifico-hisense-combi-no-frost-201cm-336l-a-inox-puertas-reversibles-rapido-enfriamiento.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10892766/14-frigorifico-hisense-combi-no-frost-201cm-336l-a-inox-puertas-reversibles-rapido-enfriamiento.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10892766/2435-frigorifico-hisense-combi-no-frost-201cm-336l-a-inox-puertas-reversibles-rapido-enfriamiento-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10892766/3753-frigorifico-hisense-combi-no-frost-201cm-336l-a-inox-puertas-reversibles-rapido-enfriamiento-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10892766/4870-frigorifico-hisense-combi-no-frost-201cm-336l-a-inox-puertas-reversibles-rapido-enfriamiento-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10892766/5152-frigorifico-hisense-combi-no-frost-201cm-336l-a-inox-puertas-reversibles-rapido-enfriamiento-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10892766/6304-frigorifico-hisense-combi-no-frost-201cm-336l-a-inox-puertas-reversibles-rapido-enfriamiento-opiniones.jpg",
    ],
    rating: 4.7, reviewCount: 33,
    description: "Frigorífico combi clase A con No Frost Total, 336L (238L nevera + 98L congelador), 201cm, puertas reversibles, función enfriamiento rápido, iluminación LED y 35dB.",
    priceCurrent: 699.00, priceOld: null,
    externalUrl: "https://www.pccomponentes.com/frigorifico-hisense-combi-no-frost-201cm-336l-a-inox-puertas-reversibles-rapido-enfriamiento",
    inStock: true,
  },
  {
    slug: "origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco",
    name: "Origial COOL&FREEZE MINI 46 WHITE Frigorífico Mini 46L Clase E Blanco",
    brand: "Origial", model: "ORIMINI46LWE",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/1687-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/1687-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/2765-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/3329-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/4882-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/5996-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/655-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/7454-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/8972-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-16d93031-1ab8-4c68-b5da-fa51a2e17139.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/9274-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-3c2a6bdd-25dc-4555-9ee8-92fed11dc1d8.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1084/10842992/10227-origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco-48d713dc-e2e3-415f-9dc0-8cc031f493e1.jpg",
    ],
    rating: 4.7, reviewCount: 56,
    description: "Mini frigorífico 46L con zona Cold Zone (4L, 0 a -3°C), temperatura 2-8°C, puerta reversible, silencioso 41dB, clase E y 3 años de garantía en compresor.",
    priceCurrent: 99.00, priceOld: 129.91,
    externalUrl: "https://www.pccomponentes.com/origial-coolfreeze-mini-46-white-frigorifico-mini-e-blanco",
    inStock: true,
  },
  {
    slug: "origial-coolfreeze-185-essential-inox-frigorifico-combi-no-frost",
    name: "Origial COOL&FREEZE 185 Essential INOX Frigorífico Combi Total No Frost 310L Clase E",
    brand: "Origial", model: "ORICOMBI185NFIN-ESS",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/1620-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/1620-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/2277-origial-coolfreeze-185-essential-inox-frigorifico-combi-total-no-frost-e-acero-inoxidable-b661d04f-d75b-4895-bbb6-54fc21f51a7e.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/2101-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/3784-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/4251-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/558-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/677-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/7683-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/8871-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable-c4d6f84e-2d2f-4ca4-8b15-cbea80908b67.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/926-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable-672bd472-b708-42e2-b464-c5e9b269cbe6.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773117/10722-origial-coolfreeze-185-essential-inox-frigorifico-combi-e-acero-inoxidable-6f9c23ba-a6a7-4a7e-ab94-610ccf7496b6.jpg",
    ],
    rating: 4.5, reviewCount: 714,
    description: "Combi 185cm Total No Frost, 310L (218L nevera + 92L congelador), clase E, iluminación LED, puertas reversibles, 41dB y congelación rápida 4.15kg/24h.",
    priceCurrent: 322.00, priceOld: 399.00,
    externalUrl: "https://www.pccomponentes.com/origial-coolfreeze-185-essential-inox-frigorifico-combi-total-no-frost-e-acero-inoxidable",
    inStock: true,
  },
  {
    slug: "origial-coolfreeze-185-essential-white-frigorifico-combi-no-frost",
    name: "Origial COOL&FREEZE 185 Essential WHITE Frigorífico Combi Total No Frost 310L Clase E Blanco",
    brand: "Origial", model: "ORICOMBI185NFW-ESS",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/1970-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/1970-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/2345-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/2858-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-6291fd3b-9fb8-4bd4-80f0-f6cde165eaf8.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/3929-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-ea562311-de05-44f0-8851-64f39603d3a4.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/4600-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-4a4b1609-ca41-45a7-923d-ab64ee3c86b7.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/5432-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-299c9b86-7460-4982-88dd-d5bbcca499ac.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/6975-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-8dbcf3c5-d442-40a8-8636-e3ea33f52d92.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/74-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-782f5069-7212-4813-ae63-74c47838d222.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/8805-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-37f788aa-5af9-4c52-b0e0-948273980c0a.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/9279-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-1ec472fb-3116-43ca-977c-22671df35e92.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1077/10773114/10463-origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco-a8f317b5-d054-419f-b466-24d312f941ce.jpg",
    ],
    rating: 4.5, reviewCount: 714,
    description: "Combi 185cm Total No Frost, 310L (218L nevera + 92L congelador), clase E, iluminación LED, puertas reversibles, 41dB y congelación rápida 4.15kg/24h. Color blanco.",
    priceCurrent: 310.00, priceOld: 369.90,
    externalUrl: "https://www.pccomponentes.com/origial-coolfreeze-185-essential-white-frigorifico-combi-total-no-frost-e-blanco",
    inStock: true,
  },
  {
    slug: "teka-nfl-342-c-frigorifico-combi-no-frost-e-inox",
    name: "Teka NFL 342 C Frigorífico Combi Total No Frost 295L Clase E Acero Inoxidable",
    brand: "Teka", model: "NFL 342 C INOX",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/27/273152/teka-nfl-342-c-frigorifico-combi-total-no-frost-a-acero-inoxidable-review.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273152/teka-nfl-342-c-frigorifico-combi-total-no-frost-a-acero-inoxidable-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273152/teka-nfl-342-c-frigorifico-combi-total-no-frost-a-acero-inoxidable-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273152/teka-nfl-342-c-frigorifico-combi-total-no-frost-a-acero-inoxidable-1aca34b5-5783-467e-adb8-483f165c5a17.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273152/teka-nfl-342-c-frigorifico-combi-total-no-frost-a-acero-inoxidable-652e50cb-2a01-4170-b2a7-64a2b58066e7.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273152/teka-nfl-342-c-frigorifico-combi-total-no-frost-a-acero-inoxidable-7a1fff41-9f6e-47ef-8fb5-341af76b5cae.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273152/teka-nfl-342-c-frigorifico-combi-total-no-frost-a-acero-inoxidable-d520300d-19a2-4f4d-ae6a-396a0567025c.jpg",
    ],
    rating: 4.8, reviewCount: 7,
    description: "Combi Total No Frost 295L (219L nevera + 76L congelador), clase E, cajón FreshBox, iluminación LED, 3 estantes de vidrio, puertas reversibles antihuella, control electrónico.",
    priceCurrent: 381.98, priceOld: 448.04,
    externalUrl: "https://www.pccomponentes.com/teka-nfl-342-c-frigorifico-combi-total-no-frost-e-acero-inoxidable",
    inStock: true,
  },
  {
    slug: "origial-oricombi202nfin-frigorifico-combi-no-frost-340l",
    name: "Origial ORICOMBI202NFIN Frigorífico Combi Total No Frost 340L 202cm Clase E Inox",
    brand: "Origial", model: "ORICOMBI202NFIN",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1086/10861566/1969-origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10861566/1969-origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10861566/2289-origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox-36c37c54-e7ea-44c5-a304-98687f4d8bb3.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10861566/3490-origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox-ee1840f5-8fbf-4000-bd33-77a36bf9f9fe.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10861566/4729-origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox-86b59a47-b111-49aa-b979-e61303d1197a.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10861566/5951-origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox-714d9531-2846-4916-b469-c37467c03364.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10861566/6100-origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox-356fd49e-7782-4a01-aef4-42bee95df4b3.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10861566/7655-origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox-4db0c96f-c75f-42aa-8812-2f1c46558496.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10861566/8225-origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox-f78942a7-ec25-49b9-84cc-0a6553f92c5a.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10861566/946-origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox-2af8aeaf-07da-43e2-be8e-d654306ad2bf.jpg",
    ],
    rating: 4.7, reviewCount: 35,
    description: "Combi 202cm Total No Frost, 340L (248L nevera + 92L congelador), clase E, control electrónico, iluminación LED, 40dB, congelación rápida 5kg/24h y 36 meses de garantía.",
    priceCurrent: 352.00, priceOld: 459.99,
    externalUrl: "https://www.pccomponentes.com/origial-oricombi202nfin-frigorifico-combi-total-no-frost-clase-e-inox",
    inStock: true,
  },
  {
    slug: "teka-nfl-342-c-frigorifico-combi-no-frost-e-blanco",
    name: "Teka NFL 342 C Frigorífico Combi Total No Frost 310L Clase E Blanco",
    brand: "Teka", model: "NFL 342 C WHITE",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/27/273146/1980-teka-nfl-342-c-frigorifico-combi-total-no-frost-e-blanco-opiniones.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273146/1980-teka-nfl-342-c-frigorifico-combi-total-no-frost-e-blanco-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273146/2588-teka-nfl-342-c-frigorifico-combi-total-no-frost-e-blanco-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273146/3782-teka-nfl-342-c-frigorifico-combi-total-no-frost-e-blanco-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273146/4426-teka-nfl-342-c-frigorifico-combi-total-no-frost-e-blanco-a5ec628a-fea9-44b9-8a7d-9e64592ad942.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273146/5851-teka-nfl-342-c-frigorifico-combi-total-no-frost-e-blanco-6eb8f26e-f49b-4bc2-97a7-663480526c61.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273146/6151-teka-nfl-342-c-frigorifico-combi-total-no-frost-e-blanco-e54c6279-9375-47d5-87d5-f779ba744c7d.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273146/7909-teka-nfl-342-c-frigorifico-combi-total-no-frost-e-blanco-d32fff94-2cbf-491e-bd9d-790a4271554a.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/27/273146/8909-teka-nfl-342-c-frigorifico-combi-total-no-frost-e-blanco-f63cc4c5-0560-4d90-9142-83dfe37aa089.jpg",
    ],
    rating: 4.6, reviewCount: 26,
    description: "Combi Total No Frost 310L, clase E, control electrónico, cajón FreshBox, iluminación LED, puertas reversibles, funciones enfriamiento y congelación rápida, 42dB. Color blanco.",
    priceCurrent: 348.99, priceOld: 396.00,
    externalUrl: "https://www.pccomponentes.com/teka-nfl-342-c-frigorifico-combi-total-no-frost-e-blanco",
    inStock: true,
  },
  {
    slug: "origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera",
    name: "Origial COOL&FREEZE MINI 85 L WHITE Frigorífico Bajo Encimera 85L Clase E Blanco",
    brand: "Origial", model: "ORIMINI85LWE",
    image: "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899063/1325-origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco-comprar.jpg",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899063/1325-origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899063/2284-origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899063/319-origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899063/4899-origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899063/519-origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899063/6226-origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899063/7125-origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899063/8732-origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco-a5543740-2c60-4fe1-bc5c-3c91bb8b1da5.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10899063/9194-origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco-28424073-4cd9-451d-aa76-849cd28280ec.jpg",
    ],
    rating: 4.4, reviewCount: 297,
    description: "Frigorífico bajo encimera 85L blanco con zona Cold Zone (12L), puerta reversible, control electrónico de temperatura, 40dB y clase energética E.",
    priceCurrent: 125.00, priceOld: 165.00,
    externalUrl: "https://www.pccomponentes.com/origial-coolfreeze-mini-85-l-white-frigorifico-bajo-encimera-85-litros-e-blanco",
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
