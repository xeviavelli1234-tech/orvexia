import "server-only";

/**
 * Dispatcher: orquesta NLU → TOOLS → plantillas. Sustituye la llamada
 * a Anthropic. Cuando el intent no es ejecutable cae al matcher de KB.
 */
import { detectIntent, type ConversationContext } from "./nlu";
import { executeTool } from "./tools";
import { matchTopic, answerLocally, followUps as kbFollowUps } from "./kb";

export interface DispatchResult {
  /** Texto a devolver al usuario. */
  reply: string;
  /** Categoría del match: "tool" | "kb" | "fallback" | "greeting". */
  source: "tool" | "kb" | "fallback" | "greeting" | "thanks";
  /** ID del topic matcheado (solo si source=kb). */
  matchedKey: string | null;
  /** Score (solo si source=kb). */
  matchedScore: number;
  /** Follow-ups sugeridos. */
  followUps: string[];
  /** Actualización de contexto para la próxima ronda. */
  contextUpdate: Partial<ConversationContext>;
}

const GREETING_REPLY =
  "Hola 👋 Soy tu Asistente Orvexia. Puedo: \n" +
  "- **Configurar** el repricer (rango, estrategia, activar/pausar, lanzar ciclo).\n" +
  "- **Listar** tu catálogo (todos, sin rango, repreciando, sin oferta).\n" +
  "- **Buscar productos** en el comparador (lavadoras, TVs, frigos…) y dar precios reales.\n" +
  "- Explicarte cualquier parte de la web. Pregúntame.";

const THANKS_REPLY = "A ti 🙂 Si necesitas algo más, aquí estoy.";

const TOOL_DEFAULT_FUS = [
  "Muéstrame mis productos sin rango",
  "Pon min 10 y max 20 al producto X",
  "Lanza un ciclo de reprecio ahora",
];

const CATALOG_DEFAULT_FUS = [
  "Cuáles son las mayores ofertas hoy",
  "Búscame los televisores más baratos",
  "Qué guías de compra tenéis",
];

export async function dispatch(
  userId: string,
  question: string,
  ctx: ConversationContext = {},
): Promise<DispatchResult> {
  const nlu = detectIntent(question, ctx);

  // ── Intents conversacionales (no usan tools ni KB) ───────────────────────
  if (nlu.intent === "greeting") {
    return {
      reply: GREETING_REPLY,
      source: "greeting",
      matchedKey: null,
      matchedScore: 0,
      followUps: TOOL_DEFAULT_FUS,
      contextUpdate: {},
    };
  }
  if (nlu.intent === "thanks") {
    return {
      reply: THANKS_REPLY,
      source: "thanks",
      matchedKey: null,
      matchedScore: 0,
      followUps: TOOL_DEFAULT_FUS,
      contextUpdate: {},
    };
  }

  // ── Intents ejecutables: invocan TOOL real ───────────────────────────────
  if (nlu.confidence >= 0.5 && isExecutable(nlu.intent)) {
    const toolReply = await runTool(userId, nlu.intent, nlu.slots);
    if (toolReply != null) {
      return {
        reply: toolReply,
        source: "tool",
        matchedKey: null,
        matchedScore: 0,
        followUps: followUpsFor(nlu.intent),
        contextUpdate: nlu.slots.productRef ? { lastProductRef: nlu.slots.productRef, lastCategory: nlu.slots.category } : { lastCategory: nlu.slots.category },
      };
    }
  }

  // ── Caída a KB (topics aprendidos / estáticos) ───────────────────────────
  const kb = matchTopic(question);
  if (kb && kb.matchedScore > 0) {
    return {
      reply: kb.answer,
      source: "kb",
      matchedKey: kb.matchedKey,
      matchedScore: kb.matchedScore,
      followUps: kb.follow ?? kbFollowUps(question),
      contextUpdate: {},
    };
  }

  // ── Último recurso: respuesta genérica de ayuda ──────────────────────────
  return {
    reply: answerLocally(question),
    source: "fallback",
    matchedKey: null,
    matchedScore: 0,
    followUps: kbFollowUps(question),
    contextUpdate: {},
  };
}

