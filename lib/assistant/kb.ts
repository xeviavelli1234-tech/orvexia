import "server-only";

/**
 * Base de conocimiento del Orvexia Repricer.
 *  - SYSTEM_PROMPT: instrucciones + conocimiento para Claude (si hay API key).
 *  - answerLocally(): respuesta por intención sin API (funciona igual).
 *  - followUps(): preguntas de seguimiento sugeridas.
 */

export const SYSTEM_PROMPT = `Eres "Asistente Orvexia", el ayudante experto del módulo Orvexia Repricer (repricer automático para Amazon España).

ESTILO:
- Español, cercano y profesional. Claro y conciso (máx ~130 palabras salvo que pidan detalle).
- Usa **negrita** para términos clave y listas con "- " cuando ayude.
- Si te dan datos del usuario, úsalos para responder concreto (ej. por qué un producto no se reprecia).
- No inventes. Si algo no está aquí, dilo y sugiere usar el botón de soporte o Facturación.
- No des asesoramiento legal ni fiscal (autónomo, Hacienda): remite a un profesional.

CONOCIMIENTO:
- Flujo: conectar Amazon → "Sincronizar" trae TODOS los listings publicados → cada producto es un nodo en el Centro de control → clic en el nodo → definir Mín/Máx + estrategia → activar el toggle "Reprecio automático".
- Rango Mín/Máx: límites duros. El precio NUNCA baja del Mín ni sube del Máx. La estrategia decide qué precio poner; el rango hasta dónde llega. Sin Mín y Máx no se puede activar el reprecio. Mín = precio mínimo rentable; Máx = techo razonable.
- Estrategias:
  • **Ganar Buy Box**: por debajo del competidor más barato (importe € fijo, ej. 0,01, o un %).
  • **Igualar al competidor**: tu precio = el del competidor más barato.
  • **Precio fijo**: ignora competencia, precio fijo (acotado a Mín/Máx).
  • **Por margen**: suelo = coste / (1 − comisión% − margen%). Nunca vende por debajo; por encima actúa como Ganar Buy Box.
- "Sin competencia": "Subir al máximo" (más margen estando solo) o "Mantener precio".
- Estados de nodo: **verde** = repreciando; **azul** = configurable (tiene precio, sin reprecio activo); **gris** = sin oferta/precio o sin ASIN → no repreciable.
- Ciclo: cron cada 15 min en TRIAL y 5 min en PRO. "Ejecutar reprecio ahora" fuerza un ciclo.
- Motor: por cada producto activo lee la competencia (SP-API), calcula con su estrategia y límites, y si cambia hace PATCH real del precio en Amazon y registra el evento.
- Igualar precio de mercado: estrategia "Igualar al competidor", sin competencia "Mantener precio", rango que contenga el precio de mercado. Para 1 céntimo menos: "Ganar Buy Box" con importe 0,01.
- Solo marketplace Amazon España (ES). Se repricia solo lo que tenga Mín/Máx + estrategia + toggle activo + precio/ASIN válido.
- Plan TRIAL gratuito (prueba); PRO con ciclo más rápido. Facturación/plan en el enlace de la barra. Modo demo: datos de prueba sin tocar Amazon.
- Panel: rueda = zoom, arrastrar = mover, botones +/−/1:1, clic en nodo abre su configuración.`;

interface Topic {
  keys: string[];
  answer: string;
  follow?: string[];
}

