import "server-only";

/**
 * Base de conocimiento del Orvexia Repricer. Se usa para:
 *  - El system prompt cuando hay ANTHROPIC_API_KEY (responde Claude).
 *  - Una respuesta local por intención cuando NO hay API key (funciona igual).
 */

export const SYSTEM_PROMPT = `Eres "Asistente Orvexia", el ayudante del módulo Orvexia Repricer (repricer para Amazon España). Respondes en español, claro, directo y breve (máx ~120 palabras), con viñetas si ayuda. No inventes: si algo no está en este conocimiento, dilo y sugiere contactar soporte. No des consejos legales ni fiscales.

CONOCIMIENTO DEL PRODUCTO:
- Flujo: conectar Amazon → Sincronizar (trae todos los listings publicados) → cada producto es un nodo en el Centro de control → clic en el nodo → definir Mín/Máx + estrategia → activar el toggle "Reprecio automático".
- Rango Mín/Máx: límites duros de seguridad. El precio NUNCA baja del Mín ni sube del Máx, pase lo que pase. La estrategia decide qué precio poner; el rango hasta dónde se le permite llegar. El reprecio no se puede activar sin Mín y Máx.
- Estrategias:
  • Ganar Buy Box: se pone por debajo del competidor más barato (importe € fijo, ej. 0,01, o un %).
  • Igualar al competidor: pone tu precio = el del competidor más barato.
  • Precio fijo: ignora la competencia, mantiene un precio fijo (acotado a Mín/Máx).
  • Por margen: precio mínimo rentable = coste / (1 − comisión% − margen%). Nunca vende por debajo de ese suelo; por encima actúa como Ganar Buy Box.
- Sin competencia: "Subir al máximo" (gana margen estando solo) o "Mantener precio".
- Estados de los nodos: verde = repreciando; azul = configurable (tiene precio, sin reprecio activo); gris = sin oferta/precio o sin ASIN en Amazon → no repreciable.
- Ciclo automático: un cron ejecuta el motor cada 15 min en plan TRIAL y cada 5 min en PRO. Botón "Ejecutar reprecio ahora" fuerza un ciclo manual.
- El motor: por cada producto activo lee el precio de competencia vía SP-API, calcula el nuevo precio con su estrategia y límites, y si cambia hace un PATCH real del precio en Amazon y guarda el evento.
- Para "igualar al precio de mercado": estrategia "Igualar al competidor", sin competencia "Mantener precio", y un rango Mín/Máx que contenga el precio de mercado.
- Navegación del panel: rueda = zoom, arrastrar = mover (acotado), botones +/−/1:1.
- Solo marketplace Amazon España (ES). El reprecio solo afecta a productos con Mín/Máx + estrategia + toggle activo + precio/ASIN válido.`;

interface Topic {
  keys: string[];
  answer: string;
}

