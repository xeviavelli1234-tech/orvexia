/**
 * seed-reviews.ts
 * Genera 1-3 reseñas sintéticas (orientativas) por producto que no tenga
 * ninguna reseña real. Si un producto ya tiene cualquier reseña, se salta.
 *
 *  - Pool fijo de ~40 usuarios "reviewer-N@orvexia.local" reutilizables
 *    en todos los productos sin colisionar con cuentas reales.
 *  - Plantillas por categoría (lavadoras, frigoríficos, TV, etc.) con
 *    interpolación de marca, emojis de avatar y bio.
 *  - Distribución de ratings realista (sesgada hacia 4-5).
 *  - Fechas distribuidas en los últimos 9 meses para que se vean orgánicas.
 *  - Determinista por productId: re-ejecuciones generan exactamente los
 *    mismos resultados.
 */
import { PrismaClient, Category } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.log("⏭️  seed-reviews: no DATABASE_URL");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ── PRNG determinista ───────────────────────────────────────────────────────
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16;
    return (h >>> 0) / 0xffffffff;
  };
}
const pick = <T>(arr: readonly T[], r: () => number): T => arr[Math.floor(r() * arr.length)];
const choose = <T>(arr: readonly T[], n: number, r: () => number): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

// ── Usuarios sintéticos ─────────────────────────────────────────────────────
const COLORS = [
  "#2563EB", "#DC2626", "#059669", "#7C3AED", "#F59E0B", "#EC4899",
  "#14B8A6", "#F97316", "#8B5CF6", "#06B6D4", "#EAB308", "#10B981",
  "#0EA5E9", "#A855F7", "#22C55E", "#EF4444",
];
const EMOJIS = ["👤", "🙋", "💁", "🧑", "👩", "👨", "🫡", "🧔", null, null, null];

const REVIEWERS: { name: string; bio?: string }[] = [
  { name: "Marta G.",     bio: "Madre de familia, busco siempre lo mejor calidad-precio." },
  { name: "Carlos R.",    bio: "Aficionado al DIY y a la electrónica de hogar." },
  { name: "Laura M.",     bio: "" },
  { name: "Javier S.",    bio: "Comprador exigente, leo todas las reseñas antes de decidir." },
  { name: "Andrea P.",    bio: "" },
  { name: "David L.",     bio: "Reformando casa nueva, comprando casi todo el equipamiento." },
  { name: "Cristina F.",  bio: "" },
  { name: "Miguel A.",    bio: "Profesional del sector, opiniones honestas." },
  { name: "Patricia V.",  bio: "" },
  { name: "Daniel N.",    bio: "Amante de la cocina." },
  { name: "Elena B.",     bio: "" },
  { name: "Pablo H.",     bio: "Me encanta probar electrodomésticos nuevos." },
  { name: "Marina C.",    bio: "" },
  { name: "Sergio O.",    bio: "Padre primerizo, equipando piso." },
  { name: "Lucía D.",     bio: "" },
  { name: "Antonio T.",   bio: "Jubilado con tiempo para comparar y opinar." },
  { name: "Beatriz I.",   bio: "" },
  { name: "Iván E.",      bio: "Estudiante, cazaofertas." },
  { name: "Raquel U.",    bio: "" },
  { name: "Roberto J.",   bio: "Compro con cabeza, opino con criterio." },
  { name: "Sara K.",      bio: "" },
  { name: "Ana Q.",       bio: "Familia numerosa, todo se nota." },
  { name: "Adrián W.",    bio: "" },
  { name: "Nuria X.",     bio: "Mudándome a un piso pequeño, busco eficiencia." },
  { name: "Hugo Y.",      bio: "" },
  { name: "Carmen Z.",    bio: "Madre y abuela, equipando dos cocinas." },
  { name: "Diego A.",     bio: "" },
  { name: "Eva M.",       bio: "Trabajo desde casa, valoro el silencio." },
  { name: "Fernando R.",  bio: "" },
  { name: "Gloria S.",    bio: "Cocinilla, pruebo cualquier cacharro." },
  { name: "Héctor T.",    bio: "" },
  { name: "Inés V.",      bio: "Pareja sin hijos, electrodomésticos compactos." },
  { name: "Jorge W.",     bio: "" },
  { name: "Karen X.",     bio: "Soltera con piso pequeño." },
  { name: "Luis Y.",      bio: "" },
  { name: "Olga B.",      bio: "Mamá de gemelos, todo se duplica." },
  { name: "Pedro C.",     bio: "" },
  { name: "Rosa D.",      bio: "Abuela moderna, no me asusta la tecnología." },
  { name: "Tomás F.",     bio: "" },
  { name: "Vanesa G.",    bio: "Diseñadora, valoro estética y funcionalidad." },
];

