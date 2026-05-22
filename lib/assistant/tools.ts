import "server-only";
import { prisma } from "@/lib/prisma";
import type { Category } from "@/app/generated/prisma/client";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import {
  listListingsByAccount,
  getListingForUser,
  setListingRange,
  setListingStrategy,
  setListingEnabled,
} from "@/lib/db/sellerListing";
import { runRepricer } from "@/lib/reprice/runner";

export const TOOLS = [
  {
    name: "find_products",
    description:
      "Busca productos del usuario por nombre/SKU/ASIN o lista por estado. Úsalo para resolver a qué producto se refiere antes de modificar.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Texto a buscar en título, SKU o ASIN." },
        filter: {
          type: "string",
          enum: ["all", "unconfigured", "active", "noprice"],
          description: "Filtrar: todos, sin rango, repreciando, sin oferta.",
        },
      },
    },
  },
  {
    name: "set_range",
    description:
      "Fija el precio mínimo y máximo de un producto. Al fijar ambos se ACTIVA el reprecio automáticamente.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Nombre/SKU/ASIN del producto." },
        min: { type: "number" },
        max: { type: "number" },
      },
      required: ["query", "min", "max"],
    },
  },
  {
    name: "set_strategy",
    description: "Configura la estrategia de reprecio de un producto.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        strategy: { type: "string", enum: ["BUYBOX", "MATCH", "FIXED", "MARGIN"] },
        undercutType: { type: "string", enum: ["AMOUNT", "PERCENT"] },
        undercutValue: { type: "number" },
        fixedPrice: { type: "number" },
        cost: { type: "number" },
        feePercent: { type: "number" },
        targetMargin: { type: "number" },
        noCompetition: { type: "string", enum: ["MAX", "HOLD"] },
      },
      required: ["query", "strategy"],
    },
  },
  {
    name: "toggle_repricing",
    description: "Activa o pausa el reprecio automático de un producto.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        enabled: { type: "boolean" },
      },
      required: ["query", "enabled"],
    },
  },
  {
    name: "run_repricer",
    description: "Lanza un ciclo de reprecio inmediato para la cuenta del usuario.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "search_products",
    description:
      "Comparador: busca productos por texto y/o categoría y devuelve el mejor precio y tienda. Para preguntas de precios/ofertas/'el más barato'.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Texto a buscar (nombre, marca, modelo)." },
        category: {
          type: "string",
          description:
            "Categoría: televisor, lavadora, frigorifico, lavavajillas, secadora, horno, microondas, aspiradora, cafetera, aire acondicionado.",
        },
        sort: { type: "string", enum: ["price", "rating", "discount"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "product_detail",
    description: "Comparador: ficha de un producto con precios por tienda y enlace.",
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "best_deals",
    description: "Comparador: mayores descuentos/bajadas de precio (opcional por categoría).",
    input_schema: {
      type: "object" as const,
      properties: { category: { type: "string" } },
    },
  },
  {
    name: "list_categories",
    description: "Comparador: categorías disponibles y cuántos productos hay en cada una.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "list_guides",
    description: "Comparador: guías de compra disponibles y sus enlaces.",
    input_schema: { type: "object" as const, properties: {} },
  },
];