const TOPICS: Topic[] = [
  {
    keys: ["min", "máx", "max", "mínimo", "maximo", "máximo", "rango", "límite", "limite"],
    answer:
      "El Mín y el Máx son límites de seguridad: tu precio NUNCA baja del Mín ni sube del Máx. La estrategia decide qué precio poner; el rango, hasta dónde se le permite llegar. Sin Mín y Máx no se puede activar el reprecio. Pon el Mín a tu precio mínimo rentable y el Máx a un techo razonable.",
  },
  {
    keys: ["igualar", "mercado", "match", "mismo precio"],
    answer:
      "Para igualar el precio de mercado: estrategia «Igualar al competidor», «Sin competencia» = «Mantener precio», y un rango Mín/Máx que contenga el precio de mercado. Cada ciclo pondrá tu precio = el del competidor más barato, recortado a [Mín, Máx]. Si quieres 1 céntimo por debajo, usa «Ganar Buy Box» con importe 0,01.",
  },
  {
    keys: ["buy box", "buybox", "ganar", "undercut", "por debajo", "céntimo", "centimo"],
    answer:
      "«Ganar Buy Box» pone tu precio por debajo del competidor más barato: por importe fijo (ej. 0,01 €) o por porcentaje (ej. 2 %). Siempre acotado al rango Mín/Máx. Es la estrategia más agresiva para llevarte la Buy Box.",
  },
  {
    keys: ["margen", "coste", "comisión", "comision", "beneficio", "rentable"],
    answer:
      "Estrategia «Por margen»: defines coste, % comisión Amazon y % margen objetivo. El suelo de beneficio = coste / (1 − comisión% − margen%). El motor nunca vende por debajo de ese suelo; por encima se comporta como «Ganar Buy Box». Ideal para no malvender.",
  },
  {
    keys: ["fijo", "precio fijo", "fixed"],
    answer:
      "«Precio fijo» ignora la competencia y mantiene el precio que indiques, siempre recortado al rango Mín/Máx. Útil para productos sin competencia o con precio de catálogo.",
  },
  {
    keys: ["sin competencia", "no hay competidor", "solo", "nadie"],
    answer:
      "Cuando no hay competidor, «Sin competencia» decide: «Subir al máximo» (ganas margen estando solo) o «Mantener precio» (no se mueve). Para seguir el mercado sin saltos, usa «Mantener precio».",
  },
  {
    keys: ["cada cuánto", "cada cuanto", "frecuencia", "ciclo", "cuándo reprecia", "cuando reprecia", "intervalo"],
    answer:
      "El motor corre por un cron: cada 15 min en plan TRIAL y cada 5 min en PRO. El botón «Ejecutar reprecio ahora» fuerza un ciclo inmediato.",
  },
  {
    keys: ["sincroniz", "importar", "no aparece", "productos", "traer", "sync"],
    answer:
      "«Sincronizar con Amazon» trae TODOS tus listings publicados en Seller Central. Si un producto no aparece, asegúrate de que está activo en Amazon. Si sale en gris es que no tiene oferta/precio o le falta ASIN: no es repreciable hasta que tenga oferta válida.",
  },
  {
    keys: ["color", "verde", "azul", "gris", "estado", "nodo"],
    answer:
      "Color del nodo: verde = repreciando (toggle activo), azul = configurable (tiene precio pero sin reprecio activo), gris = sin oferta/precio o sin ASIN → no repreciable.",
  },
  {
    keys: ["activar", "toggle", "empezar", "encender", "no reprecia"],
    answer:
      "Para que un producto se reprecie: que tenga precio/ASIN válido, define Mín y Máx, elige estrategia y activa el toggle «Reprecio automático». Si no se puede activar, suele faltar el rango o el producto no tiene oferta en Amazon.",
  },
  {
    keys: ["motor", "cómo funciona", "como funciona", "qué hace", "que hace"],
    answer:
      "El motor, cada ciclo y por cada producto activo: lee el precio de la competencia (SP-API), calcula el nuevo precio según su estrategia y límites Mín/Máx, y si cambia hace un PATCH real del precio en Amazon y registra el evento.",
  },
  {
    keys: ["zoom", "mover", "arrastrar", "panel", "navegar"],
    answer:
      "En el panel: rueda del ratón = zoom, arrastrar = desplazarte (acotado), botones +/−/1:1 abajo. Clic en un nodo abre su configuración a la derecha.",
  },
];

export function answerLocally(question: string): string {
  const q = question.toLowerCase();
  let best: Topic | null = null;
  let bestScore = 0;
  for (const t of TOPICS) {
    const score = t.keys.reduce((s, k) => (q.includes(k) ? s + 1 : s), 0);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  if (best && bestScore > 0) return best.answer;
  return "Puedo ayudarte con el motor de reprecio: rango Mín/Máx, estrategias (Ganar Buy Box, Igualar, Precio fijo, Por margen), sin competencia, sincronización, estados de los nodos, frecuencia del ciclo o cómo igualar el precio de mercado. ¿Sobre cuál quieres saber?";
}
