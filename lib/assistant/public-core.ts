/**
 * Lógica pura del asistente público (sin `server-only`): tipos, detección de
 * intent, detección de categoría y la lista de topics estáticos. Se separa
 * de `public.ts` para poder testearla con `tsx --test` sin entornos server.
 */

import { normalize, type MatcherTopic } from "./matcher";
import type { Category } from "@/app/generated/prisma/client";

// ── Tipos públicos ──────────────────────────────────────────────────────────

export interface PublicTopic extends MatcherTopic {
  answer: string;
  follow?: string[];
}

export interface AssistantContext {
  question: string;
  userId?: string | null;
}

export interface AssistantAnswer {
  /** Texto Markdown-lite (negrita con **, listas "- ", enlaces [txt](url)). */
  answer: string;
  /** Productos relacionados — el cliente los puede pintar como tarjetas. */
  products?: ProductChip[];
  /** Enlaces sugeridos para el final del mensaje. */
  links?: { label: string; href: string }[];
  /** Preguntas sugeridas para seguir la conversación. */
  follow?: string[];
  /** De dónde salió la respuesta (debug). */
  source: "intent" | "topic" | "fallback";
  /** Nombre del intent o topic matcheado. */
  matched?: string;
}

export interface ProductChip {
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  price: number | null;
  oldPrice: number | null;
  discount: number | null;
  store: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function formatPrice(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

// ── Detección de categoría dentro de una pregunta ───────────────────────────
// Reusa los sinónimos del buscador a través de palabras-clave directas.

const CATEGORY_KEYWORDS: Array<{ words: string[]; cat: Category }> = [
  { cat: "FRIGORIFICOS",         words: ["nevera", "neveras", "frigo", "frigos", "frigorifico", "frigorificos", "frigorific", "fridge", "neveira", "hozkailu", "congelador", "congeladores"] },
  { cat: "TELEVISORES",          words: ["tv", "tvs", "tele", "teles", "televisor", "televisores", "television", "televisio", "telebista"] },
  { cat: "LAVADORAS",            words: ["lavadora", "lavadoras", "rentadora", "rentadores", "washer", "washing", "garbigailu"] },
  { cat: "SECADORAS",            words: ["secadora", "secadoras", "assecadora", "dryer", "lehorgailu"] },
  { cat: "LAVAVAJILLAS",         words: ["lavavajillas", "lavaplatos", "rentaplats", "rentavaixella", "dishwasher", "lavalouza", "lavalouzas"] },
  { cat: "HORNOS",               words: ["horno", "hornos", "forn", "forno", "oven", "labe"] },
  { cat: "MICROONDAS",           words: ["microondas", "microones", "microwave", "mikrouhin"] },
  { cat: "ASPIRADORAS",          words: ["aspirador", "aspiradora", "aspiradores", "aspiradoras", "vacuum", "xurgagailu", "roomba", "escoba"] },
  { cat: "CAFETERAS",            words: ["cafetera", "cafeteras", "espresso", "nespresso", "coffee"] },
  { cat: "AIRES_ACONDICIONADOS", words: ["aire", "aires", "split", "splits", "condicionado", "condicionat", "girotu"] },
];

export function detectCategory(question: string): Category | null {
  const q = normalize(question);
  for (const { cat, words } of CATEGORY_KEYWORDS) {
    for (const w of words) {
      const nw = normalize(w);
      const re = new RegExp(`(^|[^a-z0-9])${nw}([^a-z0-9]|$)`, "i");
      if (re.test(q)) return cat;
    }
  }
  return null;
}

// ── Intents dinámicos (detección, no ejecución) ─────────────────────────────

export type IntentName =
  | "price"
  | "deals"
  | "price_drops"
  | "recommend"
  | "account_state"
  | "guides_list"
  | "compare_help";

export interface IntentMatch {
  name: IntentName;
  /** Texto extra capturado del prompt (p. ej. el producto consultado). */
  payload?: string;
}

/**
 * Detecta SI la pregunta encaja con un intent, y extrae el payload si procede.
 * No toca la BD — testeable sin prisma.
 */
export function detectIntent(question: string): IntentMatch | null {
  const q = normalize(question);
  if (!q.trim()) return null;

  // Orden importa: empezar por los intents MÁS específicos. P. ej. "bajadas
  // de precio recientes" contiene la palabra "precio" — si el chequeo de
  // `price` se hace antes que `price_drops`, gana el incorrecto.

  // account_state: "mis guardados", "mis alertas", "mis productos", "mi cuenta"
  if (/\b(mis (?:guardados|alertas|productos|favoritos)|cuantos (?:guardados|alertas)|mi cuenta|tengo (?:guardados|alertas))\b/.test(q)) {
    return { name: "account_state" };
  }

  // price_drops: "bajadas", "ha bajado", "qué ha bajado", "bajadas recientes"
  if (/\b(bajada|bajadas|ha bajado|han bajado|que ha bajado|que han bajado)\b/.test(q)) {
    return { name: "price_drops" };
  }

  // compare_help: "comparar X y Y", "comparativa"
  if (/\b(comparar|comparativa|comparador|comparo)\b/.test(q)) {
    return { name: "compare_help" };
  }

  // guides_list: "guías", "guia de compra", "qué guías"
  if (/\b(guia|guias|guia de compra|que guias|cuales guias)\b/.test(q)) {
    return { name: "guides_list" };
  }

  // recommend: incluye sufijos pegados ("recomiéndame", "recomiéndanos").
  if (/\b(recomien(?:da|das|dame|danos)|recomendaci(?:on|ones)|cual comprar|que comprar|mejor)\b/.test(q)) {
    return { name: "recommend" };
  }

  // deals: "ofertas", "descuentos", "rebajas", "chollos", "barat..."
  if (/\b(oferta|ofertas|descuento|descuentos|rebaja|rebajas|chollo|chollos|barato|baratos|barata|baratas)\b/.test(q)) {
    return { name: "deals" };
  }

  // price: "precio de X", "cuánto cuesta X", "cuánto vale X", "a cómo está X".
  // Lo último porque "precio" aparece dentro de muchas otras frases.
  {
    const re = /(?:precio (?:de )?|cuanto (?:cuesta|vale) (?:el |la |los |las )?|cual es el precio (?:de )?|a como esta )(.+)/i;
    const m = q.match(re);
    if (m && m[1].trim().length >= 2) return { name: "price", payload: m[1].trim() };
  }

  return null;
}

// ── Topics estáticos ────────────────────────────────────────────────────────

export const TOPICS: PublicTopic[] = [
  {
    keys: ["buscador", "buscar", "como buscar", "search"],
    phrases: ["cómo se busca", "como se busca", "cómo encuentro", "como encuentro"],
    answer:
      "El **buscador** está en la cabecera y en [/buscar](/buscar). Entiende sin tildes, sinónimos (nevera = frigorífico, tele = TV), erratas comunes de marca (samnsung → Samsung) y también **catalán, inglés, gallego y euskera** (*rentadora*, *fridge*, *hozkailu*…). Ordena por relevancia y muestra el mejor precio.",
    follow: ["¿Cómo guardo un producto?", "¿Qué ofertas hay ahora?"],
  },
  {
    keys: ["categorias", "categoria", "que categorias", "tipos de productos"],
    answer:
      "Tengo 10 categorías: **televisores, frigoríficos, lavadoras, secadoras, lavavajillas, hornos, microondas, aspiradoras, cafeteras y aires acondicionados**. Cada una en [/categorias](/categorias) con filtros por marca, precio y características.",
    follow: ["¿Cuál es la mejor lavadora?", "¿Qué ofertas hay en frigoríficos?"],
  },
  {
    keys: ["guardar producto", "guardar", "guardados", "favoritos", "favorito"],
    phrases: ["cómo guardo", "como guardo", "guardar en favoritos"],
    answer:
      "En cada ficha de producto hay un **corazón ♥**. Tócalo para guardarlo. Lo encontrarás luego en [tu panel](/dashboard) o en [tu perfil](/perfil) — y podrás compararlo o crear alerta de precio.",
    follow: ["¿Cómo creo una alerta de precio?", "¿Dónde veo mis guardados?"],
  },
  {
    keys: ["alerta", "alertas", "alerta de precio", "avisar precio", "notificacion precio"],
    phrases: ["alerta de precio", "avisame cuando baje", "notificame el precio", "como creo una alerta"],
    answer:
      "Las **alertas de precio** te avisan por email cuando un producto baja al precio que pidas. " +
      "Desde la ficha del producto, botón *\"Crear alerta\"*. Defines el precio objetivo o pides que te avise en cualquier bajada. " +
      "Las gestionas desde [/perfil](/perfil).",
    follow: ["¿Cómo me llega el aviso?", "¿Cuántas alertas puedo tener?"],
  },
  {
    keys: ["comparador", "comparar productos", "comparativa"],
    phrases: ["como comparo", "cómo comparo", "como uso el comparador"],
    answer:
      "El **comparador** está en [tu panel](/dashboard). Eliges categoría, tocas dos productos y te enseña una tabla lado a lado con: precio, descuento, ahorro, mínimo histórico, valoración, reseñas, tiendas, stock, specs (pulgadas, capacidad, eficiencia…) y pros/contras. Solo se comparan productos de **la misma categoría**.",
    follow: ["¿Qué mide el score?", "¿Cómo se calcula el mínimo histórico?"],
  },
  {
    keys: ["ficha", "ficha de producto", "pagina de producto", "historial de precio"],
    phrases: ["historial de precios", "mínimo histórico", "minimo historico"],
    answer:
      "En la **ficha de cada producto** ves: precio actual por tienda, **historial de precios** (gráfica + mínimo histórico de 90 días), descuento, valoración media y reseñas, fotos, ofertas en varias tiendas, botón para guardar y botón para crear alerta.",
    follow: ["¿Por qué hay varios precios por tienda?", "¿Las reseñas son reales?"],
  },
  {
    keys: ["guias", "guia de compra", "guias de compra", "que mirar"],
    phrases: ["cómo elegir", "como elegir"],
    answer:
      "En [/guias](/guias) tengo una guía por categoría: qué specs mirar, errores comunes, marcas con sus puntos fuertes/débiles, mejor momento para comprar y términos técnicos explicados.",
    follow: ["¿Cuál es la mejor lavadora?", "¿Qué televisor compro?"],
  },
  {
    keys: ["ofertas destacadas", "mejores ofertas", "que ofertas"],
    answer:
      "Las mejores ofertas activas están en [/ofertas-destacadas](/ofertas-destacadas), diversificadas por categoría. Las **bajadas de precio recientes** en [/bajadas-recientes](/bajadas-recientes).",
    follow: ["¿Ofertas en frigoríficos?", "¿Qué ha bajado esta semana?"],
  },
  {
    keys: ["popularidad", "populares", "mas vendidos", "que se compra"],
    answer:
      "En [/popularidad](/popularidad) ves los productos más buscados/guardados/comprados de cada categoría.",
  },
  {
    keys: ["recomendados", "recomendados para mi"],
    answer:
      "En [/recomendados](/recomendados) te muestro recomendaciones según lo que has visto y guardado.",
  },
  {
    keys: ["comunidad", "foro", "preguntas", "discusiones"],
    answer:
      "La [comunidad](/comunidad) es un foro donde los usuarios preguntan, comentan productos, votan y comparten experiencias reales. Puedes [iniciar sesión](/login) y participar.",
    follow: ["¿Cómo publico una pregunta?", "¿Quién modera?"],
  },
  {
    keys: ["opiniones", "reseñas", "reviews", "valoraciones"],
    answer:
      "En [/opiniones](/opiniones) lees reseñas reales de los productos. También puedes dejar la tuya desde la ficha si has comprado el producto.",
  },
  {
    keys: ["fotos", "imagenes reales", "fotos usuarios"],
    answer:
      "En [/fotos](/fotos) se ven fotos reales subidas por usuarios. Útil para hacerte una idea del tamaño y aspecto antes de comprar.",
  },
  {
    keys: ["registro", "registrarme", "crear cuenta", "alta", "sign up"],
    phrases: ["cómo me registro", "como me registro", "cómo creo cuenta", "como creo cuenta"],
    answer:
      "Crea cuenta en [/register](/register) con email + contraseña, o entra por **magic link** (te enviamos un enlace al email). Si quieres más seguridad, activa **passkeys** o **2FA** desde tu perfil.",
    follow: ["¿Qué es un magic link?", "¿Cómo activo passkeys?"],
  },
  {
    keys: ["login", "iniciar sesion", "entrar", "sign in", "magic link", "passkey", "passkeys"],
    answer:
      "Entra en [/login](/login). Tienes 3 opciones: **email + contraseña**, **magic link** (enlace al email, sin contraseña) y **passkey** (huella/Face ID del dispositivo). Si tienes 2FA activado te lo pedirá después.",
  },
  {
    keys: ["2fa", "doble factor", "autenticacion de dos factores", "totp", "google authenticator"],
    answer:
      "Activa **2FA** desde tu [perfil → Seguridad](/perfil). Escanea el QR con Google Authenticator, 1Password o cualquier app TOTP y guarda los códigos de recuperación. La próxima vez que entres pedirá el código de 6 dígitos.",
  },
  {
    keys: ["contraseña", "password", "olvide mi password", "recuperar contraseña", "reset password"],
    answer:
      "Si olvidaste la contraseña, pide un **magic link** en [/login](/login) y entrarás sin password; ya dentro puedes cambiarla en tu [perfil](/perfil).",
  },
  {
    keys: ["cookies", "consentimiento cookies", "banner cookies"],
    answer:
      "Gestionamos las cookies con consentimiento granular. Detalle en [/politica-cookies](/politica-cookies). Puedes cambiar tus preferencias en cualquier momento desde el botón del pie de página.",
  },
  {
    keys: ["privacidad", "rgpd", "gdpr", "mis datos", "datos personales", "borrar mi cuenta", "borrar cuenta", "eliminar cuenta"],
    answer:
      "Puedes **descargar tus datos** o **borrar tu cuenta** desde tu [perfil](/perfil) → *Datos y privacidad*. Política completa en [/politica-privacidad](/politica-privacidad).",
  },
  {
    keys: ["aviso legal", "terminos", "condiciones"],
    answer:
      "Aviso legal y términos en [/aviso-legal](/aviso-legal).",
  },
  {
    keys: ["afiliacion", "afiliados", "como ganais dinero", "comision"],
    phrases: ["cómo ganáis dinero", "como ganais dinero", "modelo de negocio"],
    answer:
      "Orvexia es **gratis** para el usuario. Cuando compras tras hacer clic en una oferta, la tienda nos paga una pequeña comisión de afiliación — esto no encarece el precio para ti. Los precios y rankings **no dependen** de la comisión: ordenamos por valor real.",
  },
  {
    keys: ["amazon", "elcorteingles", "el corte ingles", "pccomponentes", "fnac", "mediamarkt", "lg"],
    answer:
      "Comparamos precios en **Amazon, El Corte Inglés, PcComponentes, Fnac, MediaMarkt y LG**. En cada ficha verás los precios actuales de las tiendas que tengan el producto.",
  },
  {
    keys: ["sellers", "repricer", "vender", "vendedor", "amazon seller"],
    answer:
      "Si eres **vendedor de Amazon**, Orvexia tiene un módulo de **repricer automático** en [/sellers](/sellers). Te ayuda a ganar Buy Box y proteger tu margen. Ese módulo tiene su propio asistente especializado dentro del panel.",
  },
  {
    keys: ["contacto", "soporte", "ayuda", "email", "escribiros"],
    answer:
      "Para soporte general, escríbenos desde [/sobre-nosotros](/sobre-nosotros) o usa el formulario de contacto. Si es algo de tu cuenta, asegúrate de iniciar sesión primero.",
  },
];

export const FALLBACK: AssistantAnswer = {
  answer:
    "No estoy seguro de a qué te refieres. Puedo ayudarte con:\n" +
    "- **Buscar productos o saber un precio** (*\"precio del Samsung Q80C\"*)\n" +
    "- **Ofertas y bajadas recientes** (*\"ofertas en frigoríficos\"*)\n" +
    "- **Recomendaciones** (*\"recomiéndame una lavadora\"*)\n" +
    "- **Cómo funciona la web**: alertas, guardados, comparador, guías, comunidad…\n" +
    "- **Tu cuenta**: registro, login, 2FA, RGPD, datos.",
  links: [
    { label: "Buscar", href: "/buscar" },
    { label: "Ofertas destacadas", href: "/ofertas-destacadas" },
    { label: "Guías", href: "/guias" },
  ],
  source: "fallback",
};