function isExecutable(intent: string): boolean {
  return [
    "set_range",
    "set_strategy",
    "toggle_on",
    "toggle_off",
    "run_now",
    "find_products",
    "search_catalog",
    "product_detail",
    "best_deals",
    "list_categories",
    "list_guides",
  ].includes(intent);
}

async function runTool(
  userId: string,
  intent: string,
  slots: import("./nlu").Slots,
): Promise<string | null> {
  switch (intent) {
    case "set_range": {
      if (slots.priceMin == null || slots.priceMax == null) {
        return faltaDato("Para fijar el rango necesito **min y max** numéricos. Ej.: *“pon min 10 y max 20 al producto X”*.");
      }
      if (!slots.productRef) return faltaDato("¿A qué producto le pongo el rango? Indícame nombre, SKU o ASIN.");
      return await executeTool(userId, "set_range", {
        query: slots.productRef,
        min: slots.priceMin,
        max: slots.priceMax,
      });
    }
    case "set_strategy": {
      if (!slots.strategy) return null;
      if (!slots.productRef) return faltaDato("¿En qué producto cambio la estrategia? Indícame nombre, SKU o ASIN.");
      return await executeTool(userId, "set_strategy", {
        query: slots.productRef,
        strategy: slots.strategy,
      });
    }
    case "toggle_on":
    case "toggle_off": {
      const enabled = intent === "toggle_on";
      if (slots.scopeAll && !slots.productRef) {
        return "Las acciones masivas se hacen desde el **Catálogo** (selección múltiple + botón Activo/Pausado). No puedo activarlas todas desde el chat por seguridad.";
      }
      if (!slots.productRef) {
        return faltaDato(`¿Qué producto quieres ${enabled ? "activar" : "pausar"}? Indícame nombre, SKU o ASIN.`);
      }
      return await executeTool(userId, "toggle_repricing", {
        query: slots.productRef,
        enabled,
      });
    }
    case "run_now":
      return await executeTool(userId, "run_repricer", {});
    case "find_products":
      return await executeTool(userId, "find_products", { filter: slots.filter ?? "all" });
    case "search_catalog":
      return await executeTool(userId, "search_products", {
        query: slots.productRef ?? "",
        category: slots.category,
        sort: slots.sort ?? "price",
        limit: 8,
      });
    case "product_detail":
      if (!slots.productRef) return null;
      return await executeTool(userId, "product_detail", { query: slots.productRef });
    case "best_deals":
      return await executeTool(userId, "best_deals", { category: slots.category });
    case "list_categories":
      return await executeTool(userId, "list_categories", {});
    case "list_guides":
      return await executeTool(userId, "list_guides", {});
    default:
      return null;
  }
}

function faltaDato(msg: string): string {
  return msg;
}

function followUpsFor(intent: string): string[] {
  switch (intent) {
    case "set_range":
    case "set_strategy":
    case "toggle_on":
    case "toggle_off":
      return [
        "Lanza un ciclo de reprecio ahora",
        "Muéstrame mis productos repreciando",
        "Cambia la estrategia a Ganar Buy Box",
      ];
    case "run_now":
      return [
        "Muéstrame mis productos con error",
        "Cuántos productos están en mínimo",
        "Pásame las analíticas del último ciclo",
      ];
    case "find_products":
      return [
        "Pon min 10 y max 20 al primero",
        "Activa el reprecio del primero",
        "Lanza un ciclo de reprecio ahora",
      ];
    case "search_catalog":
    case "product_detail":
    case "best_deals":
      return CATALOG_DEFAULT_FUS;
    case "list_categories":
      return ["Qué guías de compra tenéis", "Cuáles son las mayores ofertas hoy"];
    case "list_guides":
      return ["Cuáles son las mayores ofertas hoy", "Búscame el frigorífico más barato"];
    default:
      return TOOL_DEFAULT_FUS;
  }
}