async function ensureReviewerPool() {
  const ids: string[] = [];
  for (let i = 0; i < REVIEWERS.length; i++) {
    const r = REVIEWERS[i];
    const email = `reviewer-${i + 1}@orvexia.local`;
    const rand = seededRandom(email);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: r.name,
        email,
        password: null,
        emailVerified: false,
        avatarColor: pick(COLORS, rand),
        avatarEmoji: pick(EMOJIS, rand),
        bio: r.bio || null,
      },
      select: { id: true },
    });
    ids.push(user.id);
  }
  return ids;
}

// ── Plantillas de contenido ─────────────────────────────────────────────────

const POSITIVE_GENERIC = [
  "Llegó bien empaquetado y funciona perfectamente desde el primer día. Por el precio, una compra que recomiendo sin dudar.",
  "Justo lo que esperaba. Cumple lo que promete y la marca {brand} suele ser fiable, así que tranquilo con la durabilidad.",
  "Lo tengo desde hace unos meses y cero problemas. Para el uso que le doy es más que suficiente y la calidad se nota.",
  "Compra acertada. Llevo tiempo dándole vueltas y al final me decidí por este. No me arrepiento, calidad-precio top.",
  "Producto top, muy contento. La diferencia con el anterior que tenía es brutal. Repetiría sin dudarlo.",
  "Lo uso casi a diario y aguanta perfectamente. Acabados buenos, no se nota que sea de la franja de precio media-baja.",
];

const NEUTRAL_GENERIC = [
  "Cumple su función pero hay opciones más completas por poco más. Si te ajustas al presupuesto, decente.",
  "Está bien, sin más. La marca {brand} responde, aunque esperaba un poco más por lo que pagué.",
  "Para uso ocasional vale, pero si lo vas a usar mucho yo iría a algo de gama superior.",
];

const NEGATIVE_GENERIC = [
  "Esperaba más por el precio. La calidad de los acabados deja que desear y a las pocas semanas ya empezó a dar problemas.",
  "Decepcionado. La descripción promete cosas que en la práctica no son tan así. No lo recomiendo.",
];

