import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const updates: { slug: string; images: string[] }[] = [
  {
    slug: "xiaomi-tv-a-pro-32-2026-qled",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126/1254-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126/2191-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126/3516-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126/4970-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126/5626-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-ce943e2a-33a9-4e12-93fa-61f0122a2057.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126/6480-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-f5c25858-3b46-4531-a48a-aa542fb68c79.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126/7791-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-e0f66b23-c51a-44fa-81fc-4e5c00174610.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1093/10934126/8258-xiaomi-tv-a-pro-32-2026-32-qled-hd-google-tv-chromecast-sonido-dts-486091f3-1a9c-4f42-a3c6-ba3936a47a6b.jpg",
    ],
  },
  {
    slug: "philips-led-40-40pfs6000-fullhd-titan",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878768/1365-philips-led-40-40pfs6000-fullhd-dolby-audio-hdr10-titan.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878768/2305-philips-led-40-40pfs6000-fullhd-dolby-audio-hdr10-titan-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878768/3975-philips-led-40-40pfs6000-fullhd-dolby-audio-hdr10-titan-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878768/4924-philips-led-40-40pfs6000-fullhd-dolby-audio-hdr10-titan-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878768/5376-philips-led-40-40pfs6000-fullhd-dolby-audio-hdr10-titan-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878768/6456-philips-led-40-40pfs6000-fullhd-dolby-audio-hdr10-titan-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878768/7246-philips-led-40-40pfs6000-fullhd-dolby-audio-hdr10-titan-1e4e0f9c-863f-415b-a3f2-b07da75e6989.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878768/8497-philips-led-40-40pfs6000-fullhd-dolby-audio-hdr10-titan-942b386e-c293-4dfd-94bf-f3793bbc5035.jpg",
    ],
  },
  {
    slug: "td-systems-led-m32c22tizen-32-tizen",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1102/11026312/1196-tv-td-systems-led-m32c22tizen-32-hd-60hz-smart-tv-tizen-hdr-dolby-digital-plus.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1102/11026312/2344-tv-td-systems-led-m32c22tizen-32-hd-60hz-smart-tv-tizen-hdr-dolby-digital-plus-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1102/11026312/3473-tv-td-systems-led-m32c22tizen-32-hd-60hz-smart-tv-tizen-hdr-dolby-digital-plus-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1102/11026312/4349-tv-td-systems-led-m32c22tizen-32-hd-60hz-smart-tv-tizen-hdr-dolby-digital-plus-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1102/11026312/5314-tv-td-systems-led-m32c22tizen-32-hd-60hz-smart-tv-tizen-hdr-dolby-digital-plus-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1102/11026312/6735-tv-td-systems-led-m32c22tizen-32-hd-60hz-smart-tv-tizen-hdr-dolby-digital-plus-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1102/11026312/7786-tv-td-systems-led-m32c22tizen-32-hd-60hz-smart-tv-tizen-hdr-dolby-digital-plus-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1102/11026312/8311-tv-td-systems-led-m32c22tizen-32-hd-60hz-smart-tv-tizen-hdr-dolby-digital-plus-foto.jpg",
    ],
  },
  {
    slug: "lg-led-43ua73006la-43-4k-webos",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/1110-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/2594-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/3691-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/4372-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/5102-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/6591-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/7126-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/829-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/9429-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco-19b687c9-62dd-4f1c-9fdb-4414d453972b.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891056/10175-lg-led-43ua73006la-43-4k-uhd-smart-tv-hdr10-wifi-bluetooth-sin-marco-ba3c1cf0-cd53-43c6-b314-1a064e11ac93.jpg",
    ],
  },
  {
    slug: "lg-led-50ua73006la-50-4k-webos",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891055/1310-lg-led-50ua73006la-50-4k-ultra-hd-smart-tv-webos-ai-sound-pro-dolby-control-voz.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891055/2299-lg-led-50ua73006la-50-4k-ultra-hd-smart-tv-webos-ai-sound-pro-dolby-control-voz-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891055/3479-lg-led-50ua73006la-50-4k-ultra-hd-smart-tv-webos-ai-sound-pro-dolby-control-voz-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891055/4533-lg-led-50ua73006la-50-4k-ultra-hd-smart-tv-webos-ai-sound-pro-dolby-control-voz-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1089/10891055/5425-lg-led-50ua73006la-50-4k-ultra-hd-smart-tv-webos-ai-sound-pro-dolby-control-voz-caracteristicas.jpg",
    ],
  },
  {
    slug: "lg-led-32lr60006la-32-fullhd-webos",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874587/1475-lg-led-32-32lr60006laaeuq-fullhd-webos-hdr10-pro-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874587/2426-lg-led-32-32lr60006laaeuq-fullhd-webos-hdr10-pro-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874587/3918-lg-led-32-32lr60006laaeuq-fullhd-webos-hdr10-pro-5df2e62c-72de-43be-ab2b-34edf3f0b9f6.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874587/4643-lg-led-32-32lr60006laaeuq-fullhd-webos-hdr10-pro-14881bbf-a953-4350-8cf0-42dc9f523280.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874587/540-lg-led-32-32lr60006laaeuq-fullhd-webos-hdr10-pro-74d9146f-c750-47ec-9f5f-0eb4cea8d93b.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10874587/6790-lg-led-32-32lr60006laaeuq-fullhd-webos-hdr10-pro-177507b5-ae05-494e-a3a5-b3355167d5db.jpg",
    ],
  },
  {
    slug: "haier-s8-h65s800ug-65-qled-4k",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1072/10727786/1493-haier-s8-series-h65s800ug-65-qled-ultrahd-4k-hdr10-smart-tv.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1072/10727786/2906-haier-s8-series-h65s800ug-65-qled-ultrahd-4k-hdr10-smart-tv-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1072/10727786/3987-haier-s8-series-h65s800ug-65-qled-ultrahd-4k-hdr10-smart-tv-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1072/10727786/4654-haier-s8-series-h65s800ug-65-qled-ultrahd-4k-hdr10-smart-tv-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1072/10727786/5621-haier-s8-series-h65s800ug-65-qled-ultrahd-4k-hdr10-smart-tv-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1072/10727786/6743-haier-s8-series-h65s800ug-65-qled-ultrahd-4k-hdr10-smart-tv-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1072/10727786/7800-haier-s8-series-h65s800ug-65-qled-ultrahd-4k-hdr10-smart-tv-review.jpg",
    ],
  },
  {
    slug: "hisense-65a6q-65-4k-reacondicionado",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878820/1837-hisense-direct-led-65a6q-65-4k-dolby-vision-hdr10-game-mode-plus-alexa-vidaa.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878820/2499-hisense-direct-led-65a6q-65-4k-dolby-vision-hdr10-game-mode-plus-alexa-vidaa-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878820/3289-hisense-direct-led-65a6q-65-4k-dolby-vision-hdr10-game-mode-plus-alexa-vidaa-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878820/4267-hisense-direct-led-65a6q-65-4k-dolby-vision-hdr10-game-mode-plus-alexa-vidaa-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878820/59-hisense-direct-led-65a6q-65-4k-dolby-vision-hdr10-game-mode-plus-alexa-vidaa-d7f82b6b-726a-4145-b97c-e35caf534e2d.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878820/6511-hisense-direct-led-65a6q-65-4k-dolby-vision-hdr10-game-mode-plus-alexa-vidaa-a75635b8-5832-4f51-b674-5c9ce6073f61.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878820/7418-hisense-direct-led-65a6q-65-4k-dolby-vision-hdr10-game-mode-plus-alexa-vidaa-77be594b-a5d2-4b21-a140-9c2ab1651c16.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10878820/8665-hisense-direct-led-65a6q-65-4k-dolby-vision-hdr10-game-mode-plus-alexa-vidaa-6ab25777-8806-4cb4-8a6e-c0b8398d40cf.jpg",
    ],
  },
  {
    slug: "xiaomi-a-pro-2026-50-qled-4k",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10948933/1377-xiaomi-a-pro-2026-50-qled-4k-ultrahd-smart-tv-dolby-audio-game-boost-hdr-google-tv-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10948933/2102-xiaomi-a-pro-2026-50-qled-4k-ultrahd-smart-tv-dolby-audio-game-boost-hdr-google-tv-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10948933/3163-xiaomi-a-pro-2026-50-qled-4k-ultrahd-smart-tv-dolby-audio-game-boost-hdr-google-tv-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10948933/4850-xiaomi-a-pro-2026-50-qled-4k-ultrahd-smart-tv-dolby-audio-game-boost-hdr-google-tv-especificaciones.jpg",
    ],
  },
  {
    slug: "xiaomi-a-2025-50-led-4k",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1082/10822186/1747-xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1082/10822186/2844-xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1082/10822186/3576-xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1082/10822186/4616-xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1082/10822186/5685-xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv-4485af1c-5593-4b85-90c6-77b1b11415e7.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1082/10822186/6417-xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv-b7f61117-d224-4ee7-b04e-4d3013a8442e.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1082/10822186/796-xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv-6dd09d44-617d-49e7-94b0-8600816815c4.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1082/10822186/875-xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv-026f614c-d6b5-4459-b87c-97b0df6dabb4.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1082/10822186/9590-xiaomi-a-2025-50-led-ultrahd-4k-dolby-atmos-google-tv-1182c944-cd5d-4fb2-8ab6-b92a8a2176d4.jpg",
    ],
  },
  {
    slug: "tcl-65p8k-65-qled-4k-onkyo",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10879300/1222-tcl-qled-65-65p8k-ultrahd-4k-sonido-onkyo-google-tv.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10879300/2417-tcl-qled-65-65p8k-ultrahd-4k-sonido-onkyo-google-tv-16de55bb-a753-4b89-90f0-638fbaa065fc.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10879300/3582-tcl-qled-65-65p8k-ultrahd-4k-sonido-onkyo-google-tv-32e22379-2ee7-4b6a-8183-6ac995c13beb.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10879300/4963-tcl-qled-65-65p8k-ultrahd-4k-sonido-onkyo-google-tv-99e3412b-2c3a-43d4-a447-1c16cdce5d0f.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10879300/5834-tcl-qled-65-65p8k-ultrahd-4k-sonido-onkyo-google-tv-7d4cf149-ac7b-4179-86a0-137f20c485c5.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10879300/6544-tcl-qled-65-65p8k-ultrahd-4k-sonido-onkyo-google-tv-05a77142-cac9-4f81-8f23-bba029a7e74f.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10879300/7664-tcl-qled-65-65p8k-ultrahd-4k-sonido-onkyo-google-tv-9af2c07c-9724-4c0b-9c9a-58e37192c71b.jpg",
    ],
  },
  {
    slug: "tcl-65p6k-65-4k-google-tv",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/1391-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/2773-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/3633-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/4318-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-a2623b71-596e-4956-8730-73621115f6d0.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/5647-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-963d7b77-a220-48a3-9f04-4777e1a85346.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/6748-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-77e0d480-7268-476a-8393-313c26160128.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/7205-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-999fd633-c759-44bb-9895-5e964e1e6bfb.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/8361-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-658c0e90-b4e6-49ef-9479-eb311c00edb9.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/9498-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-01ea2545-5ff8-453c-a650-ce33118072a7.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10911634/10485-tv-tcl-led-p6k-65p6k-65-4k-dolby-audio-hdr10-google-tv-d1bee5c5-c6db-430c-ba4f-5c486c03c865.jpg",
    ],
  },
  {
    slug: "tcl-50v6c-50-4k-google-tv",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/1228-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/2480-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/351-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/4170-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/543-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/6164-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/7527-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/8311-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10-foto.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/9149-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10-e8841c15-70b5-44bc-8614-e2cc16367b24.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1103/11034886/10816-tv-tcl-led-50v6c-50-4k-ultra-hd-60hz-smart-tv-google-tv-dolby-vision-hdr10-6c0ff223-cc53-476b-bab0-0015c86cc265.jpg",
    ],
  },
  {
    slug: "tcl-55t8c-55-qled-4k-google-tv",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1098/10989285/1459-tv-tcl-qled-55t8c-55-4k-ultra-hd-smart-tv-google-tv-hdr10-dolby-vision.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1098/10989285/2302-tv-tcl-qled-55t8c-55-4k-ultra-hd-smart-tv-google-tv-hdr10-dolby-vision-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1098/10989285/375-tv-tcl-qled-55t8c-55-4k-ultra-hd-smart-tv-google-tv-hdr10-dolby-vision-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1098/10989285/4179-tv-tcl-qled-55t8c-55-4k-ultra-hd-smart-tv-google-tv-hdr10-dolby-vision-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1098/10989285/5203-tv-tcl-qled-55t8c-55-4k-ultra-hd-smart-tv-google-tv-hdr10-dolby-vision-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1098/10989285/6447-tv-tcl-qled-55t8c-55-4k-ultra-hd-smart-tv-google-tv-hdr10-dolby-vision-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1098/10989285/7107-tv-tcl-qled-55t8c-55-4k-ultra-hd-smart-tv-google-tv-hdr10-dolby-vision-review.jpg",
    ],
  },
  {
    slug: "xiaomi-tv-s-2025-65-qd-mini-led",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10862918/1112-xiaomi-tv-s-2025-65-qd-mini-led-ultrahd-4k-google-tv-dd929673-788d-407e-b80c-4e5692373aef.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10862918/2467-xiaomi-tv-s-2025-65-qd-mini-led-ultrahd-4k-google-tv-4e50094c-30b9-4c71-a628-9ec3a267e2f7.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10862918/392-xiaomi-tv-s-2025-65-qd-mini-led-ultrahd-4k-google-tv-b36e6ff5-949d-4a51-a5a6-c5d4fce6d386.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10862918/4309-xiaomi-tv-s-2025-65-qd-mini-led-ultrahd-4k-google-tv-857329c7-99a2-4c63-9d43-d327329c5a6f.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10862918/5632-xiaomi-tv-s-2025-65-qd-mini-led-ultrahd-4k-google-tv-fa44af63-e001-4eea-8db8-c3402a2348fb.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10862918/6416-xiaomi-tv-s-2025-65-qd-mini-led-ultrahd-4k-google-tv-7e4f18a7-e28c-4125-ad67-c04f11a3e32c.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10862918/7837-xiaomi-tv-s-2025-65-qd-mini-led-ultrahd-4k-google-tv-fc540264-be31-4392-ab06-52aa666b0f3c.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1086/10862918/8748-xiaomi-tv-s-2025-65-qd-mini-led-ultrahd-4k-google-tv-e0e3cfb3-2b73-41af-8fca-dc9a7f82a154.jpg",
    ],
  },
  {
    slug: "philips-qled-55pus8400-55-4k-ambilight-titan",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10949184/1976-tv-philips-qled-55pus8400-55-4k-ultrahd-ambilight-smart-tv-dolby-atmos-titan-os.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10949184/2150-tv-philips-qled-55pus8400-55-4k-ultrahd-ambilight-smart-tv-dolby-atmos-titan-os-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10949184/3562-tv-philips-qled-55pus8400-55-4k-ultrahd-ambilight-smart-tv-dolby-atmos-titan-os-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10949184/4224-tv-philips-qled-55pus8400-55-4k-ultrahd-ambilight-smart-tv-dolby-atmos-titan-os-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10949184/5480-tv-philips-qled-55pus8400-55-4k-ultrahd-ambilight-smart-tv-dolby-atmos-titan-os-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10949184/6689-tv-philips-qled-55pus8400-55-4k-ultrahd-ambilight-smart-tv-dolby-atmos-titan-os-opiniones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10949184/7523-tv-philips-qled-55pus8400-55-4k-ultrahd-ambilight-smart-tv-dolby-atmos-titan-os-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1094/10949184/85-tv-philips-qled-55pus8400-55-4k-ultrahd-ambilight-smart-tv-dolby-atmos-titan-os-foto.jpg",
    ],
  },
  {
    slug: "nilait-luxe-55ud8004swos-55-qled-4k-webos",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1097/10976620/1187-nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1097/10976620/1214-nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1097/10976620/2809-nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos-98affae4-4767-49fe-a489-f9e030540b69.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1097/10976620/3840-nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos-c95e73bc-4ef5-4af9-aa88-4178b36f1abf.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1097/10976620/4683-nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos-f5248673-7659-4926-9ebf-371e9299220a.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1097/10976620/510-nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos-00265fd4-d370-4bbf-8ef8-5f3b013ad555.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1097/10976620/6743-nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos-54e14133-d4e1-40bf-a786-0597177705cd.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1097/10976620/7708-nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos-e4fbc9f0-75a1-4275-abbc-57b70b9340af.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1097/10976620/8546-nilait-luxe-55ud8004swos-55-qled-uhd-4k-smart-tv-webos-d401aac6-28d3-492b-a9dc-53a3dabfcdc5.jpg",
    ],
  },
  {
    slug: "nilait-prisma-32fd7004swos-32-fhd-webos",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10950915/1204-nilait-prisma-32fd7004swos-32-led-fhd-smart-tv-webos-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10950915/2512-nilait-prisma-32fd7004swos-32-led-fhd-smart-tv-webos-c3a6ae2f-83be-4228-adf0-108dc768f99e.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10950915/3257-nilait-prisma-32fd7004swos-32-led-fhd-smart-tv-webos-c5bebd7a-7da0-4706-81ed-45bfcaec0c7d.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10950915/4593-nilait-prisma-32fd7004swos-32-led-fhd-smart-tv-webos-a361b7f4-033f-460c-8b4f-7e353d1469ce.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10950915/5672-nilait-prisma-32fd7004swos-32-led-fhd-smart-tv-webos-4c79334d-dd75-4281-b5d2-b7ff8632cb2c.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10950915/6384-nilait-prisma-32fd7004swos-32-led-fhd-smart-tv-webos-490a9168-14f8-4bba-91ef-0bf16eff230b.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10950915/7583-nilait-prisma-32fd7004swos-32-led-fhd-smart-tv-webos-cd831bed-d805-4338-8d19-de230ce1fe50.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1095/10950915/8213-nilait-prisma-32fd7004swos-32-led-fhd-smart-tv-webos-f2027389-afb0-4012-bb7c-1f91936b8da6.jpg",
    ],
  },
  {
    slug: "samsung-ai-qled-55-tq55q7faauxxc-4k-tizen",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10877393/1634-samsung-ai-qled-55-tq55q7faauxxc-ultrahd-4k-quantum-hdr-tizen-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10877393/2671-samsung-ai-qled-55-tq55q7faauxxc-ultrahd-4k-quantum-hdr-tizen-7dc5158c-2a3a-448a-8e5b-844dbb28400d.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10877393/3996-samsung-ai-qled-55-tq55q7faauxxc-ultrahd-4k-quantum-hdr-tizen-12a58388-86e7-476b-84cb-3df647e78a50.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10877393/4420-samsung-ai-qled-55-tq55q7faauxxc-ultrahd-4k-quantum-hdr-tizen-8815b269-0cff-4556-ae8f-10f98161f574.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10877393/5352-samsung-ai-qled-55-tq55q7faauxxc-ultrahd-4k-quantum-hdr-tizen-989d4e4a-5684-48b1-b5ad-9006e87b6284.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10877393/6634-samsung-ai-qled-55-tq55q7faauxxc-ultrahd-4k-quantum-hdr-tizen-be9c0fff-b6b8-4b45-b9ae-4c9b3850b20f.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10877393/7605-samsung-ai-qled-55-tq55q7faauxxc-ultrahd-4k-quantum-hdr-tizen-b94eee9f-5bc7-409b-a4a9-b7c6490872e2.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1087/10877393/8611-samsung-ai-qled-55-tq55q7faauxxc-ultrahd-4k-quantum-hdr-tizen-7198bf5d-48ab-4d95-9604-153ccb08f831.jpg",
    ],
  },
  {
    slug: "philips-led-55pus7000-55-4k-titan-os",
    images: [
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10910888/1650-tv-philips-led-55pus7000-55-4k-ultra-hd-smart-tv-hdr10-dolby-atmos-wifi-bluetooth-comprar.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10910888/2834-tv-philips-led-55pus7000-55-4k-ultra-hd-smart-tv-hdr10-dolby-atmos-wifi-bluetooth-mejor-precio.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10910888/3300-tv-philips-led-55pus7000-55-4k-ultra-hd-smart-tv-hdr10-dolby-atmos-wifi-bluetooth-especificaciones.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10910888/4629-tv-philips-led-55pus7000-55-4k-ultra-hd-smart-tv-hdr10-dolby-atmos-wifi-bluetooth-caracteristicas.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10910888/5495-tv-philips-led-55pus7000-55-4k-ultra-hd-smart-tv-hdr10-dolby-atmos-wifi-bluetooth-review.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10910888/6677-tv-philips-led-55pus7000-55-4k-ultra-hd-smart-tv-hdr10-dolby-atmos-wifi-bluetooth-18779ade-2a3e-4ce2-b394-9d816828aba4.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10910888/7144-tv-philips-led-55pus7000-55-4k-ultra-hd-smart-tv-hdr10-dolby-atmos-wifi-bluetooth-522addcd-8048-45af-be64-08c189f79e5d.jpg",
      "https://thumb.pccomponentes.com/w-530-530/articles/1091/10910888/8979-tv-philips-led-55pus7000-55-4k-ultra-hd-smart-tv-hdr10-dolby-atmos-wifi-bluetooth-d2af1b2a-2a6c-46df-9dee-b8f0734fc3b6.jpg",
    ],
  },
];

async function main() {
  let updated = 0;
  for (const { slug, images } of updates) {
    const result = await prisma.product.updateMany({
      where: { slug },
      data: { image: images[0], images },
    });
    if (result.count > 0) {
      console.log(`✅ ${slug} — ${images.length} imágenes`);
      updated++;
    } else {
      console.log(`⚠️  No encontrado: ${slug}`);
    }
  }
  console.log(`\n🎉 ${updated}/${updates.length} productos actualizados`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
