import "server-only";
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
          feePercent:
            input.feePercent != null ? Number(input.feePercent) : cur.feePercent ?? 15,
          targetMargin:
            input.targetMargin != null ? Number(input.targetMargin) : cur.targetMargin ?? 10,
          noCompetition:
            (input.noCompetition as "MAX" | "HOLD") ?? cur.noCompetition ?? "MAX",
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

    return `Herramienta desconocida: ${name}.`;
  } catch (e) {
    return `Error ejecutando ${name}: ${e instanceof Error ? e.message : "desconocido"}.`;
  }
}