const POSITIVE_BY_CATEGORY: Record<Category, string[]> = {
  TELEVISORES: [
    "La imagen 4K se ve espectacular tanto con películas como con la consola. Los negros profundos y los colores naturales.",
    "El sonido sorprende para llevarlo todo integrado. Para series y deportes va sobrado, para cine añadiría una barra.",
    "Smart TV rápida, las apps de streaming abren al instante. La interfaz es muy intuitiva.",
    "El modo gaming va de lujo con la PS5, sin lag perceptible. La tasa de refresco se nota muchísimo.",
    "La calidad del panel a este precio no la encuentras en otro sitio. {brand} sabe lo que hace.",
    "Tamaño perfecto para un salón mediano. El mando es cómodo y el control por voz funciona bien.",
  ],
  LAVADORAS: [
    "Lava muy bien y casi no se oye, hasta podemos dejarla de noche sin molestar a nadie. Motor inverter notable.",
    "Capacidad real, no como otras que dicen 8 kg y luego no caben. Los programas eco van muy bien para uso diario.",
    "Llevamos 4 meses dándole caña con dos niños y ropa deportiva, sin un fallo. Centrifugado fuerte y secado de calidad.",
    "El programa de 30 minutos es la salvación cuando hay que sacar algo rápido. Limpia bien y la ropa sale poco arrugada.",
    "{brand} cumple. Eficiente, silenciosa y los acabados son sólidos. Recomendada para familias.",
    "Por fin una lavadora que no vibra como una lavadora. Instalación fácil y consumo controlado.",
  ],
  FRIGORIFICOS: [
    "El No Frost cumple, no hay que descongelar nunca y los alimentos aguantan más frescos. Compra acertada.",
    "Mucha capacidad real para una familia de 4. Los cajones de verdura mantienen muy bien los alimentos varios días.",
    "Silencioso de verdad, en cocina americana abierta al salón se nota. La iluminación interior es muy buena.",
    "Eficiencia energética que se nota en la factura comparado con el viejo que tenía. {brand} acierta con este modelo.",
    "Estética bonita, encaja perfecto en mi cocina. La distribución de baldas es práctica y se reconfiguran fácil.",
    "Llega a temperatura en muy poco tiempo y la mantiene estable. Funciona bien en verano con calor extremo.",
  ],
  LAVAVAJILLAS: [
    "Limpia hasta la última cazuela costrosa sin remojo previo. Programas variados y el de 30 minutos es perfecto entre semana.",
    "Silencioso de verdad, casi no lo oyes a 2 metros. El secado deja la vajilla casi seca, el plástico necesita un retoque.",
    "Capacidad sobrada para 4 personas. Las bandejas se ajustan bien y caben las cazuelas grandes sin problema.",
    "Consumo de agua bajísimo, mucho menos que fregar a mano. {brand} cumple con creces.",
    "Por fin un lavavajillas que no me deja cercos en los vasos. Llega a buena temperatura y aclara perfecto.",
    "El programa eco va perfecto para uso diario, ahorras en luz y agua. Calidad de lavado top.",
  ],
  SECADORAS: [
    "La bomba de calor consume muy poco para lo que hace. La ropa sale seca, suelta y casi sin arrugas.",
    "Llevo dos inviernos con ella en piso sin terraza y es una bendición. {brand} cumple perfectamente.",
    "Programa de delicado deja la ropa intacta. El depósito de condensación se vacía en un momento.",
    "Silenciosa para lo que es y la capacidad real es la indicada. Compra acertada para familia.",
    "Se nota la diferencia con secadoras antiguas en la factura. Eficiencia A+++ que vale la pena.",
  ],
  HORNOS: [
    "El aire forzado cocina uniforme, no hay puntos quemados ni crudos. Tanto pan como pizza salen perfectos.",
    "La función vapor es brutal para carnes y pescados, mantiene la jugosidad. {brand} acierta con la programación.",
    "Pirolítica que limpia de verdad, sin químicos. Vale la pena el extra de precio.",
    "Acabados sólidos, panel táctil intuitivo, calienta rapidísimo. Por el precio es muy completo.",
    "Capacidad real para asar un pollo grande o una bandeja de canelones para 6. Recomendado.",
  ],
  MICROONDAS: [
    "Calienta rápido y uniforme, los plátanos rancios reviven con la función vapor. Buen precio.",
    "Grill que tuesta de verdad, no como otros que solo doran. {brand} cumple sobradamente.",
    "Capacidad suficiente para platos grandes. Los programas automáticos aciertan con la potencia.",
    "Silencioso al funcionar, casi no se oye el ventilador. Compacto y bonito.",
  ],
  ASPIRADORAS: [
    "Aspira a la primera pasada, suelo y alfombra. La autonomía aguanta toda la casa sin recargar.",
    "Silenciosa para la potencia que tiene. {brand} sabe lo que hace en este segmento.",
    "El cabezal entra debajo de los muebles y maniobra perfecto en esquinas. Cero quejas.",
    "Filtro HEPA que se nota si tienes mascotas o alergias. Los pelos de gato no son rival.",
    "Ligera para subir escaleras y vaciado del depósito muy fácil. Compra acertada.",
  ],
  CAFETERAS: [
    "Café cremoso de verdad, presión real y temperatura estable. Sale como en cafetería.",
    "Fácil de limpiar y de mantener. {brand} acierta con la sencillez de uso.",
    "Calienta rapidísimo, en menos de un minuto saca el primer espresso. Práctica al máximo.",
    "Por el precio, una bestia. Vapor potente para leche y agua caliente para infusiones.",
    "Llevo años con ella y sigue como el primer día. Mantenimiento mínimo, resultado constante.",
  ],
  AIRES_ACONDICIONADOS: [
    "Enfría rápido y mantiene la temperatura sin variaciones. Inverter que se nota en la factura.",
    "Modo nocturno súper silencioso, dormimos sin molestias. {brand} cumple sin problemas.",
    "Bomba de calor en invierno calienta de maravilla, alternativa real al radiador.",
    "Instalación fácil para el técnico y mando intuitivo. Calidad-precio difícil de superar.",
    "WiFi para encenderlo desde el móvil al volver a casa, comodidad total.",
  ],
  OTROS: [
    "Funciona bien y cumple lo que promete. Buena relación calidad-precio para el uso diario.",
    "{brand} suele acertar y este producto no es excepción. Lo tengo desde hace meses sin problemas.",
  ],
};

const NEUTRAL_BY_CATEGORY: Partial<Record<Category, string[]>> = {
  LAVADORAS: [
    "Hace su trabajo pero los programas son los justos. El centrifugado a 1400 podría ser más eficaz.",
    "Lava bien pero vibra un poco más de lo que esperaba. Por el precio, aceptable.",
  ],
  FRIGORIFICOS: [
    "Cumple con lo básico, aunque la iluminación interior es algo justa y la balda inferior se queda corta.",
  ],
  TELEVISORES: [
    "Imagen correcta pero el sonido se queda corto, recomiendo añadir barra. La interfaz a veces va lenta.",
  ],
  LAVAVAJILLAS: [
    "Lava bien pero el secado del plástico deja gotas. El programa intensivo tarda demasiado.",
  ],
  SECADORAS: [
    "Hace su función pero el ciclo se alarga si llenas mucho. El ruido es notable en programa rápido.",
  ],
};

