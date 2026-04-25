import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const xiaomiImages = [
  "https://m.media-amazon.com/images/I/51PLQ-Xf9sL._AC_SL1000_.jpg",
  "https://m.media-amazon.com/images/I/71KgvN75T8L._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/71BzuRcFPCL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/71uIW+uSUnL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/71HtZJqOw3L._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/712ytTN1AkL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/61AzxMKQBRL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/71bH4iH0FIL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/71kgk6zSmNL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/71S+-Ti27XL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/717q-+HsEVL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/71PjagRQNwL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/81q3jJUOl9L._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/61VBJroofgL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/71PCSBH2UGL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/81jGn67jtNL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/61Nf+q-KmtL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/61TbRu2RbSL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/51z9DgkNePL._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/61pzvgS9-+L._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/71Y72kM+r6L._AC_SL1500_.jpg",
  "https://m.media-amazon.com/images/I/51J0xUskXPL._AC_SL1451_.jpg",
];

async function main() {
  console.log("🌱 Insertando productos...");

  await prisma.product.upsert({
    where: { slug: "xiaomi-tv-f-65-2025" },
    update: {
      image: xiaomiImages[0],
      images: xiaomiImages,
      rating: 4.4,
      reviewCount: 4471,
    },
    create: {
      slug: "xiaomi-tv-f-65-2025",
      name: "Xiaomi TV F 65",
      category: "TELEVISORES",
      brand: "Xiaomi",
      model: "TV F 65",
      image: xiaomiImages[0],
      images: xiaomiImages,
      rating: 4.4,
      reviewCount: 4471,
      description:
        "65 Pulgadas (165 cm), 4K UHD, Smart TV, Fire OS 8, Control por Voz Alexa, HDR10, MEMC, Modo Game Boost 120Hz, 2GB+32GB, Compatible con Apple AirPlay. Clase de eficiencia energética F.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 389.0,
          priceOld: null,
          discountPercent: null,
          externalUrl:
            "https://www.amazon.es/XIAOMI-Pulgadas-Control-Compatible-AirPlay/dp/B0F457MQCQ/",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Xiaomi TV F 65 insertada con 21 imágenes");

  const tclImages = [
    "https://m.media-amazon.com/images/I/71PLhWlL7+L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71sD+DtXUsL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/619ENSdpybL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71NdABH1wzL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71HARv4N4QL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71y4jMb-4DL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61eyO1jGasL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/712yyKdonCL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71TYV6BxtWL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61Ac3kQdHTL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51o4ybkPo0L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/719cLigXdWL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51EPlIBrxcL._AC_SL1134_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "tcl-55t6c-qled-55" },
    update: {
      image: tclImages[0],
      images: tclImages,
      rating: 4.0,
      reviewCount: 757,
    },
    create: {
      slug: "tcl-55t6c-qled-55",
      name: "TCL 55T6C QLED 4K 55\"",
      category: "TELEVISORES",
      brand: "TCL",
      model: "55T6C",
      image: tclImages[0],
      images: tclImages,
      rating: 4.0,
      reviewCount: 757,
      description:
        "55 Pulgadas QLED 4K HDR, Fire TV, Dolby Vision, Dolby Atmos, HDR10+, Control por Voz Alexa. Clase de eficiencia energética F.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 329.0,
          priceOld: 379.0,
          discountPercent: 13,
          externalUrl: "https://amzn.to/4dsJIME",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ TCL 55T6C insertada");

  const tcl50Images = [
    "https://m.media-amazon.com/images/I/71mAaLFGFxL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71aoPb4MyeL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61mqkGL6B0L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71u4q2BifgL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71PO1q-trjL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71x07A4fI3L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71IqpRCjryL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71pMSr1D4qL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71+37WixZwL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71h5ay9HePL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61eyO1jGasL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71cc4C7pUlL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61zvbJeWhBL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71Mouei74FL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/518ka4ThNRL._AC_SL1134_.jpg",
  ];

  const tcl50Product = await prisma.product.upsert({
    where: { slug: "tcl-50v6c-google-tv-50" },
    update: {
      image: tcl50Images[0],
      images: tcl50Images,
      rating: 4.4,
      reviewCount: 2583,
    },
    create: {
      slug: "tcl-50v6c-google-tv-50",
      name: 'TCL 50V6C 50" 4K UHD Google TV',
      category: "TELEVISORES",
      brand: "TCL",
      model: "50V6C",
      image: tcl50Images[0],
      images: tcl50Images,
      rating: 4.4,
      reviewCount: 2583,
      description:
        "50 Pulgadas 4K UHD, Direct LED, Google TV, Dolby Audio, Motion Clarity, HDR10, Google Assistant & Alexa, AiPQ Processor. Clase de eficiencia energética E.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 299.0,
          priceOld: 399.0,
          discountPercent: 25,
          externalUrl: "https://amzn.to/3PPVxm7",
          inStock: true,
        },
      },
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: tcl50Product.id, store: "Amazon" } },
    update: { priceCurrent: 299.0, priceOld: 399.0, discountPercent: 25, inStock: true },
    create: {
      productId: tcl50Product.id, store: "Amazon",
      priceCurrent: 299.0, priceOld: 399.0, discountPercent: 25,
      externalUrl: "https://amzn.to/3PPVxm7", inStock: true,
    },
  });

  console.log("✅ TCL 50V6C insertada");

  const tcl65Images = [
    "https://m.media-amazon.com/images/I/71GZ1+KYOtL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71h8B88WlgL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61BtJlESCWL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71bb+7XK7mL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71M8Q5xa7wL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71DVmwm0ApL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71jS7mikDxL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71lJHnW6YsL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71n3UROKOvL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71bHI0+AR2L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71vhV-QmZoL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71yG8qQDJOL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71PPpbO2n6L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/717rWkkvIaL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71h0qF-O8TL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51b2svtavgL._AC_SL1135_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "tcl-65pf650-fire-tv-65" },
    update: {
      image: tcl65Images[0],
      images: tcl65Images,
      rating: 4.2,
      reviewCount: 1291,
    },
    create: {
      slug: "tcl-65pf650-fire-tv-65",
      name: 'TCL 65PF650 65" 4K UHD Fire TV',
      category: "TELEVISORES",
      brand: "TCL",
      model: "65PF650",
      image: tcl65Images[0],
      images: tcl65Images,
      rating: 4.2,
      reviewCount: 1291,
      description:
        "65 Pulgadas 4K UHD Smart TV, Fire TV, Dolby Vision, Dolby Atmos, DTS, HDR 10, Alexa Integrado, Airplay2, Miracast. Clase de eficiencia energética F.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 389.0,
          priceOld: 412.36,
          discountPercent: 6,
          externalUrl: "https://amzn.to/4bOBm0x",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ TCL 65PF650 insertada");

  const tcl65T69Images = [
    "https://m.media-amazon.com/images/I/71XFGd3xyRL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71TtjvwqA9L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/612th0SQUqL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71xp0JW0+TL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71THxMtSbfL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71aT6B-V-YL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71XDjZ66LcL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61tkTjRZTbL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71kU4Iimr+L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71CW2AE5APL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/618Ys4bmPHL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71xlAJI6kbL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/711UOvViP5L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71Ug59Nx9GL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51wEjt2s3CL._AC_SL1089_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "tcl-65t69c-qled-google-tv-65" },
    update: {
      image: tcl65T69Images[0],
      images: tcl65T69Images,
      rating: 4.2,
      reviewCount: 460,
    },
    create: {
      slug: "tcl-65t69c-qled-google-tv-65",
      name: 'TCL 65T69C 65" QLED 4K Google TV',
      category: "TELEVISORES",
      brand: "TCL",
      model: "65T69C",
      image: tcl65T69Images[0],
      images: tcl65T69Images,
      rating: 4.2,
      reviewCount: 460,
      description:
        "65 Pulgadas QLED Direct LED TV, 4K HDR, Google TV, Dolby Vision, Dolby Atmos, Game Master, Motion Clarity, AiPQ Processor, Google Assistant, Alexa. Clase de eficiencia energética F.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 492.31,
          priceOld: 649.0,
          discountPercent: 24,
          externalUrl: "https://amzn.to/4sjeLOB",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ TCL 65T69C insertada");

  const xiaomi32Images = [
    "https://m.media-amazon.com/images/I/51rExJmgkIL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/7106RBeSB4L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71CkfpmonqL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71kySC0+BWL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71gLTse9xiL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71bYpq33wiL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71-F4SpZeoL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71dfqTaddrL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81GRlcC9TlL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/615n1MKGEIL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61Nf+q-KmtL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61TbRu2RbSL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51AVLYi-sgL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61+1L6Q6zhL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/717H1mGKWTL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/5112qF+ICwL._AC_SL1456_.jpg",
  ];

  const xiaomi32Product = await prisma.product.upsert({
    where: { slug: "xiaomi-tv-f-32-2026" },
    update: {
      image: xiaomi32Images[0],
      images: xiaomi32Images,
      rating: 4.4,
      reviewCount: 4917,
    },
    create: {
      slug: "xiaomi-tv-f-32-2026",
      name: "Xiaomi TV F 32",
      category: "TELEVISORES",
      brand: "Xiaomi",
      model: "TV F 32",
      image: xiaomi32Images[0],
      images: xiaomi32Images,
      rating: 4.4,
      reviewCount: 4917,
      description:
        "32 Pulgadas (81 cm), HD, Smart TV, Fire OS 7, Control por Voz Alexa, Dolby Audio, DTS Virtual:X, DTS-HD, Compatible con Apple AirPlay, 120Hz. Clase de eficiencia energética F.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 138.99,
          priceOld: 149.0,
          discountPercent: 7,
          externalUrl: "https://amzn.to/48b2FQi",
          inStock: true,
        },
      },
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: xiaomi32Product.id, store: "Amazon" } },
    update: { priceCurrent: 138.99, priceOld: 149.0, discountPercent: 7, inStock: true },
    create: {
      productId: xiaomi32Product.id, store: "Amazon",
      priceCurrent: 138.99, priceOld: 149.0, discountPercent: 7,
      externalUrl: "https://amzn.to/48b2FQi", inStock: true,
    },
  });

  console.log("✅ Xiaomi TV F 32 insertada");

  const xiaomi50Images = [
    "https://m.media-amazon.com/images/I/51jeQMr89uL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/71KgvN75T8L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71WO4qspWzL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71s-9Ep4f1L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71UoWLUPKCL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71sC40Y2FDL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61d8w5bcrrL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71V-olaHBXL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71nLLK1s1bL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71FpISHEo4L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71gNQW2kI5L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71VgbyZl2gL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81c2HyxCfdL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61IkmN+eq6L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71cdUdVvrFL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81IQIDsNfFL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61Nf+q-KmtL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61RfuRee3cL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51zpErze8ML._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61XM728jPFL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71J46Hb1kEL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51NC2O9y7uL._AC_SL1451_.jpg",
  ];

  const xiaomi50Product = await prisma.product.upsert({
    where: { slug: "xiaomi-tv-f-50-2026" },
    update: {
      image: xiaomi50Images[0],
      images: xiaomi50Images,
      rating: 4.4,
      reviewCount: 4917,
    },
    create: {
      slug: "xiaomi-tv-f-50-2026",
      name: "Xiaomi TV F 50",
      category: "TELEVISORES",
      brand: "Xiaomi",
      model: "TV F 50",
      image: xiaomi50Images[0],
      images: xiaomi50Images,
      rating: 4.4,
      reviewCount: 4917,
      description:
        "50 Pulgadas (127 cm), 4K UHD, Smart TV, Fire OS 8, Control por Voz Alexa, HDR10, MEMC, Modo Game Boost 120Hz, 2GB+32GB, Compatible con Apple AirPlay. Clase de eficiencia energética F.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 299.0,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4dZ5kAe",
          inStock: true,
        },
      },
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: xiaomi50Product.id, store: "Amazon" } },
    update: { priceCurrent: 299.0, priceOld: null, discountPercent: null, inStock: true },
    create: {
      productId: xiaomi50Product.id, store: "Amazon",
      priceCurrent: 299.0, priceOld: null, discountPercent: null,
      externalUrl: "https://amzn.to/4dZ5kAe", inStock: true,
    },
  });

  console.log("✅ Xiaomi TV F 50 insertada");

  const hisense43Images = [
    "https://m.media-amazon.com/images/I/81va194fc3L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/719xT0RTlDL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/91lqgnFj8WL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81oqzlXC+QL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81jCsDsFW1L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81sFCYfUJCL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61QLdUIakPL._AC_.jpg",
    "https://m.media-amazon.com/images/I/81JE8E96U7L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81wtAIOcUKL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71wQnaHR1eL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71zodEOfoDL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/913dPamk1xL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/91bxhsWJXrL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51Lr0U5NUPL._AC_SL1450_.jpg",
    "https://m.media-amazon.com/images/I/71QXRvI8oHL._AC_SL1500_.jpg",
  ];

  const hisense43Product = await prisma.product.upsert({
    where: { slug: "hisense-43e63qt-4k-43" },
    update: {
      image: hisense43Images[0],
      images: hisense43Images,
      rating: 4.4,
      reviewCount: 499,
    },
    create: {
      slug: "hisense-43e63qt-4k-43",
      name: 'Hisense 43E63QT 43" 4K UHD Smart TV',
      category: "TELEVISORES",
      brand: "Hisense",
      model: "43E63QT",
      image: hisense43Images[0],
      images: hisense43Images,
      rating: 4.4,
      reviewCount: 499,
      description:
        "43 Pulgadas UHD 4K, Smart TV, Dolby Vision, Game Mode Plus 60Hz VRR, DTS Virtual X, Control por Voz, Doble Control de Volumen, Auto Ordenación Canales TDT. Clase de eficiencia energética E.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 207.0,
          priceOld: 252.99,
          discountPercent: 18,
          externalUrl: "https://amzn.to/3NVCB4X",
          inStock: true,
        },
      },
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: hisense43Product.id, store: "Amazon" } },
    update: { priceCurrent: 207.0, priceOld: 252.99, discountPercent: 18, inStock: true },
    create: {
      productId: hisense43Product.id, store: "Amazon",
      priceCurrent: 207.0, priceOld: 252.99, discountPercent: 18,
      externalUrl: "https://amzn.to/3NVCB4X", inStock: true,
    },
  });

  console.log("✅ Hisense 43E63QT insertada");

  const lg50QNEDImages = [
    "https://m.media-amazon.com/images/I/81fyDgsB-HL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81O6yw9tlPL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81JSdOQlR5L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71Q2UmNWEuL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81sIVU7uD4L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/816nd+iQp4L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81dipQGH7UL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81wTv8T01VL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/713MnDotz3L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/717MhxyQwyL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71OzojNMliL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71NYej4EAxL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81lRXxNsrBL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81l0+JZ1SRL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81d8x5BfUVL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71wyYv6SKNL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "lg-50qned84a6c-qned-4k-50" },
    update: {
      image: lg50QNEDImages[0],
      images: lg50QNEDImages,
      rating: 4.4,
      reviewCount: 156,
    },
    create: {
      slug: "lg-50qned84a6c-qned-4k-50",
      name: 'LG 50QNED84A6C 50" QNED 4K Smart TV',
      category: "TELEVISORES",
      brand: "LG",
      model: "50QNED84A6C",
      image: lg50QNEDImages[0],
      images: lg50QNEDImages,
      rating: 4.4,
      reviewCount: 156,
      description:
        "50 Pulgadas QNED 4K, Smart TV WebOS 25, Super Upscaling, Dolby Vision, Dolby Atmos, Alexa, Google Assistant, Negro. Clase de eficiencia energética F.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 409.0,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4v5bRQd",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ LG 50QNED84A6C insertada");

  const haier55Images = [
    "https://m.media-amazon.com/images/I/81TBm89iVpL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51vD7zHLyWL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81RfP67V2CL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81e4zy1OV+L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81cGdtMSQdL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81JFrzSKE+L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81uHJkQKzWL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81pqEkmA4TL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51Y8IJsFpXL._AC_SL1134_.jpg",
    "https://m.media-amazon.com/images/I/71jsChhjdOL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "haier-h55k85fux-google-tv-55" },
    update: {
      image: haier55Images[0],
      images: haier55Images,
      rating: 4.2,
      reviewCount: 382,
    },
    create: {
      slug: "haier-h55k85fux-google-tv-55",
      name: 'Haier H55K85FUX 55" 4K UHD Google TV',
      category: "TELEVISORES",
      brand: "Haier",
      model: "H55K85FUX",
      image: haier55Images[0],
      images: haier55Images,
      rating: 4.2,
      reviewCount: 382,
      description:
        "55 Pulgadas Direct LED 4K UHD, Google TV, Dolby Audio, HDR10, Google Assistant, Bluetooth 5.1, DBX TV, HDMI 2.1 x4, Sin Marcos. Clase de eficiencia energética E.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 296.9,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4c02wAh",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Haier H55K85FUX insertada");

  const lg32Images = [
    "https://m.media-amazon.com/images/I/71UgTKuqOrL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61a5G+v9EjL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/91cE5Xm6I2L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81QpEAk3LoL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/713MnDotz3L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71x9DOcDpqL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61FW7uET28L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51GRoR49ePL._AC_SL1134_.jpg",
  ];

  const lg32Product = await prisma.product.upsert({
    where: { slug: "lg-32lr60006la-fhd-webos-32" },
    update: {
      image: lg32Images[0],
      images: lg32Images,
      rating: 4.4,
      reviewCount: 116,
    },
    create: {
      slug: "lg-32lr60006la-fhd-webos-32",
      name: 'LG 32LR60006LA 32" Full HD Smart TV',
      category: "TELEVISORES",
      brand: "LG",
      model: "32LR60006LA",
      image: lg32Images[0],
      images: lg32Images,
      rating: 4.4,
      reviewCount: 116,
      description:
        "32 Pulgadas FHD 1080p, Smart TV webOS 23, Procesador α5 AI Gen6, HDR10/HLG, Dolby Digital Plus, AI Sound, Google Assistant, Apple AirPlay, ThinQ, Bluetooth, Wi-Fi. Clase de eficiencia energética F.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 229.0,
          priceOld: 289.0,
          discountPercent: 21,
          externalUrl: "https://amzn.to/47HRdvr",
          inStock: true,
        },
      },
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: lg32Product.id, store: "Amazon" } },
    update: { priceCurrent: 229.0, priceOld: 289.0, discountPercent: 21, inStock: true },
    create: {
      productId: lg32Product.id, store: "Amazon",
      priceCurrent: 229.0, priceOld: 289.0, discountPercent: 21,
      externalUrl: "https://amzn.to/47HRdvr", inStock: true,
    },
  });

  console.log("✅ LG 32LR60006LA insertada");

  const lg50UA73Images = [
    "https://m.media-amazon.com/images/I/7170cK2ghlL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71d+4SJ42hL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/819PRdM+nvL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/819HOb3jztL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81IMdW+ifYL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/819Y2Xf0NTL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81LYzfeLnSL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71FIT1-zfkL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81wTv8T01VL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/713MnDotz3L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71fivLUp88L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71tbn2dqsjL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71Ur2p8KBXL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81ul-u4bSjL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/814ap8YK0sL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81gDXcJx3zL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71KXqJZGV6L._AC_SL1500_.jpg",
  ];

  const lg50UA73Product = await prisma.product.upsert({
    where: { slug: "lg-50ua73006la-uhd-webos25-50" },
    update: {
      image: lg50UA73Images[0],
      images: lg50UA73Images,
      rating: 4.4,
      reviewCount: 3556,
    },
    create: {
      slug: "lg-50ua73006la-uhd-webos25-50",
      name: 'LG 50UA73006LA 50" UHD 4K Smart TV',
      category: "TELEVISORES",
      brand: "LG",
      model: "50UA73006LA",
      image: lg50UA73Images[0],
      images: lg50UA73Images,
      rating: 4.4,
      reviewCount: 3556,
      description:
        "50 Pulgadas UHD 4K, WebOS 25, Ultimate IA, HDR10 Pro, Super Upscaling, Dolby Digital Plus, Google Assistant, Magic Remote, Negro. Clase de eficiencia energética G.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 316.9,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4t0JRM3",
          inStock: true,
        },
      },
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: lg50UA73Product.id, store: "Amazon" } },
    update: { priceCurrent: 316.9, priceOld: null, discountPercent: null, inStock: true },
    create: {
      productId: lg50UA73Product.id, store: "Amazon",
      priceCurrent: 316.9, priceOld: null, discountPercent: null,
      externalUrl: "https://amzn.to/4t0JRM3", inStock: true,
    },
  });

  console.log("✅ LG 50UA73006LA insertada");

  const lg43UA73Images = [
    "https://m.media-amazon.com/images/I/7170cK2ghlL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71lwrhHweNL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/819PRdM+nvL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/819HOb3jztL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81IMdW+ifYL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/819Y2Xf0NTL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81LYzfeLnSL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71FIT1-zfkL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81wTv8T01VL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/713MnDotz3L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71fivLUp88L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71Ur2p8KBXL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81ul-u4bSjL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/814ap8YK0sL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81gDXcJx3zL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71KXqJZGV6L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71jdl14VT0L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/517xQFUd6WL._AC_SL1134_.jpg",
  ];

  const lg43UA73Product = await prisma.product.upsert({
    where: { slug: "lg-43ua73006la-uhd-webos25-43" },
    update: {
      image: lg43UA73Images[0],
      images: lg43UA73Images,
      rating: 4.4,
      reviewCount: 3556,
    },
    create: {
      slug: "lg-43ua73006la-uhd-webos25-43",
      name: 'LG 43UA73006LA 43" UHD 4K Smart TV',
      category: "TELEVISORES",
      brand: "LG",
      model: "43UA73006LA",
      image: lg43UA73Images[0],
      images: lg43UA73Images,
      rating: 4.4,
      reviewCount: 3556,
      description:
        "43 Pulgadas UHD 4K, WebOS 25, Ultimate IA, HDR10 Pro, Super Upscaling, Dolby Digital Plus, Google Assistant, Cloud Gaming GeForce Now y Xbox, Magic Remote, Negro. Clase de eficiencia energética G.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 269.0,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/3NLAXCW",
          inStock: true,
        },
      },
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: lg43UA73Product.id, store: "Amazon" } },
    update: { priceCurrent: 269.0, priceOld: null, discountPercent: null, inStock: true },
    create: {
      productId: lg43UA73Product.id, store: "Amazon",
      priceCurrent: 269.0, priceOld: null, discountPercent: null,
      externalUrl: "https://amzn.to/3NLAXCW", inStock: true,
    },
  });

  console.log("✅ LG 43UA73006LA insertada");

  const tdSystems32Images = [
    "https://m.media-amazon.com/images/I/71HX2ZgkznL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/8109oA7LyWL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81LLKOPyCNL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/711eFS8EBvL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71vW3+BWl7L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71CBNePsAAL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71HfT-8ezrL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61KDnatnY1L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71GXOTOOjjL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/516xEq-BrwL._AC_SL1500_.jpg",
  ];

  const tdSystems32Product = await prisma.product.upsert({
    where: { slug: "td-systems-prime32c22tizen-32" },
    update: {
      image: tdSystems32Images[0],
      images: tdSystems32Images,
      rating: 4.4,
      reviewCount: 2218,
    },
    create: {
      slug: "td-systems-prime32c22tizen-32",
      name: 'TD Systems PRIME32C22TIZEN 32" Smart TV',
      category: "TELEVISORES",
      brand: "TD Systems",
      model: "PRIME32C22TIZEN",
      image: tdSystems32Images[0],
      images: tdSystems32Images,
      rating: 4.4,
      reviewCount: 2218,
      description:
        "32 Pulgadas Smart TV Samsung Tizen OS 8.0, Triple Tuner DVB-T2/C/S2, Samsung Smart TV Gaming Hub, HD Ready. Clase de eficiencia energética E.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 119.89,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/3PGfv2P",
          inStock: true,
        },
      },
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: tdSystems32Product.id, store: "Amazon" } },
    update: { priceCurrent: 119.89, priceOld: null, discountPercent: null, inStock: true },
    create: {
      productId: tdSystems32Product.id, store: "Amazon",
      priceCurrent: 119.89, priceOld: null, discountPercent: null,
      externalUrl: "https://amzn.to/3PGfv2P", inStock: true,
    },
  });

  console.log("✅ TD Systems PRIME32C22TIZEN insertada");

  const tdSystems40Product = await prisma.product.upsert({
    where: { slug: "td-systems-prime40c22tizen-40" },
    update: {
      image: tdSystems32Images[0],
      images: tdSystems32Images,
      rating: 4.4,
      reviewCount: 2218,
    },
    create: {
      slug: "td-systems-prime40c22tizen-40",
      name: 'TD Systems PRIME40C22TIZEN 40" Smart TV',
      category: "TELEVISORES",
      brand: "TD Systems",
      model: "PRIME40C22TIZEN",
      image: tdSystems32Images[0],
      images: tdSystems32Images,
      rating: 4.4,
      reviewCount: 2218,
      description:
        "40 Pulgadas Smart TV Samsung Tizen OS 8.0, Triple Tuner DVB-T2/C/S2, Samsung Smart TV Gaming Hub, Full HD. Clase de eficiencia energética E.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 169.89,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/3PGfv2P",
          inStock: true,
        },
      },
    },
  });

  await prisma.offer.upsert({
    where: { productId_store: { productId: tdSystems40Product.id, store: "Amazon" } },
    update: { priceCurrent: 169.89, priceOld: null, discountPercent: null, inStock: true },
    create: {
      productId: tdSystems40Product.id, store: "Amazon",
      priceCurrent: 169.89, priceOld: null, discountPercent: null,
      externalUrl: "https://amzn.to/3PGfv2P", inStock: true,
    },
  });

  console.log("✅ TD Systems PRIME40C22TIZEN insertada");

  const philips40Images = [
    "https://m.media-amazon.com/images/I/71yk75UB4gL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71iWVZtVTML._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61B-5GccWfL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51eLoNPWlmL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81JRQw1-rgL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81vEVdsMkpL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71ijh2wm+7L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71fZNWqgOpL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71r1d+cj6fL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51FXrLLtd6L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71ucooIpA8L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51Xs7spI2RL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61DzqfpWAzL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81MZNw9x0zL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "philips-40pfs6000-led-titan-os-40" },
    update: {
      image: philips40Images[0],
      images: philips40Images,
      rating: 4.3,
      reviewCount: 375,
    },
    create: {
      slug: "philips-40pfs6000-led-titan-os-40",
      name: 'Philips 40PFS6000 40" HD LED Smart TV',
      category: "TELEVISORES",
      brand: "Philips",
      model: "40PFS6000",
      image: philips40Images[0],
      images: philips40Images,
      rating: 4.3,
      reviewCount: 375,
      description:
        "40 Pulgadas HD LED Smart TV, Pixel Plus HD, Titan OS, Dolby Audio, HDR10, 120Hz, Alexa, Google Assistant, Diseño Compacto. Clase de eficiencia energética E.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 189.0,
          priceOld: 269.0,
          discountPercent: 30,
          externalUrl: "https://amzn.to/41f0aZv",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Philips 40PFS6000 insertada");

  const cecotec9kgImages = [
    "https://m.media-amazon.com/images/I/71+gu-5960L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71yFA0fxeOL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61E+4pXHyOL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71ZdIRRF1+L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/71zRQesvvoL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51ojnyl+YGL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/610IndKq-9L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61VR2MtXg8L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/718NLK74GiL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "cecotec-bolero-dresscode-9500-9kg" },
    update: {
      image: cecotec9kgImages[0],
      images: cecotec9kgImages,
      rating: 4.0,
      reviewCount: 1859,
    },
    create: {
      slug: "cecotec-bolero-dresscode-9500-9kg",
      name: "Cecotec Bolero Dresscode 9500 Inverter 9kg",
      category: "LAVADORAS",
      brand: "Cecotec",
      model: "Bolero Dresscode 9500",
      image: cecotec9kgImages[0],
      images: cecotec9kgImages,
      rating: 4.0,
      reviewCount: 1859,
      description:
        "Lavadora 9kg Carga Frontal, 1900W, 1400 rpm, Motor Inverter Plus, Bajo Consumo, 16 Programas, SteamMax, Delay Start, Blanco. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 329.0,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4cmJRjA",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Cecotec Bolero Dresscode 9500 insertada");

  const nilson6kgImages = [
    "https://m.media-amazon.com/images/I/51dqznFoZQL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61657acv34L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/517V2LWGV7L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/71kNYD7modL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61xjfKFMy6L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51MmjVsWZ3L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61++1iQcesL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/81t-JxAWj7L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61wgGg5MwtL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "nilson-nl6200ai-6kg" },
    update: {
      image: nilson6kgImages[0],
      images: nilson6kgImages,
      rating: 3.7,
      reviewCount: 163,
    },
    create: {
      slug: "nilson-nl6200ai-6kg",
      name: "Nilson NL6200AI Lavadora 6kg",
      category: "LAVADORAS",
      brand: "Nilson",
      model: "NL6200AI",
      image: nilson6kgImages[0],
      images: nilson6kgImages,
      rating: 3.7,
      reviewCount: 163,
      description:
        "Lavadora 6kg Carga Frontal Blanco, 1600W, 1200rpm, Motor Inverter, 11 Programas, Función Stop&Go, Tambor Diamante. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 219.9,
          priceOld: 239.9,
          discountPercent: 8,
          externalUrl: "https://amzn.to/4m9Mk4g",
          inStock: true,
        },
      },
    },
  });

  await prisma.offer.updateMany({
    where: { product: { slug: "nilson-nl6200ai-6kg" } },
    data: { externalUrl: "https://amzn.to/4m9Mk4g" },
  });
  console.log("✅ Nilson NL6200AI insertada");

  const cecotec9610Images = [
    "https://m.media-amazon.com/images/I/71MwgLfKWQL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81lezVVopUL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71hIfxXOxYL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/8131J18ZpTL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/511u0gSkvaL._AC_.jpg",
    "https://m.media-amazon.com/images/I/81Jw-K7OEWL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81ZhLn7LpeL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81ZX-P18giL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51fd1X01QWL._AC_.jpg",
    "https://m.media-amazon.com/images/I/81hGnRei67L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71tBjBrYH9L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/619h4IpE14L._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "cecotec-bolero-dresscode-9610-inverter-steel-9kg" },
    update: {
      image: cecotec9610Images[0],
      images: cecotec9610Images,
      rating: 3.8,
      reviewCount: 705,
    },
    create: {
      slug: "cecotec-bolero-dresscode-9610-inverter-steel-9kg",
      name: "Cecotec Bolero Dresscode 9610 Inverter Steel 9kg",
      category: "LAVADORAS",
      brand: "Cecotec",
      model: "Bolero Dresscode 9610",
      image: cecotec9610Images[0],
      images: cecotec9610Images,
      rating: 3.8,
      reviewCount: 705,
      description:
        "Lavadora 9kg Carga Frontal, 2000W, 1400 RPM, Bajo Consumo, Función Vapor, Motor Inverter Plus, 15 Programas, Optimiza Nivel de Agua y Lavado, Color Acero. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 359.0,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/47IIt8d",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Cecotec Bolero Dresscode 9610 insertada");

  const cecotec8450Images = [
    "https://m.media-amazon.com/images/I/71FYidrDIeL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61g+i40hTrL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/715I14ALg6L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61JX5eYagwL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/6125vl4WlzL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71-x+52bpBL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71xxIbK5-UL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61shxQpu9zL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61ZTXrEUfhL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61GRbNBqQRL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71w2OEaFrhL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71v4Rh9L+hL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61Rz+bCRR5L._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/614Us3tSu-L._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71Lqi7N5KJL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61q2AXV73SL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/51ldBHCsSHL._AC_.jpg",
    "https://m.media-amazon.com/images/I/6105HLGsNEL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "cecotec-bolero-dresscode-8450-inverter-steel-8kg" },
    update: {
      image: cecotec8450Images[0],
      images: cecotec8450Images,
      rating: 3.9,
      reviewCount: 50,
    },
    create: {
      slug: "cecotec-bolero-dresscode-8450-inverter-steel-8kg",
      name: "Cecotec Bolero DressCode 8450 Inverter Steel 8kg",
      category: "LAVADORAS",
      brand: "Cecotec",
      model: "Bolero DressCode 8450",
      image: cecotec8450Images[0],
      images: cecotec8450Images,
      rating: 3.9,
      reviewCount: 50,
      description:
        "Lavadora 8kg Carga Frontal, 1400 rpm, 16 Programas, Clase A-20%, Motor Inverter Plus, Allergy Care, Pearl Drum, Función Silence, Stop&Go, Kid Lock, Color Acero. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 291.9,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/3PZJKle",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Cecotec Bolero DressCode 8450 insertada");

  const cecotec7150Images = [
    "https://m.media-amazon.com/images/I/71WKgcb9xXL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/7117aAJWHoL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61saMnEOjDL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71wGTfFCEwL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61ruURETibL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/713wfQgGk0L._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71g7niFLwOL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71e15e6luhL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61gTPoqw6kL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61BMIHCORvL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61bN4NuJdwL._AC_SL1200_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "cecotec-bolero-dresscode-7150-inverter-7kg" },
    update: {
      image: cecotec7150Images[0],
      images: cecotec7150Images,
      rating: 3.9,
      reviewCount: 460,
    },
    create: {
      slug: "cecotec-bolero-dresscode-7150-inverter-7kg",
      name: "Cecotec Bolero Dresscode 7150 Inverter 7kg",
      category: "LAVADORAS",
      brand: "Cecotec",
      model: "Bolero Dresscode 7150",
      image: cecotec7150Images[0],
      images: cecotec7150Images,
      rating: 3.9,
      reviewCount: 460,
      description:
        "Lavadora 7kg Carga Frontal, 1400 rpm, 12 Programas, Clase A, Motor Inverter Plus, SteamMax, Drum Clean, Delay Start, Child Lock, Blanco. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 259.0,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4dZc6pE",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Cecotec Bolero Dresscode 7150 insertada");

  const bosch9kgImages = [
    "https://m.media-amazon.com/images/I/51QC8dCfJ6L._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61XT3tlYmRL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/714zuvd4mxL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51BY3cO0wBL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/51ZefFAXqLL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61Q7mdJdTxL._AC_SL1200_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "bosch-wgg244z0es-serie6-ecosilence-9kg" },
    update: {
      image: bosch9kgImages[0],
      images: bosch9kgImages,
      rating: 4.7,
      reviewCount: 37,
    },
    create: {
      slug: "bosch-wgg244z0es-serie6-ecosilence-9kg",
      name: "Bosch WGG244Z0ES Serie 6 EcoSilence 9kg",
      category: "LAVADORAS",
      brand: "Bosch",
      model: "WGG244Z0ES",
      image: bosch9kgImages[0],
      images: bosch9kgImages,
      rating: 4.7,
      reviewCount: 37,
      description:
        "Lavadora Libre Instalación 9kg, Serie 6, EcoSilence Drive, Blanco. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 469.0,
          priceOld: 749.0,
          discountPercent: 37,
          externalUrl: "https://amzn.to/4coe2Xz",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Bosch WGG244Z0ES insertada");

  const cecotec7150BlancoImages = [
    "https://m.media-amazon.com/images/I/71WKgcb9xXL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/7117aAJWHoL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61saMnEOjDL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71wGTfFCEwL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61ruURETibL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/713wfQgGk0L._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71g7niFLwOL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/71e15e6luhL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61gTPoqw6kL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61BMIHCORvL._AC_SL1200_.jpg",
    "https://m.media-amazon.com/images/I/61bN4NuJdwL._AC_SL1200_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "cecotec-bolero-dresscode-7150-inverter-blanco-7kg" },
    update: {
      image: cecotec7150BlancoImages[0],
      images: cecotec7150BlancoImages,
      rating: 3.9,
      reviewCount: 460,
    },
    create: {
      slug: "cecotec-bolero-dresscode-7150-inverter-blanco-7kg",
      name: "Cecotec Bolero Dresscode 7150 Inverter Blanco 7kg",
      category: "LAVADORAS",
      brand: "Cecotec",
      model: "Bolero Dresscode 7150",
      image: cecotec7150BlancoImages[0],
      images: cecotec7150BlancoImages,
      rating: 3.9,
      reviewCount: 460,
      description:
        "Lavadora 7kg Carga Frontal Blanco, 1400 rpm, 12 Programas, Clase A, Motor Inverter Plus, SteamMax, Drum Clean, Delay Start, Child Lock. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 259.0,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4meXLb2",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Cecotec Bolero Dresscode 7150 Blanco insertada");

  const cecotec8500Images = [
    "https://m.media-amazon.com/images/I/71BGsLw3L-L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71yFA0fxeOL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61WQ-w-ukhL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71ZdIRRF1+L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/71zRQesvvoL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51ojnyl+YGL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61o+Um3oPDL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61VR2MtXg8L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/71tVRS93jQL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "cecotec-bolero-dresscode-8500-inverter-8kg" },
    update: {
      image: cecotec8500Images[0],
      images: cecotec8500Images,
      rating: 4.0,
      reviewCount: 1859,
    },
    create: {
      slug: "cecotec-bolero-dresscode-8500-inverter-8kg",
      name: "Cecotec Bolero Dresscode 8500 Inverter 8kg",
      category: "LAVADORAS",
      brand: "Cecotec",
      model: "Bolero Dresscode 8500",
      image: cecotec8500Images[0],
      images: cecotec8500Images,
      rating: 4.0,
      reviewCount: 1859,
      description:
        "Lavadora 8kg Carga Frontal Blanco, 1900W, 1400 rpm, Motor Inverter Plus, Bajo Consumo, 16 Programas, SteamMax, Delay Start. Nº1 más vendido en Lavadoras. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 309.0,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4vb8tmN",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Cecotec Bolero Dresscode 8500 insertada");

  const corbero9kgImages = [
    "https://m.media-amazon.com/images/I/51G6WsuuetL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/719iGrGLtKL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61Yi3QQqzdL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61dWWMAFdXL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71LyOAsg9sL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61wymYMktYL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "corbero-clt9bl1423-9kg" },
    update: {
      image: corbero9kgImages[0],
      images: corbero9kgImages,
      rating: 4.2,
      reviewCount: 35,
    },
    create: {
      slug: "corbero-clt9bl1423-9kg",
      name: "Corbero CLT9BL1423 Lavadora 9kg",
      category: "LAVADORAS",
      brand: "Corbero",
      model: "CLT9BL1423",
      image: corbero9kgImages[0],
      images: corbero9kgImages,
      rating: 4.2,
      reviewCount: 35,
      description:
        "Lavadora 9kg Carga Frontal, 1400 rpm Inverter, 16 Programas, Vapor, Inicio Diferido, Lavado Rápido, Puerta XXL, Blanco. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 299.0,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/41KWi2x",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Corbero CLT9BL1423 insertada");

  const cecotec7500Images = [
    "https://m.media-amazon.com/images/I/71X8aARyrGL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71yFA0fxeOL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61Ht4rOfNiL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71ZdIRRF1+L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/71zRQesvvoL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51ojnyl+YGL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61mCgMQCqPL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61VR2MtXg8L._AC_SL1000_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "cecotec-bolero-dresscode-7500-inverter-7kg" },
    update: {
      image: cecotec7500Images[0],
      images: cecotec7500Images,
      rating: 4.0,
      reviewCount: 1859,
    },
    create: {
      slug: "cecotec-bolero-dresscode-7500-inverter-7kg",
      name: "Cecotec Bolero Dresscode 7500 Inverter 7kg",
      category: "LAVADORAS",
      brand: "Cecotec",
      model: "Bolero Dresscode 7500",
      image: cecotec7500Images[0],
      images: cecotec7500Images,
      rating: 4.0,
      reviewCount: 1859,
      description:
        "Lavadora 7kg Carga Frontal Blanco, 1850W, 1400 rpm, Motor Inverter Plus, Bajo Consumo, 16 Programas, SteamMax, Delay Start. Nº1 más vendido en Lavadoras. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 289.0,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4v9ZKBk",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Cecotec Bolero Dresscode 7500 insertada");

  const cecotec9500SteelImages = [
    "https://m.media-amazon.com/images/I/71eT08whQdL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61Eip6WQLxL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/71gzwx4zF8L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/613FmymLQ5L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61Clt5joJuL._AC_SL1001_.jpg",
    "https://m.media-amazon.com/images/I/51ojnyl+YGL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61Uuojum5SL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61VR2MtXg8L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/71m8H1z7C2L._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "cecotec-bolero-dresscode-9500-inverter-steel-9kg" },
    update: {
      image: cecotec9500SteelImages[0],
      images: cecotec9500SteelImages,
      rating: 4.0,
      reviewCount: 1859,
    },
    create: {
      slug: "cecotec-bolero-dresscode-9500-inverter-steel-9kg",
      name: "Cecotec Bolero Dresscode 9500 Inverter Steel 9kg",
      category: "LAVADORAS",
      brand: "Cecotec",
      model: "Bolero Dresscode 9500",
      image: cecotec9500SteelImages[0],
      images: cecotec9500SteelImages,
      rating: 4.0,
      reviewCount: 1859,
      description:
        "Lavadora 9kg Carga Frontal Acero, 1900W, 1400 rpm, Motor Inverter Plus, Bajo Consumo, 16 Programas, SteamMax, Delay Start. Nº1 más vendido en Lavadoras. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 338.9,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/41L3EmB",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Cecotec Bolero Dresscode 9500 Steel insertada");

  const chiq7kgImages = [
    "https://m.media-amazon.com/images/I/71XoUTqF9FL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/710O+z715CL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61RAq6oID5L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71JiG+8HK2L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71D5lJ+dBtL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/812V-2iL5cL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71EKWJWnd0L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61Lgq6O4KfL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/7158IwZf-9L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81bOxbQOliL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71cAhhz6QHL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71DvkVkFCRL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71D44+GRWyL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71-zmTWHcBL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61RytOaOc6L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61NnRBwqxRL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/612jd9JS8LL._AC_SL1147_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "chiq-cw07123863ax-7kg" },
    update: {
      image: chiq7kgImages[0],
      images: chiq7kgImages,
      rating: 4.0,
      reviewCount: 1581,
    },
    create: {
      slug: "chiq-cw07123863ax-7kg",
      name: "CHiQ CW07123863AX Lavadora 7kg",
      category: "LAVADORAS",
      brand: "CHiQ",
      model: "CW07123863AX",
      image: chiq7kgImages[0],
      images: chiq7kgImages,
      rating: 4.0,
      reviewCount: 1581,
      description:
        "Lavadora 7kg Carga Frontal Gris, Clase A, Motor Inverter BLDC 1200 RPM, Vapor, Lavado Rápido, 15 Programas, Diseño Compacto 60x46,5x84cm. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 269.99,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/3NVJseH",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ CHiQ CW07123863AX insertada");

  const candySmart10kgImages = [
    "https://m.media-amazon.com/images/I/71kjKd4KUCL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61jfZ6jPHgL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71n5SKfU1PL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71yGF9azfbL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71yPt91DlwL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71QWhDVi4pL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "candy-smart-cs14102de-10kg" },
    update: {
      image: candySmart10kgImages[0],
      images: candySmart10kgImages,
      rating: 4.1,
      reviewCount: 1035,
    },
    create: {
      slug: "candy-smart-cs14102de-10kg",
      name: "Candy Smart CS 14102DE 10kg",
      category: "LAVADORAS",
      brand: "Candy",
      model: "CS 14102DE/1-S",
      image: candySmart10kgImages[0],
      images: candySmart10kgImages,
      rating: 4.1,
      reviewCount: 1035,
      description:
        "Lavadora 10kg, 1400 RPM, Pantalla Digital y Mando, Tecnología NFC, Asistente de Voz, 15 Ciclos, 5 Rápidos, Planchado Fácil, Inicio Diferido 24H, Detector KG, Blanco. Clase de eficiencia energética E.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 309.0,
          priceOld: 349.0,
          discountPercent: 11,
          externalUrl: "https://amzn.to/4vpaGeC",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Candy Smart CS 14102DE insertada");

  const hisense9kgImages = [
    "https://m.media-amazon.com/images/I/71DnnFx87qL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71SAtflmsjL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/612ylbYaukL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71kS7fudbcL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71ilLug8GQL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61vH3rCakaL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71dDSTCiDZL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71V-MHgswSL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71DHXQ82B4L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71Ms2pAWSuL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81hp1F16ItL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71JhwQHLT8L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81iBvwHEXBL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81icWFmAmoL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71ggnTUYsHL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/811n+iY1CfL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51P7AIzTM0L._AC_SL1451_.jpg",
    "https://m.media-amazon.com/images/I/616E1MZX05L._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "hisense-wf1q9041bw-9kg" },
    update: {
      image: hisense9kgImages[0],
      images: hisense9kgImages,
      rating: 4.3,
      reviewCount: 185,
    },
    create: {
      slug: "hisense-wf1q9041bw-9kg",
      name: "Hisense WF1Q9041BW Lavadora 9kg",
      category: "LAVADORAS",
      brand: "Hisense",
      model: "WF1Q9041BW",
      image: hisense9kgImages[0],
      images: hisense9kgImages,
      rating: 4.3,
      reviewCount: 185,
      description:
        "Lavadora 9kg, 1400 rpm, Clase A, Función Vapor 99.9%, Lavado Rápido+, Lavado Automático, Finalización Diferida, Tecnología Inverter, Blanco. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 339.02,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4m9dFmU",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Hisense WF1Q9041BW insertada");

  const haier8kgImages = [
    "https://m.media-amazon.com/images/I/61FPcTAU2bL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61bI3kfUmhL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/61+Oh03vm8L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71kJ2kOoc0L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71pD7VBtV+L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71O6nF890EL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71pqxW9CX6L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51MhhIQhYZL._AC_SL1134_.jpg",
    "https://m.media-amazon.com/images/I/71SngdzGiYL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "haier-hw80-b14939-ib-ipro3-8kg" },
    update: {
      image: haier8kgImages[0],
      images: haier8kgImages,
      rating: 4.3,
      reviewCount: 128,
    },
    create: {
      slug: "haier-hw80-b14939-ib-ipro3-8kg",
      name: "Haier I-Pro Series 3 HW80-B14939 8kg",
      category: "LAVADORAS",
      brand: "Haier",
      model: "HW80-B14939-IB",
      image: haier8kgImages[0],
      images: haier8kgImages,
      rating: 4.3,
      reviewCount: 128,
      description:
        "Lavadora 8kg Carga Frontal Blanco, Función Vapor, Motor Direct Motion, Tratamiento Antibacterias, 1400 RPM, Fin Diferido, Detector automático de KG, 15 programas, 67dB. Clase de eficiencia energética A.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 384.99,
          priceOld: 549.0,
          discountPercent: 30,
          externalUrl: "https://amzn.to/4tlMpE9",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Haier HW80-B14939 insertada");

  const nilsonFrigoImages = [
    "https://m.media-amazon.com/images/I/41fRqeBzy-L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51utjMw8tZL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/413Oy1UPesL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51oOl0qIV-L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51s3n7mv7LL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51uS-W9AcYL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51ZLIeBK+iL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/71Z2OZcdjUL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/51O9lrRzglL._AC_SL1000_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "nilson-nf145500e-frigorifico-206l" },
    update: {
      image: nilsonFrigoImages[0],
      images: nilsonFrigoImages,
      rating: 4.2,
      reviewCount: 104,
    },
    create: {
      slug: "nilson-nf145500e-frigorifico-206l",
      name: "Nilson NF145500E Frigorífico 2 Puertas 206L",
      category: "FRIGORIFICOS",
      brand: "Nilson",
      model: "NF145500E",
      image: nilsonFrigoImages[0],
      images: nilsonFrigoImages,
      rating: 4.2,
      reviewCount: 104,
      description:
        "Frigorífico 2 Puertas Blanco, 206 Litros, Puerta Reversible, Bajo Nivel Sonoro, Tecnología Cíclica, 140x50 cm. Clase de eficiencia energética E.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 214.9,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/3OkeQnd",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Nilson NF145500E frigorífico insertado");

  const nilsonCombiImages = [
    "https://m.media-amazon.com/images/I/41DqqfnWUAL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61twc7ZzrHL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/41Mm9HViTCL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51VGeeslmCL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/61tXi0E6yTL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/51bDBtmTg3L._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/512ojlWlukL._AC_SL1000_.jpg",
    "https://m.media-amazon.com/images/I/7121xAmUxiL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/41L5k7pwTVL._AC_SL1000_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "nilson-nc185500e-frigorifico-combi-262l" },
    update: {
      image: nilsonCombiImages[0],
      images: nilsonCombiImages,
      rating: 4.0,
      reviewCount: 33,
    },
    create: {
      slug: "nilson-nc185500e-frigorifico-combi-262l",
      name: "Nilson NC185500E Frigorífico Combi 2 Puertas 262L",
      category: "FRIGORIFICOS",
      brand: "Nilson",
      model: "NC185500E",
      image: nilsonCombiImages[0],
      images: nilsonCombiImages,
      rating: 4.0,
      reviewCount: 33,
      description:
        "Frigorífico Combi 2 Puertas Blanco, 262 Litros, Puerta Reversible, Bajo Nivel Sonoro, Tecnología Cíclica, 180x55 cm. Clase de eficiencia energética E.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 289.9,
          priceOld: null,
          discountPercent: null,
          externalUrl: "https://amzn.to/4bQw7gN",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ Nilson NC185500E frigorífico combi insertado");

  const comfeeLavavajillasImages = [
    "https://m.media-amazon.com/images/I/51So7Dy-KhL._AC_SL1125_.jpg",
    "https://m.media-amazon.com/images/I/71kJXBPKQXL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71KaTJm7OqL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71wImCvhPZL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/81OQwWyDlzL._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71aGzEsha+L._AC_SL1500_.jpg",
    "https://m.media-amazon.com/images/I/713D9tIIWIL._AC_SL1500_.jpg",
  ];

  await prisma.product.upsert({
    where: { slug: "comfee-fd1435e-x-lavavajillas-14-cubiertos" },
    update: {
      image: comfeeLavavajillasImages[0],
      images: comfeeLavavajillasImages,
      rating: 4.1,
      reviewCount: 477,
    },
    create: {
      slug: "comfee-fd1435e-x-lavavajillas-14-cubiertos",
      name: "COMFEE' FD1435E-X Lavavajillas 14 Cubiertos 44dB",
      category: "LAVAVAJILLAS",
      brand: "Comfee",
      model: "FD1435E-X",
      image: comfeeLavavajillasImages[0],
      images: comfeeLavavajillasImages,
      rating: 4.1,
      reviewCount: 477,
      description:
        "Lavavajillas independiente para 14 cubiertos, 44 dB silencioso, gran pantalla LED, inicio diferido, función de media carga, soportes flexibles, acero inoxidable. Clase de eficiencia energética D.",
      offers: {
        create: {
          store: "Amazon",
          priceCurrent: 339.99,
          priceOld: 369.99,
          discountPercent: 8,
          externalUrl: "https://amzn.to/4sviiJO",
          inStock: true,
        },
      },
    },
  });

  console.log("✅ COMFEE FD1435E-X lavavajillas insertado");

  // ── Usuarios de prueba para la comunidad ──────────────────────────────────
  console.log("🌱 Insertando usuarios y publicaciones de comunidad...");

  const communityUsers = [
    {
      id: "seed-user-1",
      name: "María García",
      email: "maria.garcia.seed@example.com",
      avatarColor: "#7C3AED",
      avatarEmoji: "👩",
    },
    {
      id: "seed-user-2",
      name: "Carlos Martínez",
      email: "carlos.martinez.seed@example.com",
      avatarColor: "#16A34A",
      avatarEmoji: "🧑",
    },
    {
      id: "seed-user-3",
      name: "Ana López",
      email: "ana.lopez.seed@example.com",
      avatarColor: "#D97706",
      avatarEmoji: "👩‍💻",
    },
    {
      id: "seed-user-4",
      name: "Javier Sánchez",
      email: "javier.sanchez.seed@example.com",
      avatarColor: "#DC2626",
      avatarEmoji: "🧔",
    },
    {
      id: "seed-user-5",
      name: "Laura Fernández",
      email: "laura.fernandez.seed@example.com",
      avatarColor: "#0891B2",
      avatarEmoji: "👱‍♀️",
    },
  ];

  for (const u of communityUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarColor: u.avatarColor,
        avatarEmoji: u.avatarEmoji,
        emailVerified: true,
      },
    });
  }

  // Eliminar posts genéricos sin producto si existen
  await prisma.communityPost.deleteMany({
    where: { id: { in: ["seed-post-1","seed-post-2","seed-post-3","seed-post-4","seed-post-5","seed-post-6","seed-post-7","seed-post-8"] } },
  });

  // ── Posts vinculados a productos ──────────────────────────────────────────
  const [xiaomiTV, boschLavadora, nilsonCombi] = await Promise.all([
    prisma.product.findUnique({ where: { slug: "xiaomi-tv-f-65-2025" } }),
    prisma.product.findUnique({ where: { slug: "bosch-wgg244z0es-serie6-ecosilence-9kg" } }),
    prisma.product.findUnique({ where: { slug: "nilson-nc185500e-frigorifico-combi-262l" } }),
  ]);

  type PostData = { id: string; userId: string; productId: string; type: "DISCUSION" | "PREGUNTA" | "CHOLLO" | "CONSEJO"; title: string; content: string; createdAt: Date };
  const productPosts: PostData[] = ([
    xiaomiTV && {
      id: "seed-post-product-1",
      userId: "seed-user-4",
      productId: xiaomiTV.id,
      type: "DISCUSION" as const,
      title: `Opinión real tras 3 meses con la ${xiaomiTV.name}`,
      content:
        "La compré en enero y ya puedo dar una opinión con uso real. Lo bueno: imagen espectacular para el precio, el Fire OS va muy fluido y la integración con Alexa funciona de verdad. Lo malo: el sonido es flojo (recomiendo un soundbar básico), y el mando a distancia es muy minimalista. Para ver películas y series está perfecta. Para gaming hay algo de input lag a 60Hz, aunque en modo juego mejora bastante. Relación calidad-precio imbatible.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    boschLavadora && {
      id: "seed-post-product-2",
      userId: "seed-user-5",
      productId: boschLavadora.id,
      type: "CONSEJO" as const,
      title: `Consejos para sacar el máximo a la ${boschLavadora.name}`,
      content:
        "Llevo un año con esta lavadora y aprendí algunos trucos. Primero: usa siempre el programa EcoSilence a 40°C para ropa normal, gasta muchísimo menos y lava igual de bien. Segundo: el centrifugado a 1200rpm deja la ropa casi seca, ahorra mucho tiempo de tendido. Tercero: cada mes haz un ciclo de limpieza a 90°C vacío con un sobre de limpiador de tambor. El tambor de acero inoxidable no da problemas. En resumen: una compra que recomiendo sin dudarlo.",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    nilsonCombi && {
      id: "seed-post-product-3",
      userId: "seed-user-3",
      productId: nilsonCombi.id,
      type: "PREGUNTA" as const,
      title: `¿Alguien más tiene ruido en la ${nilsonCombi.name}?`,
      content:
        "Compré este frigo hace 2 semanas y en general estoy contenta, pero noto un ruido cada 30-40 minutos como un borboteo que dura unos segundos. El vendedor me dijo que es normal del ciclo de descongelación pero no estoy segura. ¿Alguien tiene el mismo modelo y le pasa? ¿Es normal o debería reclamar el cambio? El frío funciona bien, la temperatura está perfecta, solo es ese sonido.",
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  ] as (PostData | false)[]).filter((x): x is PostData => Boolean(x));

  for (const post of productPosts) {
    await prisma.communityPost.upsert({
      where: { id: post.id },
      update: {},
      create: post,
    });
  }

  console.log(`✅ ${productPosts.length} publicaciones vinculadas a productos insertadas`);

  // ── Reseñas de prueba ─────────────────────────────────────────────────────
  console.log("🌱 Insertando reseñas de prueba...");

  type ReviewData = { id: string; productId: string; userId: string; rating: number; title: string; content: string; createdAt: Date };
  const reviewData: ReviewData[] = ([
    // Xiaomi TV
    xiaomiTV && { id: "seed-review-1",  productId: xiaomiTV.id,     userId: "seed-user-1", rating: 5, title: "Increíble relación calidad-precio",         content: "Llevo 4 meses con esta tele y no puedo estar más contenta. La imagen en 4K es espectacular, el Fire OS va muy fluido y la integración con Alexa es fantástica. El sonido es lo único flojo, pero con un soundbar básico queda perfecta. Para el precio que tiene, no hay rival.", createdAt: new Date(Date.now() - 10 * 86400000) },
    xiaomiTV && { id: "seed-review-2",  productId: xiaomiTV.id,     userId: "seed-user-2", rating: 4, title: "Muy buena, con un pequeño pero",              content: "La imagen es excelente y el sistema operativo responde rápido. Le quito una estrella porque el soporte de apps no es tan completo como en otras plataformas y el mando se queda corto. Aun así, para el precio es una compra muy recomendable.", createdAt: new Date(Date.now() - 5 * 86400000) },
    xiaomiTV && { id: "seed-review-3",  productId: xiaomiTV.id,     userId: "seed-user-3", rating: 5, title: "La mejor compra que he hecho este año",       content: "No me esperaba una calidad así por este precio. Los colores son vivos, el negro es profundo y el tiempo de respuesta en modo juego es buenísimo. El altavoz incorporado es mejorable, pero el resto es 10/10. La recomiendo sin dudarlo.", createdAt: new Date(Date.now() - 2 * 86400000) },
    xiaomiTV && { id: "seed-review-4",  productId: xiaomiTV.id,     userId: "seed-user-4", rating: 3, title: "Correcta pero no me convenció del todo",      content: "La tele funciona bien y la imagen es aceptable, pero el Fire OS tiene demasiada publicidad y algunas apps tardan en cargar. Para ver Netflix y Prime está bien, pero si buscas algo más completo quizás vale la pena pagar un poco más por una con Google TV.", createdAt: new Date(Date.now() - 1 * 86400000) },
    // Bosch lavadora
    boschLavadora && { id: "seed-review-5", productId: boschLavadora.id, userId: "seed-user-5", rating: 5, title: "La lavadora perfecta para el hogar",     content: "Llevo un año con esta Bosch y no ha dado ningún problema. Lava perfecto, es silenciosísima y el consumo en el programa EcoSilence es muy bajo. La capacidad de 9kg es ideal para familia. Totalmente recomendada.", createdAt: new Date(Date.now() - 15 * 86400000) },
    boschLavadora && { id: "seed-review-6", productId: boschLavadora.id, userId: "seed-user-1", rating: 4, title: "Silenciosa y eficiente",                 content: "Muy contenta con la compra. Silenciosa como ninguna que haya tenido antes, y los programas son muy completos. Le quito una estrella porque el manual de instrucciones es bastante confuso y tardé un rato en entender todos los ciclos.", createdAt: new Date(Date.now() - 8 * 86400000) },
    boschLavadora && { id: "seed-review-7", productId: boschLavadora.id, userId: "seed-user-3", rating: 5, title: "Cumple con todo lo que promete",         content: "Tras comparar muchos modelos me decanté por esta Bosch y fue un acierto. Los resultados de lavado son perfectos incluso con manchas difíciles. El tambor de 9kg pasa toda la colada de la semana en dos tandas. El programa eco ahorra mucho en la factura.", createdAt: new Date(Date.now() - 3 * 86400000) },
    // Nilson frigo
    nilsonCombi && { id: "seed-review-8",  productId: nilsonCombi.id,   userId: "seed-user-2", rating: 4, title: "Buen frigorífico para el precio",        content: "Para ser una marca que no conocía, ha superado mis expectativas. Mantiene la temperatura estable, es bastante silencioso y el espacio interior está bien organizado. El único inconveniente es que el cajón de las verduras es algo pequeño. Pero por este precio, muy bien.", createdAt: new Date(Date.now() - 20 * 86400000) },
    nilsonCombi && { id: "seed-review-9",  productId: nilsonCombi.id,   userId: "seed-user-4", rating: 3, title: "Correcto pero con algún ruido ocasional", content: "El frigo funciona bien y enfría perfectamente. Sin embargo, a veces hace un ruido de borboteo cada 30-40 minutos que al principio me asustó. Parece que es el ciclo de descongelación y es normal, pero podría ser más silencioso. Nota media por eso.", createdAt: new Date(Date.now() - 12 * 86400000) },
    nilsonCombi && { id: "seed-review-10", productId: nilsonCombi.id,   userId: "seed-user-5", rating: 5, title: "Sorprendentemente bueno",                content: "No esperaba tanto de una marca desconocida. El acabado es sólido, la distribución interior es práctica y el congelador tiene bastante capacidad. Lleva 3 meses funcionando sin ningún problema y la temperatura se mantiene constante. Gran compra.", createdAt: new Date(Date.now() - 4 * 86400000) },
  ] as (ReviewData | false)[]).filter((x): x is ReviewData => Boolean(x));

  for (const r of reviewData) {
    await prisma.review.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    });
  }

  console.log(`✅ ${reviewData.length} reseñas de prueba insertadas`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