const CAT_MAP: Array<[RegExp, Category]> = [
  [/televis|tv\b/i, "TELEVISORES"],
  [/lavadora/i, "LAVADORAS"],
  [/frigor|nevera|combi/i, "FRIGORIFICOS"],
  [/lavavaj/i, "LAVAVAJILLAS"],
  [/secadora/i, "SECADORAS"],
  [/horno/i, "HORNOS"],
  [/microond/i, "MICROONDAS"],
  [/aspirador/i, "ASPIRADORAS"],
  [/cafeter/i, "CAFETERAS"],
  [/aire|aacc|acondicion/i, "AIRES_ACONDICIONADOS"],
];
function toCategory(s?: string): Category | undefined {
  if (!s) return undefined;
  for (const [re, c] of CAT_MAP) if (re.test(s)) return c;
  return undefined;
}
function price(n: number) {
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

const GUIDES: Array<[string, string]> = [
  ["mejor-lavadora", "Mejor lavadora"],
  ["mejor-televisor", "Mejor televisor"],
  ["mejor-frigorifico", "Mejor frigorífico"],
  ["mejor-lavavajillas", "Mejor lavavajillas"],
  ["mejor-secadora", "Mejor secadora"],
  ["mejor-horno", "Mejor horno"],
  ["mejor-microondas", "Mejor microondas"],
  ["mejor-aspiradora", "Mejor aspiradora"],
  ["mejor-cafetera", "Mejor cafetera"],
  ["mejor-aire-acondicionado", "Mejor aire acondicionado"],
];

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

type Listing = Awaited<ReturnType<typeof listListingsByAccount>>[number];

function stateOf(l: Listing): string {
  if (l.priceCurrent <= 0 || !l.asin) return "gris (sin oferta)";
  if (l.repricingEnabled) return "verde (repreciando)";
  if (l.priceMin != null && l.priceMax != null) return "azul (config, pausado)";
  return "azul (sin rango)";
}

async function resolve(userId: string, query: string) {
  const acc = await getSellerAccountByUserId(userId);
  if (!acc || !acc.active) return { error: "El usuario no tiene cuenta de Amazon conectada." };
  const all = await listListingsByAccount(acc.id);
  const q = norm(query);
  const hits = all.filter(
    (l) =>
      norm(l.title).includes(q) ||
      norm(l.sku).includes(q) ||
      norm(l.asin).includes(q),
  );
  if (hits.length === 0) return { error: `No encontré ningún producto que coincida con "${query}".` };
  if (hits.length > 1) {
    return {
      error: `Hay ${hits.length} productos que coinciden: ${hits
        .slice(0, 6)
        .map((h) => `"${h.title.slice(0, 40)}" (SKU ${h.sku})`)
        .join("; ")}. Pide al usuario que concrete (por SKU).`,
    };
  }
  return { listing: hits[0] };
}

export async function executeTool(
  userId: string,
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  try {
    if (name === "find_products") {
      const acc = await getSellerAccountByUserId(userId);
      if (!acc || !acc.active) return "El usuario no tiene cuenta de Amazon conectada.";
      let items = await listListingsByAccount(acc.id);
      const filter = String(input.filter ?? "all");
      if (filter === "active") items = items.filter((l) => l.repricingEnabled);
      else if (filter === "noprice") items = items.filter((l) => l.priceCurrent <= 0 || !l.asin);
      else if (filter === "unconfigured")
        items = items.filter((l) => l.priceMin == null || l.priceMax == null);
      const query = input.query ? norm(String(input.query)) : "";
      if (query)
        items = items.filter(
          (l) =>
            norm(l.title).includes(query) ||
            norm(l.sku).includes(query) ||
            norm(l.asin).includes(query),
        );
      if (items.length === 0) return "Sin coincidencias.";
      return items
        .slice(0, 12)
        .map(
          (l) =>
            `• "${l.title.slice(0, 50)}" | SKU ${l.sku} | ${l.priceCurrent} ${l.currency} | ${l.strategy} | ${
              l.priceMin != null && l.priceMax != null ? `${l.priceMin}-${l.priceMax}` : "sin rango"
            } | ${stateOf(l)}`,
        )
        .join("\n");
    }

    if (name === "set_range") {
      const r = await resolve(userId, String(input.query ?? ""));
      if ("error" in r) return r.error!;
      const min = Number(input.min);
      const max = Number(input.max);
      if (!(min > 0) || !(max > 0) || min > max)
        return "Rango inválido: min y max deben ser > 0 y min ≤ max.";
      await setListingRange({ listingId: r.listing!.id, userId, priceMin: min, priceMax: max });
      return `Rango fijado en "${r.listing!.title.slice(0, 40)}": ${min}–${max} ${r.listing!.currency}. Reprecio activado.`;
    }

    if (name === "set_strategy") {
      const r = await resolve(userId, String(input.query ?? ""));
      if ("error" in r) return r.error!;
      const cur = await getListingForUser({ listingId: r.listing!.id, userId });
      if (!cur) return "No se pudo cargar el producto.";
      const strategy = String(input.strategy) as "BUYBOX" | "MATCH" | "FIXED" | "MARGIN";
      try {
        await setListingStrategy({
          listingId: cur.id,
          userId,
          strategy,
          undercutType:
            (input.undercutType as "AMOUNT" | "PERCENT") ?? cur.undercutType ?? "AMOUNT",
          undercutValue: Number(input.undercutValue ?? cur.undercutValue ?? 0.01),
          fixedPrice:
            input.fixedPrice != null ? Number(input.fixedPrice) : cur.fixedPrice ?? null,
          cost: input.cost != null ? Number(input.cost) : cur.cost ?? null,
          shippingCost: cur.shippingCost ?? null,
          fbaFee: cur.fbaFee ?? null,
          vatRate: cur.vatRate ?? 21,
          feePercent:
            input.feePercent != null ? Number(input.feePercent) : cur.feePercent ?? 15,
          targetMargin:
            input.targetMargin != null ? Number(input.targetMargin) : cur.targetMargin ?? 10,
          noCompetition:
            (input.noCompetition as "MAX" | "HOLD" | "STEP_UP") ??
            cur.noCompetition ??
            "MAX",
          stepUpType: cur.stepUpType ?? "AMOUNT",
          stepUpValue: cur.stepUpValue ?? 0.05,
        });
      } catch (e) {
        return `No se pudo: ${e instanceof Error ? e.message : "error"}.`;
      }
      return `Estrategia de "${cur.title.slice(0, 40)}" cambiada a ${strategy}.`;
    }

    if (name === "toggle_repricing") {
      const r = await resolve(userId, String(input.query ?? ""));
      if ("error" in r) return r.error!;
      try {
        await setListingEnabled({
          listingId: r.listing!.id,
          userId,
          enabled: Boolean(input.enabled),
        });
      } catch (e) {
        return `No se pudo activar: ${e instanceof Error ? e.message : "error"} (¿falta rango o precio?).`;
      }
      return `Reprecio ${input.enabled ? "ACTIVADO" : "PAUSADO"} en "${r.listing!.title.slice(0, 40)}".`;
    }

    if (name === "run_repricer") {
      const s = await runRepricer();
      return `Ciclo ejecutado: ${s.listingsProcessed} procesados, ${s.listingsRepriced} reprecciados, ${s.errors} errores.`;
    }

    if (name === "search_products") {
      const cat = toCategory(input.category as string | undefined);
      const q = (input.query as string | undefined)?.trim();
      const sort = String(input.sort ?? "price");
      const limit = Math.min(15, Math.max(1, Number(input.limit ?? 8)));
      const products = await prisma.product.findMany({
        where: {
          ...(cat ? { category: cat } : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  { brand: { contains: q, mode: "insensitive" as const } },
                  { model: { contains: q, mode: "insensitive" as const } },
                ],
              }
            : {}),
          offers: { some: { inStock: true } },
        },
        include: {
          offers: { where: { inStock: true }, orderBy: { priceCurrent: "asc" }, take: 1 },
        },
        take: 60,
      });
      const rows = products
        .filter((p) => p.offers.length > 0)
        .map((p) => ({
          name: p.name,
          brand: p.brand,
          slug: p.slug,
          rating: p.rating ?? 0,
          best: p.offers[0].priceCurrent,
          store: p.offers[0].store,
          disc: p.offers[0].discountPercent ?? 0,
        }));
      rows.sort((a, b) =>
        sort === "rating"
          ? b.rating - a.rating
          : sort === "discount"
            ? b.disc - a.disc
            : a.best - b.best,
      );
      if (rows.length === 0) return "Sin resultados en el comparador. Sugiere usar /buscar.";
      return rows
        .slice(0, limit)
        .map(
          (r) =>
            `• ${r.name} (${r.brand}) — ${price(r.best)} en ${r.store}${
              r.rating ? ` · ⭐${r.rating}` : ""
            } · /productos/${r.slug}`,
        )
        .join("\n");
    }

    if (name === "product_detail") {
      const q = String(input.query ?? "").trim();
      if (!q) return "Indica el producto.";
      const p = await prisma.product.findFirst({
        where: {
          OR: [
            { slug: q.toLowerCase() },
            { name: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          offers: { where: { inStock: true }, orderBy: { priceCurrent: "asc" } },
          reviews: { select: { rating: true } },
        },
      });
      if (!p) return `No encontré "${q}" en el comparador.`;
      const avg =
        p.reviews.length > 0
          ? (p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length).toFixed(1)
          : p.rating
            ? String(p.rating)
            : "—";
      const offers = p.offers
        .slice(0, 8)
        .map((o) => `  - ${o.store}: ${price(o.priceCurrent)}${o.discountPercent ? ` (-${o.discountPercent}%)` : ""} → ${o.externalUrl}`)
        .join("\n");
      const min = p.offers.length ? price(p.offers[0].priceCurrent) : "sin ofertas";
      return `${p.name} (${p.brand})\nValoración: ${avg}${p.reviewCount ? ` (${p.reviewCount} reseñas)` : ""}\nMejor precio: ${min}\nOfertas:\n${offers || "  (sin ofertas en stock)"}\nFicha: /productos/${p.slug}`;
    }

    if (name === "best_deals") {
      const cat = toCategory(input.category as string | undefined);
      const offers = await prisma.offer.findMany({
        where: {
          inStock: true,
          discountPercent: { not: null, gt: 0 },
          ...(cat ? { product: { category: cat } } : {}),
        },
        include: { product: { select: { name: true, slug: true } } },
        orderBy: { discountPercent: "desc" },
        take: 12,
      });
      if (offers.length === 0) return "Ahora mismo no hay descuentos destacados. Ver /ofertas-destacadas.";
      return offers
        .map(
          (o) =>
            `• ${o.product.name} — -${o.discountPercent}% → ${price(o.priceCurrent)} en ${o.store} · /productos/${o.product.slug}`,
        )
        .join("\n");
    }

    if (name === "list_categories") {
      const groups = await prisma.product.groupBy({
        by: ["category"],
        _count: { _all: true },
      });
      const friendly: Record<string, string> = {
        TELEVISORES: "Televisores",
        LAVADORAS: "Lavadoras",
        FRIGORIFICOS: "Frigoríficos",
        LAVAVAJILLAS: "Lavavajillas",
        SECADORAS: "Secadoras",
        HORNOS: "Hornos",
        MICROONDAS: "Microondas",
        ASPIRADORAS: "Aspiradoras",
        CAFETERAS: "Cafeteras",
        AIRES_ACONDICIONADOS: "Aires acondicionados",
        OTROS: "Otros",
      };
      return groups
        .sort((a, b) => b._count._all - a._count._all)
        .map((g) => `• ${friendly[g.category] ?? g.category}: ${g._count._all} productos`)
        .join("\n") + "\nVer todas en /categorias";
    }

    if (name === "list_guides") {
      return (
        GUIDES.map(([slug, title]) => `• ${title} → /guias/${slug}`).join("\n") +
        "\nÍndice en /guias"
      );
    }

    return `Herramienta desconocida: ${name}.`;
  } catch (e) {
    return `Error ejecutando ${name}: ${e instanceof Error ? e.message : "desconocido"}.`;
  }
}