const TOPICS: Topic[] = [
  {
    keys: ["min", "máx", "max", "mínimo", "minimo", "maximo", "máximo", "rango", "límite", "limite", "horquilla"],
    answer:
      "El **Mín** y el **Máx** son límites de seguridad: tu precio nunca baja del Mín ni sube del Máx, pase lo que pase con la competencia.\n- La **estrategia** decide qué precio poner.\n- El **rango** decide hasta dónde se le permite llegar.\nSin Mín y Máx no se puede activar el reprecio. Pon el Mín a tu precio mínimo rentable (cubrir coste) y el Máx a un techo razonable.",
    follow: ["¿Cómo igualo el precio de mercado?", "¿Qué estrategia me conviene?"],
  },
  {
    keys: ["igualar", "mercado", "match", "mismo precio", "como el mercado"],
    answer:
      "Para **igualar el precio de mercado**:\n- Estrategia: **Igualar al competidor**.\n- Sin competencia: **Mantener precio**.\n- Rango Mín/Máx que contenga el precio de mercado.\nCada ciclo pondrá tu precio = el del competidor más barato, recortado a [Mín, Máx]. Si quieres ir 1 céntimo por debajo, usa **Ganar Buy Box** con importe 0,01.",
    follow: ["¿Qué hace el rango Mín/Máx?", "¿Cada cuánto reprecia?"],
  },
  {
    keys: ["buy box", "buybox", "ganar", "undercut", "por debajo", "céntimo", "centimo", "agresiv"],
    answer:
      "**Ganar Buy Box** pone tu precio por debajo del competidor más barato: por **importe** fijo (ej. 0,01 €) o por **porcentaje** (ej. 2 %). Siempre dentro del rango Mín/Máx. Es la estrategia más agresiva para llevarte la Buy Box sin malvender (el Mín te protege).",
    follow: ["¿Qué es la Buy Box?", "¿Cómo evito vender a pérdida?"],
  },
  {
    keys: ["margen", "coste", "comisión", "comision", "beneficio", "rentable", "pérdida", "perdida", "malvender"],
    answer:
      "Estrategia **Por margen**: defines **coste**, **% comisión Amazon** y **% margen objetivo**. El suelo de beneficio = coste / (1 − comisión% − margen%). El motor nunca vende por debajo de ese suelo; por encima actúa como Ganar Buy Box. Es la mejor opción para no malvender.",
    follow: ["¿Cómo configuro Por margen?", "¿Qué comisión pone Amazon?"],
  },
  {
    keys: ["fijo", "precio fijo", "fixed"],
    answer:
      "**Precio fijo** ignora la competencia y mantiene el precio que indiques, siempre recortado al rango Mín/Máx. Útil para productos sin competencia o con precio de catálogo cerrado.",
  },
  {
    keys: ["sin competencia", "no hay competidor", "solo", "nadie", "único", "unico"],
    answer:
      "Cuando no hay competidor, **Sin competencia** decide:\n- **Subir al máximo**: ganas margen estando solo.\n- **Mantener precio**: no se mueve.\nPara seguir el mercado sin saltos bruscos, usa **Mantener precio**.",
  },
  {
    keys: ["cada cuánto", "cada cuanto", "frecuencia", "ciclo", "cuándo reprecia", "cuando reprecia", "intervalo", "tiempo"],
    answer:
      "El motor se ejecuta por un cron: **cada 15 min en TRIAL** y **cada 5 min en PRO**. El botón **Ejecutar reprecio ahora** fuerza un ciclo inmediato sin esperar.",
    follow: ["¿Qué diferencia hay entre TRIAL y PRO?"],
  },
  {
    keys: ["sincroniz", "importar", "no aparece", "productos", "traer", "sync", "falta un producto"],
    answer:
      "**Sincronizar con Amazon** trae todos tus listings publicados en Seller Central. Si un producto no aparece, comprueba que está **activo** en Amazon. Si sale en **gris**, no tiene oferta/precio o le falta ASIN: no es repreciable hasta que tenga oferta válida.",
    follow: ["¿Por qué un producto sale en gris?"],
  },
  {
    keys: ["color", "verde", "azul", "gris", "estado", "nodo", "no se reprecia"],
    answer:
      "Color del nodo:\n- **Verde**: repreciando (toggle activo).\n- **Azul**: configurable (tiene precio, sin reprecio activo).\n- **Gris**: sin oferta/precio o sin ASIN → no repreciable.\nSi quieres que un azul se reprecie: define Mín/Máx, estrategia y activa el toggle.",
  },
  {
    keys: ["activar", "toggle", "empezar", "encender", "no reprecia", "no funciona"],
    answer:
      "Para que un producto se reprecie necesita: **precio/ASIN válido** en Amazon, **Mín y Máx** definidos, una **estrategia** y el **toggle activo**. Si el toggle no se deja activar, suele faltar el rango o el producto no tiene oferta en Amazon (nodo gris).",
  },
  {
    keys: ["motor", "cómo funciona", "como funciona", "qué hace", "que hace", "internamente"],
    answer:
      "Cada ciclo, por cada producto activo, el motor:\n1. Lee el precio de la competencia (SP-API).\n2. Calcula el nuevo precio según su estrategia y los límites Mín/Máx.\n3. Si cambia, hace un **PATCH real** del precio en Amazon y guarda el evento.",
  },
  {
    keys: ["zoom", "mover", "arrastrar", "panel", "navegar", "perdido"],
    answer:
      "En el panel: **rueda** del ratón = zoom, **arrastrar** = desplazarte (acotado), botones **+/−/1:1** abajo a la izquierda. **Clic** en un nodo abre su configuración a la derecha.",
  },
  {
    keys: ["buy box es", "qué es la buy box", "que es la buy box", "destacada"],
    answer:
      "La **Buy Box** es la oferta destacada de una ficha de Amazon (el botón “Añadir a la cesta”). La gana el vendedor con mejor combinación de precio, envío y reputación. La mayoría de ventas van a quien tiene la Buy Box; por eso interesa ganarla sin malvender.",
  },
  {
    keys: ["trial", "pro", "plan", "precio del plan", "pagar", "suscrip"],
    answer:
      "**TRIAL** es la prueba gratuita (ciclo cada 15 min). **PRO** reprecia más rápido (cada 5 min) y sin las limitaciones de la prueba. Puedes ver plan y facturación en el enlace **Facturación y plan** de la barra izquierda.",
  },
  {
    keys: ["autónomo", "autonomo", "hacienda", "impuestos", "iva", "factura", "legal", "fiscal"],
    answer:
      "No puedo darte asesoramiento fiscal o legal. Para temas de autónomo, IVA o facturación profesional, consulta con una gestoría. Lo que sí puedo es ayudarte con el funcionamiento del repricer.",
  },
  {
    keys: ["demo", "prueba sin", "sin amazon", "datos de prueba"],
    answer:
      "El **modo demo** te deja probar todo el flujo (sincronizar, configurar, repreciar) con datos de prueba **sin tocar tu cuenta real de Amazon**. Ideal para aprender antes de conectar la cuenta de verdad.",
  },
  {
    keys: ["desconect", "quitar cuenta", "borrar cuenta amazon"],
    answer:
      "Con **Desconectar mi cuenta de Amazon** (barra izquierda) se detiene el reprecio y se desvincula la cuenta. Tendrás que volver a conectarla para reanudar.",
  },
];