const NEGATIVE_BY_CATEGORY: Partial<Record<Category, string[]>> = {
  LAVADORAS: [
    "Vibra demasiado en el centrifugado y se mueve del sitio. La instalé con todo nivelado y aun así.",
  ],
  TELEVISORES: [
    "Se ven líneas en escenas oscuras y el menú se queda colgado a veces. Esperaba más.",
  ],
  FRIGORIFICOS: [
    "Hace ruido al arrancar el compresor, en cocina abierta se nota mucho. No tan eficiente como prometen.",
  ],
};

const TITLE_OPTIONS: { rating: number; titles: string[] }[] = [
  { rating: 5, titles: ["Compra recomendada", "Súper contento", "Calidad-precio top", "Mejor de lo esperado", "Encantada", ""] },
  { rating: 4, titles: ["Buena compra", "Recomendado con matices", "Cumple", "Vale lo que cuesta", ""] },
  { rating: 3, titles: ["Ni fu ni fa", "Aceptable", "Esperaba más", ""] },
  { rating: 2, titles: ["Decepcionante", "No lo repetiría"] },
  { rating: 1, titles: ["Mala compra", "No lo recomiendo"] },
];

// ── Generadores ─────────────────────────────────────────────────────────────

function pickRating(rand: () => number): number {
  const x = rand();
  if (x < 0.60) return 5;
  if (x < 0.85) return 4;
  if (x < 0.95) return 3;
  if (x < 0.99) return 2;
  return 1;
}

function pickReviewCount(rand: () => number): number {
  const x = rand();
  if (x < 0.40) return 1;
  if (x < 0.75) return 2;
  return 3;
}

function pickTemplates(category: Category, rating: number): string[] {
  if (rating >= 4) return [...POSITIVE_BY_CATEGORY[category] ?? POSITIVE_BY_CATEGORY.OTROS, ...POSITIVE_GENERIC];
  if (rating === 3) return [...(NEUTRAL_BY_CATEGORY[category] ?? []), ...NEUTRAL_GENERIC];
  return [...(NEGATIVE_BY_CATEGORY[category] ?? []), ...NEGATIVE_GENERIC];
}

function generateContent(category: Category, brand: string, rating: number, rand: () => number): string {
  const templates = pickTemplates(category, rating);
  const n = rating >= 4 ? (rand() < 0.4 ? 2 : 1) : 1;
  const lines = choose(templates, Math.min(n, templates.length), rand);
  return lines.map(t => t.replace(/{brand}/g, brand)).join(" ");
}

function generateTitle(rating: number, rand: () => number): string | null {
  const set = TITLE_OPTIONS.find(t => t.rating === rating);
  if (!set) return null;
  const t = pick(set.titles, rand);
  return t || null;
}

function generateDate(rand: () => number): Date {
  // Distribuir entre 270 y 7 días atrás
  const days = 7 + Math.floor(rand() * 263);
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  d.setHours(8 + Math.floor(rand() * 14));
  d.setMinutes(Math.floor(rand() * 60));
  return d;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("👥 Asegurando pool de revisores...");
  const userIds = await ensureReviewerPool();
  console.log(`   ${userIds.length} revisores listos\n`);

  const products = await prisma.product.findMany({
    select: { id: true, brand: true, category: true, name: true },
  });
  console.log(`📦 ${products.length} productos a evaluar\n`);

  let seeded = 0;
  let skipped = 0;
  let totalReviews = 0;

  for (const product of products) {
    const existing = await prisma.review.count({ where: { productId: product.id } });
    if (existing > 0) {
      skipped++;
      continue;
    }

    const rand = seededRandom(product.id + ":reviews");
    const count = pickReviewCount(rand);
    const reviewers = choose(userIds, count, rand);

    const records = reviewers.map((userId) => {
      const rating = pickRating(rand);
      const title = generateTitle(rating, rand);
      const content = generateContent(product.category, product.brand, rating, rand);
      const createdAt = generateDate(rand);
      return { productId: product.id, userId, rating, title, content, createdAt, updatedAt: createdAt };
    });

    await prisma.review.createMany({ data: records, skipDuplicates: true });

    seeded++;
    totalReviews += records.length;
    if (seeded % 50 === 0) {
      console.log(`   ...${seeded} productos sembrados (${totalReviews} reseñas hasta ahora)`);
    }
  }

  console.log(`\n🎉 Reseñas generadas: ${seeded} productos | ${totalReviews} reseñas totales | ${skipped} ya tenían reseñas`);
}

main().catch((e) => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
