/**
 * Asistente público de Orvexia — entrada server-side.
 *
 * La lógica pura (tipos, detección de intent/categoría, topics estáticos)
 * está en `public-core.ts` para poder testearla sin servidor. Aquí solo
 * vive lo que necesita BD: handlers de intent y el orquestador
 * `answerPublic`.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { findBestTopic } from "./matcher";
import { searchProducts } from "@/lib/search";
import {
  TOPICS, FALLBACK, detectIntent, detectCategory, formatPrice,
  type AssistantAnswer, type AssistantContext, type IntentMatch, type ProductChip,
} from "./public-core";

export type {
  AssistantAnswer, AssistantContext, ProductChip, PublicTopic, IntentMatch, IntentName,
} from "./public-core";
export { TOPICS, detectIntent, detectCategory } from "./public-core";

interface ProductWithOffers {
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  images: string[];
  offers: {
    store: string;
    priceCurrent: number;
    priceOld: number | null;
    discountPercent: number | null;
  }[];
}

function toChip(p: ProductWithOffers): ProductChip {
  const offer = p.offers[0] ?? null;
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    image: p.image ?? p.images[0] ?? null,
    price: offer?.priceCurrent ?? null,
    oldPrice: offer?.priceOld ?? null,
    discount: offer?.discountPercent ?? null,
    store: offer?.store ?? null,
  };
}

// ── Handlers de intents ─────────────────────────────────────────────────────

async function runIntent(intent: IntentMatch, ctx: AssistantContext): Promise<AssistantAnswer> {
  switch (intent.name) {
    case "price":         return await intentPrice(intent.payload ?? "");
    case "deals":         return await intentDeals(ctx);
    case "price_drops":   return await intentPriceDrops(ctx);
    case "recommend":     return await intentRecommend(ctx);
    case "account_state": return await intentAccountState(ctx);
    case "guides_list":   return intentGuidesList();
    case "compare_help":  return intentCompareHelp();
  }
}

async function intentPrice(rawQuery: string): Promise<AssistantAnswer> {
  const cleaned = rawQuery.replace(/^(el |la |los |las |un |una |unos |unas )/i, "").trim();
  if (cleaned.length < 2) {
    return {
      answer: "¿De qué producto quieres saber el precio? Dime marca y modelo, p. ej. *\"precio del Samsung QE55Q80C\"*.",
      source: "intent", matched: "price",
    };
  }
  const hits = await searchProducts(cleaned, { limit: 3 });
  if (hits.length === 0) {
    return {
      answer: `No encuentro ningún producto con "${cleaned}". Prueba el [buscador](/buscar) o explora [categorías](/categorias).`,
      links: [{ label: "Ir al buscador", href: `/buscar?q=${encodeURIComponent(cleaned)}` }],
      source: "intent", matched: "price",
    };
  }
  const top = hits[0];
  const best = top.offers[0];
  const priceLine = best
    ? `**${formatPrice(best.priceCurrent)}** en ${best.store}${best.discountPercent ? ` (−${best.discountPercent}%)` : ""}`
    : "sin oferta activa ahora mismo";
  const otherStores = top.offers.length > 1
    ? ` También está disponible en ${top.offers.length - 1} tienda${top.offers.length - 1 === 1 ? "" : "s"} más.`
    : "";
  const otherHits = hits.length > 1
    ? ` Encontré ${hits.length - 1} resultado${hits.length - 1 === 1 ? "" : "s"} más que podrían encajar.`
    : "";
  return {
    answer:
      `El **${top.brand} ${top.name}** está a ${priceLine}.` +
      `${otherStores}${otherHits}\n\n[Ver ficha y comparar tiendas](/productos/${top.slug}).`,
    products: hits.map(toChip),
    links: [
      { label: "Ficha del producto", href: `/productos/${top.slug}` },
      ...(hits.length > 1 ? [{ label: "Ver todos los resultados", href: `/buscar?q=${encodeURIComponent(cleaned)}` }] : []),
    ],
    follow: [
      `¿Está en mínimo histórico el ${top.brand}?`,
      "¿Cómo creo una alerta de precio?",
    ],
    source: "intent", matched: "price",
  };
}

async function intentDeals(ctx: AssistantContext): Promise<AssistantAnswer> {
  const cat = detectCategory(ctx.question);
  const products = await prisma.product.findMany({
    where: {
      ...(cat ? { category: cat } : {}),
      offers: { some: { discountPercent: { gt: 0 }, inStock: true } },
    },
    select: {
      slug: true, name: true, brand: true, image: true, images: true,
      offers: {
        where: { discountPercent: { gt: 0 }, inStock: true },
        orderBy: { discountPercent: "desc" },
        take: 1,
        select: { store: true, priceCurrent: true, priceOld: true, discountPercent: true },
      },
    },
    take: 5,
    orderBy: { rating: { sort: "desc", nulls: "last" } },
  });

  if (products.length === 0) {
    return {
      answer: cat
        ? `Ahora mismo no hay ofertas con descuento activo en esa categoría. Revisa [/ofertas-destacadas](/ofertas-destacadas) o [/bajadas-recientes](/bajadas-recientes).`
        : `Ahora mismo no encuentro ofertas con descuento. Echa un vistazo a [/ofertas-destacadas](/ofertas-destacadas).`,
      source: "intent", matched: "deals",
    };
  }

  const intro = cat ? `Top ofertas con descuento ahora mismo:` : `Top ofertas con descuento (ahora mismo):`;
  const lines = products.map((p) => {
    const o = p.offers[0];
    return `- **${p.brand} ${p.name}** — ${formatPrice(o.priceCurrent)} (−${o.discountPercent}%) en ${o.store} · [ver](/productos/${p.slug})`;
  });

  return {
    answer: [intro, ...lines, ``, `Más en [ofertas destacadas](/ofertas-destacadas).`].join("\n"),
    products: products.map(toChip),
    links: [{ label: "Todas las ofertas", href: "/ofertas-destacadas" }],
    follow: ["¿Qué precios han bajado esta semana?", "¿Cuál tiene mejor relación calidad/precio?"],
    source: "intent", matched: "deals",
  };
}

async function intentPriceDrops(ctx: AssistantContext): Promise<AssistantAnswer> {
  const cat = detectCategory(ctx.question);
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const drops = await prisma.priceHistory.findMany({
    where: {
      recordedAt: { gte: since },
      product: cat ? { category: cat } : {},
    },
    orderBy: { recordedAt: "desc" },
    take: 50,
    select: {
      price: true, recordedAt: true,
      product: {
        select: {
          slug: true, name: true, brand: true, image: true, images: true,
          offers: { orderBy: { priceCurrent: "asc" }, take: 1,
            select: { store: true, priceCurrent: true, priceOld: true, discountPercent: true } },
        },
      },
    },
  });

  // Dedupe por slug — quedarse con el primero (más reciente).
  const seen = new Set<string>();
  const products: ProductWithOffers[] = [];
  for (const d of drops) {
    if (seen.has(d.product.slug)) continue;
    seen.add(d.product.slug);
    products.push(d.product);
    if (products.length >= 5) break;
  }

  if (products.length === 0) {
    return {
      answer: `No he visto bajadas notables ${cat ? "en esa categoría" : ""} en los últimos 14 días. Revisa [/bajadas-recientes](/bajadas-recientes) por si acaso.`,
      source: "intent", matched: "price_drops",
    };
  }

  const lines = products.map((p) => {
    const o = p.offers[0];
    return `- **${p.brand} ${p.name}** — ${formatPrice(o?.priceCurrent ?? null)}${o?.priceOld ? ` (antes ${formatPrice(o.priceOld)})` : ""} · [ver](/productos/${p.slug})`;
  });

  return {
    answer: [`Bajadas recientes${cat ? "" : " del catálogo"}:`, ...lines, ``, `Todas en [/bajadas-recientes](/bajadas-recientes).`].join("\n"),
    products: products.map(toChip),
    links: [{ label: "Todas las bajadas", href: "/bajadas-recientes" }],
    source: "intent", matched: "price_drops",
  };
}

async function intentRecommend(ctx: AssistantContext): Promise<AssistantAnswer> {
  const cat = detectCategory(ctx.question);
  if (!cat) {
    return {
      answer: "Dime de qué categoría quieres una recomendación: *lavadora*, *frigorífico*, *televisor*, *secadora*, *lavavajillas*, *horno*, *microondas*, *aspiradora*, *cafetera* o *aire acondicionado*. También tengo [guías de compra](/guias) por categoría.",
      links: [{ label: "Ver guías", href: "/guias" }],
      source: "intent", matched: "recommend",
    };
  }
  const products = await prisma.product.findMany({
    where: { category: cat, offers: { some: {} } },
    orderBy: [
      { rating:      { sort: "desc", nulls: "last" } },
      { reviewCount: { sort: "desc", nulls: "last" } },
    ],
    take: 5,
    select: {
      slug: true, name: true, brand: true, image: true, images: true, rating: true,
      offers: { orderBy: { priceCurrent: "asc" }, take: 1,
        select: { store: true, priceCurrent: true, priceOld: true, discountPercent: true } },
    },
  });
  if (products.length === 0) {
    return { answer: `Todavía no tengo recomendaciones suficientes en esa categoría. Revisa la [guía](/guias).`, source: "intent", matched: "recommend" };
  }
  const lines = products.map((p) => {
    const o = p.offers[0];
    const star = p.rating ? ` · ⭐ ${p.rating.toFixed(1)}` : "";
    return `- **${p.brand} ${p.name}** — ${formatPrice(o?.priceCurrent ?? null)}${star} · [ver](/productos/${p.slug})`;
  });
  return {
    answer: [`Top valorados que tengo en stock:`, ...lines, ``, `Más detalles en la [guía de la categoría](/guias).`].join("\n"),
    products: products.map(toChip),
    links: [{ label: "Guías de compra", href: "/guias" }],
    follow: ["¿Cuál tiene el mejor precio ahora?", "¿Cuál ahorra más energía?"],
    source: "intent", matched: "recommend",
  };
}

async function intentAccountState(ctx: AssistantContext): Promise<AssistantAnswer> {
  if (!ctx.userId) {
    return {
      answer: "Para ver tus productos y alertas necesitas [iniciar sesión](/login). Si no tienes cuenta, [créala gratis](/register).",
      links: [{ label: "Iniciar sesión", href: "/login" }, { label: "Crear cuenta", href: "/register" }],
      source: "intent", matched: "account_state",
    };
  }
  const [saved, alerts] = await Promise.all([
    prisma.savedProduct.count({ where: { userId: ctx.userId } }),
    prisma.priceAlert.count({ where: { userId: ctx.userId, active: true } }),
  ]);
  return {
    answer:
      `Tienes **${saved}** producto${saved === 1 ? "" : "s"} guardado${saved === 1 ? "" : "s"} y ` +
      `**${alerts}** alerta${alerts === 1 ? "" : "s"} de precio activa${alerts === 1 ? "" : "s"}. ` +
      `Gestiónalas desde tu [panel](/dashboard) o tu [perfil](/perfil).`,
    links: [
      { label: "Panel", href: "/dashboard" },
      { label: "Perfil", href: "/perfil" },
    ],
    source: "intent", matched: "account_state",
  };
}

function intentGuidesList(): AssistantAnswer {
  return {
    answer:
      "Tengo guías de compra de: **lavadoras**, **frigoríficos**, **televisores**, **lavavajillas**, **secadoras**, **hornos**, **microondas**, **aspiradoras**, **cafeteras** y **aires acondicionados**. " +
      "Cada una explica qué mirar, errores comunes, marcas y mejor momento para comprar. Empieza por [/guias](/guias).",
    links: [{ label: "Ver todas las guías", href: "/guias" }],
    source: "intent", matched: "guides_list",
  };
}

function intentCompareHelp(): AssistantAnswer {
  return {
    answer:
      "Para **comparar dos productos**: abre [tu panel](/dashboard), elige una categoría y toca dos productos. Solo se comparan dentro de la misma categoría (neveras con neveras, hornos con hornos). " +
      "También puedes buscar productos del catálogo desde ahí, no hace falta tenerlos guardados.",
    links: [{ label: "Ir al comparador", href: "/dashboard" }],
    source: "intent", matched: "compare_help",
  };
}

// ── Entrada principal ───────────────────────────────────────────────────────

/**
 * Responde a una pregunta del usuario sin LLM externo.
 * - Intenta primero un intent dinámico (con datos en vivo de BD).
 * - Si no, busca un topic estático en la KB.
 * - Si nada matchea, devuelve un fallback con sugerencias.
 */
export async function answerPublic(ctx: AssistantContext): Promise<AssistantAnswer> {
  const question = (ctx.question ?? "").trim();
  if (question.length < 2) {
    return { ...FALLBACK, answer: "Hazme una pregunta sobre productos, precios, ofertas o cómo usar la web." };
  }

  const intent = detectIntent(question);
  if (intent) {
    try {
      return await runIntent(intent, ctx);
    } catch {
      // Si la BD falla, no rompemos — caemos a topic estático.
    }
  }

  const topicMatch = findBestTopic(question, TOPICS);
  if (topicMatch) {
    return {
      answer: topicMatch.topic.answer,
      follow: topicMatch.topic.follow,
      source: "topic",
      matched: topicMatch.matchedKey,
    };
  }

  return FALLBACK;
}