export function answerLocally(question: string): string {
  const t = bestTopic(question);
  if (t) return t.answer;
  return "Puedo ayudarte con el **motor de reprecio**: rango Mín/Máx, estrategias (Ganar Buy Box, Igualar, Precio fijo, Por margen), sin competencia, sincronización, estados de los nodos, frecuencia del ciclo o cómo igualar el precio de mercado. ¿Sobre cuál quieres saber?";
}

export function followUps(question: string): string[] {
  const t = bestTopic(question);
  return (
    t?.follow ?? [
      "¿Qué hace el rango Mín/Máx?",
      "¿Cómo igualo el precio de mercado?",
      "¿Cada cuánto reprecia?",
    ]
  );
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // sin acentos
}

function bestTopic(question: string): Topic | null {
  const q = norm(question);
  let best: Topic | null = null;
  let bestScore = 0;
  for (const t of TOPICS) {
    const score = t.keys.reduce((s, k) => (q.includes(norm(k)) ? s + 1 : s), 0);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return bestScore > 0 ? best : null;
}

/** Guía para el modelo sobre cuándo y cómo usar las herramientas. */
export const TOOLS_GUIDE = `PUEDES EJECUTAR ACCIONES con herramientas cuando el usuario lo pida claramente (configurar, activar, pausar, lanzar ciclo, consultar su catálogo):
- Resuelve el producto por nombre/SKU/ASIN con find_products antes de modificar; nunca inventes identificadores.
- Si hay varias coincidencias, pregunta cuál antes de actuar.
- set_range fija Mín/Máx (al fijar ambos se ACTIVA el reprecio automáticamente).
- set_strategy fija la estrategia (BUYBOX/MATCH/FIXED/MARGIN) y sus parámetros.
- toggle_repricing activa/pausa.
- run_repricer lanza un ciclo inmediato.
- Tras actuar, confirma en una frase qué hiciste y el efecto. Si el usuario solo pregunta, NO actúes: explica.
- Para "igualar el mercado": set_strategy MATCH + noCompetition HOLD y asegúrate de que tenga rango.`;
