import type { Category } from "@/app/generated/prisma/client";

// ── Tipos compartidos ───────────────────────────────────────────────────────
export type Tipo = {
  title: string;
  emoji: string;
  pros: string[];
  cons: string[];
  ideal: string;
  color: string;
  bg: string;
  border: string;
};

export type Criterio = { icon: string; title: string; desc: string };
export type Faq = { q: string; a: string };

export type ParaQuien = { icon: string; title: string; desc: string; pickHint: "best" | "value" | "cheap" | "premium" };

export type GuideConfig = {
  category: Category;
  slug: string;                 // "frigorifico" → URL /guias/mejor-frigorifico
  emoji: string;
  label: string;                // "Frigorífico"
  labelPlural: string;          // "Frigoríficos"
  /** Color principal (CTAs, eyebrow, header) */
  color: string;
  /** Color secundario (gradientes hero) */
  colorDark: string;
  /** Background suave para badges */
  bgLight: string;
  borderLight: string;
  /** Precio mínimo razonable: filtra mini-neveras, productos accesorios o fakes */
  minPrice: number;
  /** Precio máximo razonable */
  maxPrice: number;
  /** Hero copy */
  heroSub: string;
  /** Intro debajo del hero (2 párrafos en HTML simple) */
  intro: string[];
  /** Spec destacada que verás en la tabla comparativa (extraída del nombre con regex) */
  specRegex: RegExp[];
  /** Tipos del producto (combi/americano, OLED/QLED, etc.) */
  tipos: Tipo[];
  /** Criterios de compra */
  criterios: Criterio[];
  /** Para quién es cada ganador */
  paraQuien: ParaQuien[];
  /** FAQ */
  faqs: Faq[];
  /** Long-tail keywords para metadata */
  keywords: string[];
};

// ── Configuración por categoría ─────────────────────────────────────────────

export const GUIDES: GuideConfig[] = [
  {
    category: "FRIGORIFICOS",
    slug: "frigorifico",
    emoji: "🧊",
    label: "Frigorífico",
    labelPlural: "Frigoríficos",
    color: "#0891B2",
    colorDark: "#0E7490",
    bgLight: "#ECFEFF",
    borderLight: "#A5F3FC",
    minPrice: 150, maxPrice: 4000,
    heroSub: "Comparamos combi, americano, No Frost, capacidad y eficiencia para que aciertes a la primera.",
    intro: [
      "El frigorífico es el electrodoméstico que más horas trabaja en tu hogar: 24/7, 365 días al año. Una elección acertada significa hasta <strong>100€/año menos en luz</strong> y comida que aguanta el doble. Una mala, lo contrario.",
      "Los precios que ves se actualizan <strong>varias veces al día</strong> contra Amazon, PcComponentes, Fnac y El Corte Inglés — siempre el mejor disponible.",
    ],
    specRegex: [/(\d+)\s*l(?:itros)?/i, /(\d+)\s*cm/i, /no\s*frost/i, /clase\s*[A-G]/i],
    tipos: [
      { title: "Combi", emoji: "🔵", pros: ["Nevera arriba, congelador abajo", "Caben en cocinas estándar", "Buena relación precio-capacidad"], cons: ["Menos congelador que un americano", "Acceso al congelador por cajones"], ideal: "La mayoría de hogares (1-5 personas)", color: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC" },
      { title: "Americano (Side by Side)", emoji: "🟣", pros: ["Capacidad total enorme (500L+)", "Acceso cómodo a ambas zonas", "Dispensador de agua/hielo en gama media-alta"], cons: ["Ocupa 90 cm de ancho", "Precio elevado", "Eficiencia algo menor"], ideal: "Cocinas grandes y familias numerosas", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
      { title: "Multi-puerta (French Door)", emoji: "🟢", pros: ["Doble puerta de nevera, congelador abajo", "Aspecto premium", "Mucha capacidad sin ocupar tanto ancho"], cons: ["Precio alto", "Necesita espacio frontal para abrir"], ideal: "Cocinas modernas con presupuesto holgado", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
    ],
    criterios: [
      { icon: "📦", title: "Capacidad (litros)", desc: "1-2 personas: 200-280 L · 3-4 personas: 300-380 L · Familias grandes: 400 L+." },
      { icon: "❄️", title: "No Frost", desc: "Adiós a descongelar y a los hielos. En 2026 es prácticamente obligatorio en gama media." },
      { icon: "⚡", title: "Clase energética", desc: "Clase A vs F = hasta 100€/año de diferencia en factura. Amortiza el extra de precio en 2-3 años." },
      { icon: "🔇", title: "Nivel de ruido", desc: "Cocina abierta al salón → busca <38 dB. Cocina cerrada → hasta 42 dB es aceptable." },
      { icon: "🌡️", title: "Zona 0°C / CrispZone", desc: "Conserva carne y pescado fresco hasta 3× más tiempo. Imprescindible si compras grande." },
      { icon: "📏", title: "Dimensiones", desc: "Mide tu hueco antes de mirar. La mayoría son 60 cm de ancho × 185-200 cm de alto." },
    ],
    paraQuien: [
      { icon: "🏆", title: "El mejor de la comparativa", desc: "Si quieres acertar sin pensarlo demasiado: este es el que recomiendo a familiares y amigos.", pickHint: "best" },
      { icon: "💰", title: "Calidad-precio", desc: "Si buscas el mejor balance: rating sólido sin pagar premium. Probablemente el que más vendemos.", pickHint: "value" },
      { icon: "🪙", title: "Si el presupuesto manda", desc: "Si necesitas frío fiable sin extras y al precio más bajo, este cumple sin sorpresas.", pickHint: "cheap" },
      { icon: "👑", title: "Premium sin compromisos", desc: "Si la cocina es una pieza clave de tu hogar y quieres lo mejor disponible ahora mismo.", pickHint: "premium" },
    ],
    faqs: [
      { q: "¿Qué capacidad de frigorífico necesito?", a: "Como regla, 100 litros por persona. Pareja: 200-250 L. Familia de 4: 300-380 L. Si haces compras grandes o congelas mucho, suma 50-100 L." },
      { q: "¿Es importante el sistema No Frost?", a: "Sí. Elimina la escarcha, mantiene la temperatura uniforme y conserva mejor los alimentos. En 2026 es el estándar en gama media-alta y no merece la pena ahorrarse el extra." },
      { q: "¿Cuánto consume un frigorífico moderno?", a: "Un clase D consume 150-200 kWh/año, un clase A menos de 100. A 0,20€/kWh hablamos de 10-20€/año de diferencia y se amortiza en 2-3 años para gama media." },
      { q: "¿Qué es la zona 0 grados?", a: "Es un compartimento que mantiene carne y pescado entre 0 y 2°C, conservando los alimentos hasta 3 veces más tiempo. Imprescindible si compras grande una vez por semana." },
      { q: "¿Qué marcas son más fiables en 2026?", a: "Bosch, Siemens y Balay (grupo BSH) lideran fiabilidad. LG destaca por Linear Cooling. Samsung tiene buenos modelos premium. Liebherr es referente alto-gama." },
    ],
    keywords: ["mejor frigorífico 2026", "comparativa frigoríficos", "frigorífico no frost", "mejor frigorífico calidad precio", "frigorífico americano comparativa"],
  },
  {
    category: "LAVADORAS",
    slug: "lavadora",
    emoji: "🫧",
    label: "Lavadora",
    labelPlural: "Lavadoras",
    color: "#7C3AED",
    colorDark: "#6D28D9",
    bgLight: "#F5F3FF",
    borderLight: "#DDD6FE",
    minPrice: 200, maxPrice: 3000,
    heroSub: "Comparamos capacidad, RPM, motor inverter y eficiencia real para que la nueva lavadora dure 10 años.",
    intro: [
      "La lavadora es uno de los electrodomésticos que más se nota cuando elige bien: silenciosa, eficiente y con la capacidad correcta evita arrepentimientos durante <strong>10-15 años</strong>.",
      "Los precios y stock que ves son <strong>reales en este momento</strong> en Amazon, PcComponentes, Fnac y El Corte Inglés.",
    ],
    specRegex: [/(\d+)\s*kg/i, /(\d+)\s*rpm/i, /inverter/i, /clase\s*[A-G]/i],
    tipos: [
      { title: "Carga frontal", emoji: "🔵", pros: ["La más eficiente y silenciosa", "Variedad enorme de modelos", "Encaja debajo de encimera"], cons: ["Necesita agacharse para cargar"], ideal: "La mayoría de hogares", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
      { title: "Carga superior", emoji: "🟣", pros: ["No hay que agacharse", "Ocupa menos ancho", "Suelen ser más baratas"], cons: ["Capacidad menor (5-7 kg)", "Menos eficientes y más ruidosas"], ideal: "Pisos pequeños, espalda delicada", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
      { title: "Lavadora-secadora 2 en 1", emoji: "🟢", pros: ["Lava y seca en una sola máquina", "Ideal sin terraza"], cons: ["Capacidad de secado menor que de lavado", "Programas más largos"], ideal: "Pisos sin tendedero", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
    ],
    criterios: [
      { icon: "⚖️", title: "Capacidad (kg)", desc: "1-2 personas: 7 kg · 3-4 personas: 8-9 kg · Familias grandes: 10 kg+." },
      { icon: "🌀", title: "Velocidad de centrifugado", desc: "1200 RPM es suficiente para uso diario. 1400-1600 RPM exprime más agua y la ropa sale casi seca." },
      { icon: "🔧", title: "Motor inverter", desc: "Más silencioso, eficiente y con garantías de hasta 10 años. Imprescindible desde gama media." },
      { icon: "⚡", title: "Clase energética", desc: "Clase A ahorra hasta 40€/año frente a clase C. Vale el extra de precio." },
      { icon: "🔇", title: "Ruido", desc: "Lavado <55 dB y centrifugado <75 dB son los rangos cómodos para piso compartido." },
      { icon: "📱", title: "Programas inteligentes", desc: "WiFi y autodosificación son útiles si los aprovechas; si no, no pagues por ellos." },
    ],
    paraQuien: [
      { icon: "🏆", title: "El mejor de la comparativa", desc: "Si quieres una lavadora que dure y no la vas a sustituir en años.", pickHint: "best" },
      { icon: "💰", title: "Calidad-precio", desc: "El equilibrio justo: motor inverter, clase A y capacidad de familia, sin pagar premium.", pickHint: "value" },
      { icon: "🪙", title: "Si el presupuesto manda", desc: "Cumple en lavado y dura. Sin extras inútiles ni nombre comercial inflado.", pickHint: "cheap" },
      { icon: "👑", title: "Premium sin compromisos", desc: "Para quien quiere silencio absoluto, autodosificación y conectividad real.", pickHint: "premium" },
    ],
    faqs: [
      { q: "¿Qué capacidad de lavadora necesito?", a: "Como regla: 1-2 personas → 7 kg. 3-4 personas → 8-9 kg. Familias grandes o ropa voluminosa → 10 kg+. Una lavadora más grande que tu uso real no es ineficiente: la electrónica detecta la carga." },
      { q: "¿Vale la pena un motor inverter?", a: "Sí, sobre todo en gama media-alta. Es más silencioso, más eficiente, dura más y suele venir con 10 años de garantía. La diferencia de precio se amortiza." },
      { q: "¿1200 RPM o 1400 RPM?", a: "1200 RPM es suficiente para uso normal. 1400 RPM saca más agua y reduce el secado, útil si no tienes secadora. 1600 RPM solo merece la pena si las prendas son muy voluminosas." },
      { q: "¿Qué clase energética elegir?", a: "Clase A si puedes. La diferencia con clase C son ~40€/año en luz y agua. En la vida útil de la lavadora hablamos de 400€+, fácil amortización." },
      { q: "¿Qué marcas son más fiables?", a: "Bosch, Siemens y Balay (BSH) lideran fiabilidad. AEG y Miele son las premium. LG destaca por su motor con garantía de 10 años." },
    ],
    keywords: ["mejor lavadora 2026", "comparativa lavadoras", "mejor lavadora calidad precio", "lavadora 9 kg comparativa", "lavadora inverter"],
  },
  {
    category: "TELEVISORES",
    slug: "televisor",
    emoji: "📺",
    label: "Televisor",
    labelPlural: "Televisores",
    color: "#2563EB",
    colorDark: "#1E40AF",
    bgLight: "#EFF6FF",
    borderLight: "#BFDBFE",
    minPrice: 150, maxPrice: 6000,
    heroSub: "OLED, QLED, Mini-LED, gaming, Smart TV. Comparamos lo que importa de verdad para que aciertes.",
    intro: [
      "Una TV es para 7-10 años. Equivocarse en panel, tasa de refresco o sistema operativo se nota cada noche. Aquí vas a saber <strong>exactamente qué priorizar</strong> según uses la tele para series, cine, deporte o gaming.",
      "Los precios y stock se actualizan <strong>varias veces al día</strong> contra las cuatro principales tiendas de España.",
    ],
    specRegex: [/(\d+)\s*pulgadas|(\d+)"/i, /OLED|QLED|Mini-LED/i, /(\d+)\s*Hz/i, /4K|8K/i],
    tipos: [
      { title: "OLED", emoji: "🟣", pros: ["Negros perfectos (píxel apagado)", "Contraste y colores top", "Ideal para cine"], cons: ["Brillo máximo menor que QLED", "Precio elevado"], ideal: "Cinéfilos, gamers exigentes", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
      { title: "QLED / Mini-LED", emoji: "🔵", pros: ["Brillo altísimo (HDR real)", "Mejor para salones luminosos", "Sin riesgo de burn-in"], cons: ["Negros menos profundos", "Halos en escenas oscuras"], ideal: "Salones con mucha luz", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
      { title: "LED estándar", emoji: "🟢", pros: ["Más asequible", "Variedad de tamaños y marcas"], cons: ["Contraste inferior", "Ángulos de visión limitados"], ideal: "Dormitorio, cocina, presupuesto ajustado", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
    ],
    criterios: [
      { icon: "📐", title: "Tamaño según distancia", desc: "A 2-3 m → 55\". A 3-4 m → 65\". A más de 4 m → 75\"+." },
      { icon: "🖼️", title: "Tecnología de panel", desc: "OLED → contraste y cine. QLED/Mini-LED → brillo y deportes. LED → precio." },
      { icon: "🔄", title: "Tasa de refresco", desc: "120 Hz es estándar para gaming y deportes. 60 Hz cubre series y películas sin problema." },
      { icon: "✨", title: "HDR (Dolby Vision / HDR10+)", desc: "Si la TV no llega a 600 nits, el HDR es decorativo. Mira siempre el brillo máximo." },
      { icon: "🎮", title: "Gaming (HDMI 2.1)", desc: "Imprescindible para PS5/Xbox Series con 4K@120Hz. Verifica también ALLM y VRR." },
      { icon: "📡", title: "Smart TV", desc: "Google TV (Sony, TCL) y webOS (LG) son los más completos. Evita sistemas propietarios menos conocidos." },
    ],
    paraQuien: [
      { icon: "🏆", title: "El mejor de la comparativa", desc: "Si te decides hoy y quieres acertar para los próximos 7-8 años.", pickHint: "best" },
      { icon: "💰", title: "Calidad-precio", desc: "OLED/QLED a precio razonable: lo que más vendemos para salones medianos.", pickHint: "value" },
      { icon: "🪙", title: "Si el presupuesto manda", desc: "Buena imagen sin gastar lo que no toca. Ideal para dormitorio o segunda TV.", pickHint: "cheap" },
      { icon: "👑", title: "Premium sin compromisos", desc: "Cine en casa, gaming exigente, pantalla grande. Sin atajos.", pickHint: "premium" },
    ],
    faqs: [
      { q: "¿Qué tamaño de televisor necesito?", a: "Distancia × 0,55 = pulgadas mínimas. Sofá a 3 m → 55-65\". Más lejos → 75\"+. No te quedes corto: en 6 meses te acostumbras a cualquier tamaño." },
      { q: "¿Vale la pena un OLED frente a un QLED?", a: "OLED si ves cine en penumbra: los negros son perfectos. QLED si tu salón está muy iluminado: el brillo extra hace que se vea bien con luz." },
      { q: "¿Necesito 120 Hz?", a: "Para gaming en PS5/Xbox Series sí, es transformador. Para series y películas, 60 Hz es suficiente. Para deporte en directo, 120 Hz se nota." },
      { q: "¿Qué Smart TV es la mejor?", a: "Google TV (Sony, TCL, Hisense) tiene el catálogo más amplio y es la más actualizada. webOS de LG es la más fluida. Tizen de Samsung es buena pero peor en apps." },
      { q: "¿Qué marcas recomiendas en 2026?", a: "Sony y LG en imagen pura. Samsung en QLED grande. Hisense y TCL en relación calidad-precio (sus modelos top están al nivel de los premium a la mitad de precio)." },
    ],
    keywords: ["mejor televisor 2026", "comparativa televisores", "OLED vs QLED 2026", "mejor televisor calidad precio", "mejor TV 55 pulgadas"],
  },
  {
    category: "LAVAVAJILLAS",
    slug: "lavavajillas",
    emoji: "🍽️",
    label: "Lavavajillas",
    labelPlural: "Lavavajillas",
    color: "#059669",
    colorDark: "#047857",
    bgLight: "#ECFDF5",
    borderLight: "#A7F3D0",
    minPrice: 150, maxPrice: 3000,
    heroSub: "Cubiertos, ruido, consumo de agua y secado real. Comparamos los modelos que más venden en 2026.",
    intro: [
      "Un lavavajillas bien elegido lava mejor que a mano, gasta menos agua y dura 12-15 años. Mal elegido, el plástico sale mojado y el motor falla a los 4 años. La diferencia está en pocos detalles concretos.",
      "Los precios se actualizan <strong>varias veces al día</strong> contra las principales tiendas de España.",
    ],
    specRegex: [/(\d+)\s*cubiertos/i, /(\d+)\s*dB/i, /(\d+)\s*cm/i, /clase\s*[A-G]/i],
    tipos: [
      { title: "Libre instalación 60 cm", emoji: "🟢", pros: ["Capacidad estándar (12-15 cubiertos)", "Más opciones de marca y precio", "Fácil reemplazo"], cons: ["Necesitas hueco específico"], ideal: "La mayoría de cocinas", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
      { title: "Integrable / panelable", emoji: "🔵", pros: ["Acabado integrado en cocina", "Estética premium", "Mismo rendimiento que el libre"], cons: ["Suele costar más", "Cambiar de modelo es más caro"], ideal: "Cocinas modernas con muebles a medida", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
      { title: "Compacto / sobremesa", emoji: "🟣", pros: ["Cabe encima de la encimera", "Solución para cocinas mini"], cons: ["Solo 6-8 cubiertos", "Programas limitados"], ideal: "Pisos pequeños, parejas sin cocina grande", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
    ],
    criterios: [
      { icon: "🍽️", title: "Cubiertos", desc: "1-2 personas: 6-8 cub. · 3-4 personas: 12-13 cub. · Familias grandes: 14-16 cub." },
      { icon: "🔇", title: "Ruido (dB)", desc: "<44 dB es silencioso. Para cocina abierta al salón busca <42 dB. >48 dB se oye desde el salón." },
      { icon: "💧", title: "Consumo de agua", desc: "Los buenos usan 6-9 L/ciclo. Menos de fregar a mano. La diferencia anual entre eficientes y normales son ~3.000 L." },
      { icon: "⚡", title: "Clase energética", desc: "Clase A vs D = ~25€/año en luz y agua. Compensa siempre." },
      { icon: "🔥", title: "Programas", desc: "Mira que tenga eco (uso diario), intensivo (cazuelas) y exprés (30 min). El resto es marketing." },
      { icon: "💨", title: "Secado", desc: "Aire caliente o ventilador secan plástico mejor que la condensación pasiva." },
    ],
    paraQuien: [
      { icon: "🏆", title: "El mejor de la comparativa", desc: "Quieres uno que dure 15 años y no fallar al elegir.", pickHint: "best" },
      { icon: "💰", title: "Calidad-precio", desc: "Cubre uso de familia con ruido bajo y consumo eficiente, sin sobrepagar marca.", pickHint: "value" },
      { icon: "🪙", title: "Si el presupuesto manda", desc: "Lava bien y dura. Sin programas que no usarías.", pickHint: "cheap" },
      { icon: "👑", title: "Premium sin compromisos", desc: "Silencio absoluto, autoapertura para secado, cesta variable. La gama alta de verdad.", pickHint: "premium" },
    ],
    faqs: [
      { q: "¿Cuántos cubiertos necesito?", a: "1-2 personas: 6-8. Familia de 4: 12-13 (estándar). Familia numerosa o ceno mucho con invitados: 14-16. No te quedes corto, compactarás demasiado y lavará peor." },
      { q: "¿Qué nivel de ruido es aceptable?", a: "Menos de 44 dB es silencioso. Para cocina abierta al salón, busca <42 dB. Por encima de 48 dB se oye desde el sofá y molesta." },
      { q: "¿Lavavajillas integrable o de libre instalación?", a: "Integrable si rehaces cocina o quieres acabado uniforme. Libre instalación si valoras tener más modelos donde elegir y poder cambiar fácil en 10 años." },
      { q: "¿Qué consume más, lavavajillas o fregar a mano?", a: "Fregar a mano gasta 30-50 L por carga; un lavavajillas eficiente, 6-9 L. Si lavas a mano todos los días, el lavavajillas se amortiza solo en agua." },
      { q: "¿Qué marcas recomiendas?", a: "Bosch, Siemens y Balay (BSH) lideran fiabilidad. Beko y Hisense ofrecen muy buena relación calidad-precio. Miele y AEG son la gama premium." },
    ],
    keywords: ["mejor lavavajillas 2026", "comparativa lavavajillas", "lavavajillas silencioso", "lavavajillas 14 cubiertos", "mejor lavavajillas calidad precio"],
  },
  {
    category: "SECADORAS",
    slug: "secadora",
    emoji: "💨",
    label: "Secadora",
    labelPlural: "Secadoras",
    color: "#D97706",
    colorDark: "#B45309",
    bgLight: "#FFFBEB",
    borderLight: "#FDE68A",
    minPrice: 250, maxPrice: 2500,
    heroSub: "Bomba de calor, capacidad y consumo. Comparamos los modelos que ahorran de verdad en factura.",
    intro: [
      "Una secadora moderna de bomba de calor consume <strong>la mitad</strong> que una de condensación tradicional. La inversión inicial parece más alta, pero se amortiza en 2-3 años.",
      "Los precios y stock que ves se actualizan <strong>varias veces al día</strong> en las principales tiendas de España.",
    ],
    specRegex: [/(\d+)\s*kg/i, /clase\s*[A-G]/i, /(?:bomba\s*de\s*calor|heat\s*pump)/i],
    tipos: [
      { title: "Bomba de calor", emoji: "🟢", pros: ["Consumo bajísimo (clase A+++)", "Cuida la ropa con baja temperatura", "Las más vendidas hoy"], cons: ["Precio inicial más alto", "Tarda algo más por ciclo"], ideal: "Uso frecuente, ahorro a largo plazo", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
      { title: "Condensación clásica", emoji: "🔵", pros: ["Más barata de entrada", "Ciclos algo más cortos"], cons: ["Consume el doble que la de bomba de calor", "Daña más la ropa por temperatura alta"], ideal: "Uso ocasional, presupuesto ajustado", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
      { title: "Evacuación (extracción)", emoji: "🟣", pros: ["La más simple y barata"], cons: ["Necesita salida al exterior", "Cada vez menos modelos en mercado"], ideal: "Pisos antiguos con salida ya instalada", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
    ],
    criterios: [
      { icon: "♨️", title: "Bomba de calor (siempre)", desc: "Clase A+++ vs B = >100€/año en luz para uso de familia. La cuenta no falla." },
      { icon: "⚖️", title: "Capacidad", desc: "Igual o superior a tu lavadora. Lavadora de 8 kg → secadora de 8-9 kg." },
      { icon: "📊", title: "Clase energética", desc: "Busca A o B. Las clases C y D suben mucho la factura porque son electrodomésticos de uso frecuente." },
      { icon: "🔇", title: "Ruido", desc: "<65 dB es lo cómodo. Si la pones en zona vivida, busca <60 dB." },
      { icon: "📱", title: "Programas inteligentes", desc: "Sensor de humedad que apaga al estar seco evita gastar luz de más." },
      { icon: "🪞", title: "Depósito o desagüe", desc: "Vaciar depósito cada 3-4 cargas o conectar a desagüe directo. Lo segundo es más cómodo." },
    ],
    paraQuien: [
      { icon: "🏆", title: "La mejor de la comparativa", desc: "Si la usarás varias veces por semana y quieres una compra sin sustos.", pickHint: "best" },
      { icon: "💰", title: "Calidad-precio", desc: "Bomba de calor con clase A y capacidad de familia, sin pagar tier premium.", pickHint: "value" },
      { icon: "🪙", title: "Si el presupuesto manda", desc: "Si vas a usarla poco y prima el precio inicial.", pickHint: "cheap" },
      { icon: "👑", title: "Premium sin compromisos", desc: "Silencio, autodosificación, conectividad y programas perfectos para cualquier prenda.", pickHint: "premium" },
    ],
    faqs: [
      { q: "¿Bomba de calor o condensación?", a: "Bomba de calor sin discusión si la usarás más de una vez por semana: gasta la mitad y cuida más la ropa. Condensación solo si vas a usarla muy poco y prima el precio inicial." },
      { q: "¿Qué capacidad de secadora elijo?", a: "Igual o ligeramente superior a tu lavadora. Lavadora 8 kg → secadora 8-9 kg. La ropa mojada ocupa más volumen al secar y el ciclo es más eficiente sin amontonar." },
      { q: "¿Cuánto consume al año?", a: "Una de bomba de calor clase A+++ ronda 250 kWh/año (≈50€). Una condensación clase B sube a 500 kWh (≈100€). Diferencia de 50€/año, 500€ en su vida útil." },
      { q: "¿Tarda mucho en secar?", a: "Un ciclo estándar dura 1h30-2h. La de bomba de calor tarda algo más, pero cuida la ropa con temperatura más baja." },
      { q: "¿Qué marcas recomiendas?", a: "Bosch, Siemens, Balay (BSH) y AEG en gama media-alta. LG y Samsung con buena tecnología inverter. Beko en relación calidad-precio." },
    ],
    keywords: ["mejor secadora 2026", "secadora bomba de calor", "comparativa secadoras", "mejor secadora calidad precio", "secadora 9kg comparativa"],
  },
  {
    category: "HORNOS",
    slug: "horno",
    emoji: "🔥",
    label: "Horno",
    labelPlural: "Hornos",
    color: "#DC2626",
    colorDark: "#B91C1C",
    bgLight: "#FEF2F2",
    borderLight: "#FECACA",
    minPrice: 150, maxPrice: 3000,
    heroSub: "Pirolítico, vapor, convección. Comparamos los hornos que cocinan mejor en 2026.",
    intro: [
      "El horno es el electrodoméstico que más diferencia hay entre uno bueno y uno malo. Cocción uniforme, autolimpieza pirolítica y vapor pueden cambiar literalmente cómo cocinas.",
      "Comparamos siempre los precios <strong>en tiempo real</strong> contra las principales tiendas de España.",
    ],
    specRegex: [/(\d+)\s*l(?:itros)?/i, /pirol[íi]tico/i, /vapor/i, /clase\s*[A-G]/i],
    tipos: [
      { title: "Multifunción con convección", emoji: "🔵", pros: ["Cocina uniforme con aire forzado", "Estándar moderno para cualquier receta", "Buena relación calidad-precio"], cons: [], ideal: "La mayoría de cocinas (uso diario)", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
      { title: "Con vapor", emoji: "🟢", pros: ["Pan, pescado y carne con jugosidad real", "Conserva nutrientes", "Tendencia en alta cocina"], cons: ["Precio mayor", "Hay que vaciar depósito"], ideal: "Si te gusta cocinar de verdad", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
      { title: "Pirolítico", emoji: "🔴", pros: ["Autolimpieza a 500°C que evita químicos", "Resultado impecable sin esfuerzo"], cons: ["Consume bastante en el ciclo", "Algo más caro"], ideal: "Si odias limpiar el horno", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
    ],
    criterios: [
      { icon: "🌀", title: "Convección (aire forzado)", desc: "Imprescindible. Cocina uniforme y reduce tiempos. Cualquier horno moderno la tiene." },
      { icon: "💦", title: "Vapor", desc: "Carne y pescado con jugosidad real. El pan casero sale como el de panadería." },
      { icon: "🧹", title: "Pirolítico", desc: "Autolimpia el horno a 500°C sin químicos. Vale el extra si odias limpiar." },
      { icon: "📦", title: "Capacidad (litros)", desc: "60-65 L para uso normal. 70-80 L para hornear pollo grande o canelones para 6." },
      { icon: "📱", title: "Mando táctil + sondas", desc: "Sonda de carne con auto-apagado al alcanzar temperatura. Cambia cómo cocinas." },
      { icon: "⚡", title: "Clase energética", desc: "Clase A o A+. Los pirolíticos consumen más, pero el ciclo es ocasional." },
    ],
    paraQuien: [
      { icon: "🏆", title: "El mejor de la comparativa", desc: "Acertar a la primera con un horno que dure 15 años.", pickHint: "best" },
      { icon: "💰", title: "Calidad-precio", desc: "Convección + pirolítico a precio razonable.", pickHint: "value" },
      { icon: "🪙", title: "Si el presupuesto manda", desc: "Convección y limpieza catalítica sin gastar de más.", pickHint: "cheap" },
      { icon: "👑", title: "Premium sin compromisos", desc: "Vapor + pirolítico + sonda + WiFi. Lo mejor disponible ahora.", pickHint: "premium" },
    ],
    faqs: [
      { q: "¿Convección o aire forzado?", a: "Es lo mismo. Indispensable en cualquier horno moderno: cocina uniforme y reduce tiempos. Si un horno actual no la trae, descártalo." },
      { q: "¿Vale la pena el pirolítico?", a: "Si limpiar el horno es de tus tareas más odiadas, sí. La autolimpieza a 500°C deja el interior impecable sin químicos. Si lo limpias en cada uso, no compensa el extra." },
      { q: "¿Para qué sirve la función vapor?", a: "Mantiene la jugosidad de carne y pescado, mejora el horneado del pan y conserva más nutrientes. Es un cambio real si cocinas habitualmente." },
      { q: "¿Qué capacidad necesito?", a: "60-65 L cubre uso normal. 70-80 L si haces piezas grandes (pollo entero, costillares, canelones para 8). Por debajo de 60 L solo en cocinas mini." },
      { q: "¿Qué marcas recomiendas?", a: "Bosch, Siemens, Balay (BSH) e AEG dominan la gama media-alta. Whirlpool y Beko ofrecen buena relación calidad-precio. Miele es premium." },
    ],
    keywords: ["mejor horno 2026", "horno pirolítico comparativa", "horno con vapor", "mejor horno calidad precio", "horno multifunción 2026"],
  },
  {
    category: "MICROONDAS",
    slug: "microondas",
    emoji: "📡",
    label: "Microondas",
    labelPlural: "Microondas",
    color: "#9333EA",
    colorDark: "#7E22CE",
    bgLight: "#FAF5FF",
    borderLight: "#E9D5FF",
    minPrice: 50, maxPrice: 1500,
    heroSub: "Solo micro, grill, convección. Comparamos los modelos que más amortizan su precio en 2026.",
    intro: [
      "El microondas no solo recalienta. Los modelos con grill y convección permiten cocinar, tostar y hornear pequeñas porciones, sustituyendo al horno en muchos casos.",
      "Precios actualizados <strong>varias veces al día</strong> contra las principales tiendas de España.",
    ],
    specRegex: [/(\d+)\s*l(?:itros)?/i, /(\d+)\s*W/i, /grill|convecci[óo]n/i],
    tipos: [
      { title: "Solo microondas", emoji: "🟣", pros: ["Más barato", "Compacto y rápido para descongelar/recalentar"], cons: ["No tuesta ni cocina"], ideal: "Recalentar, descongelar, comida básica", color: "#9333EA", bg: "#FAF5FF", border: "#E9D5FF" },
      { title: "Con grill", emoji: "🔴", pros: ["Tuesta y dora", "Buen extra por poco precio adicional"], cons: ["No iguala a un horno con resistencia"], ideal: "Quien quiere algo más que recalentar", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
      { title: "Con convección", emoji: "🟢", pros: ["Hornea como un horno pequeño", "Dorado uniforme", "Sustituye al horno en porciones pequeñas"], cons: ["Precio más alto", "Programas más complicados"], ideal: "Cocinas pequeñas sin horno separado", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
    ],
    criterios: [
      { icon: "🔢", title: "Potencia (W)", desc: "700 W para uso básico. 900-1000 W si lo usas mucho o para cocinar de verdad." },
      { icon: "📦", title: "Capacidad", desc: "1-2 personas: 17-20 L. Familia: 23-28 L. Para platos grandes: 30 L+." },
      { icon: "🔥", title: "Grill", desc: "1000-1300 W reales doran de verdad. Por debajo, son decorativos." },
      { icon: "🌀", title: "Convección", desc: "Si tu cocina no tiene horno separado, vale la pena el extra. Hornea pequeñas porciones." },
      { icon: "🔧", title: "Material interior", desc: "Acero inoxidable resiste mejor que pintado. Plato giratorio o sin él (modernos)." },
      { icon: "⚡", title: "Stand-by", desc: "Algunos consumen 1-2 W siempre encendidos. Verifica si hay modo eco." },
    ],
    paraQuien: [
      { icon: "🏆", title: "El mejor de la comparativa", desc: "Si quieres uno que dure y no lo cambies en 10 años.", pickHint: "best" },
      { icon: "💰", title: "Calidad-precio", desc: "Grill incluido a precio asequible. La opción que cubre el 90% de usos.", pickHint: "value" },
      { icon: "🪙", title: "Si el presupuesto manda", desc: "Solo microondas, capacidad ajustada. Recalentar y descongelar.", pickHint: "cheap" },
      { icon: "👑", title: "Premium sin compromisos", desc: "Convección + grill + sensores. Sustituye al horno en cocina pequeña.", pickHint: "premium" },
    ],
    faqs: [
      { q: "¿Cuánta potencia necesito?", a: "700 W para uso básico (recalentar, leche). 900-1000 W si vas a cocinar de verdad o lo usarás mucho. Más potencia = más rápido y más uniforme." },
      { q: "¿Vale la pena el grill?", a: "Sí, por unos pocos euros más añades posibilidad de tostar y dorar. Pasa de \"solo recalienta\" a \"prepara comidas completas\". Compensa siempre." },
      { q: "¿Convección sí o no?", a: "Si tu cocina no tiene horno separado, sí: te permite hornear porciones pequeñas. Si ya tienes horno, no compensa el extra de precio." },
      { q: "¿Plato giratorio o sin él?", a: "Los modernos sin plato distribuyen ondas de manera uniforme y son más fáciles de limpiar. Los con plato son más baratos pero el plato puede romperse." },
      { q: "¿Qué marcas recomiendas?", a: "Panasonic lidera en tecnología inverter. Samsung y LG en gama media-alta. Cecotec y Balay para relación calidad-precio." },
    ],
    keywords: ["mejor microondas 2026", "microondas con grill", "microondas convección", "comparativa microondas", "microondas calidad precio"],
  },
  {
    category: "ASPIRADORAS",
    slug: "aspiradora",
    emoji: "🌀",
    label: "Aspiradora",
    labelPlural: "Aspiradoras",
    color: "#0369A1",
    colorDark: "#075985",
    bgLight: "#F0F9FF",
    borderLight: "#BAE6FD",
    minPrice: 50, maxPrice: 2000,
    heroSub: "Robot, escoba, trineo. Comparamos las que aspiran de verdad y duran.",
    intro: [
      "El mercado está saturado de aspiradoras. La diferencia entre una buena y una mala se nota desde el primer uso: succión real, autonomía, ergonomía y filtro.",
      "Precios y stock <strong>en tiempo real</strong> contra las principales tiendas de España.",
    ],
    specRegex: [/(\d+)\s*W/i, /HEPA/i, /(?:bater[íi]a|autonom[íi]a)\s*\d+/i],
    tipos: [
      { title: "Robot", emoji: "🤖", pros: ["Limpieza automática diaria", "Ideal para mantenimiento", "Compatible con el móvil"], cons: ["Menos potencia que una escoba", "Precio más alto en gama buena"], ideal: "Pisos hasta 100 m², mascotas, comodidad máxima", color: "#0369A1", bg: "#F0F9FF", border: "#BAE6FD" },
      { title: "Escoba sin cable", emoji: "🟣", pros: ["Potencia real", "Maniobrabilidad sin enredos de cable", "Limpieza a fondo profunda"], cons: ["Autonomía limitada (30-60 min)", "Hay que vaciarla y cargarla"], ideal: "Limpieza intensiva semanal", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
      { title: "Trineo con cable", emoji: "🟢", pros: ["Más potencia y autonomía ilimitada", "Más asequibles", "Idóneas para casas grandes"], cons: ["Cable molesto", "Almacenamiento mayor"], ideal: "Casas grandes, presupuesto ajustado", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
    ],
    criterios: [
      { icon: "💪", title: "Succión real (Pa o AW)", desc: "Para robots: >2500 Pa. Escobas: >150 AW de succión real (no \"motor de 600 W\")." },
      { icon: "🔋", title: "Autonomía", desc: "Escobas: >40 min en modo normal. Robots: >90 min para 100 m²." },
      { icon: "🐾", title: "Filtro HEPA + cepillo anti-pelo", desc: "Imprescindible si tienes mascotas o alergias. La diferencia es brutal." },
      { icon: "🔇", title: "Ruido (dB)", desc: "<70 dB para no despertar al vecino. Por encima de 75 dB es incómodo." },
      { icon: "🪣", title: "Capacidad de depósito", desc: "Escobas: >0,5 L. Robots: >0,4 L o estación de autovaciado para no estar pendiente." },
      { icon: "🧱", title: "Navegación (robot)", desc: "LiDAR > giroscopio > sensor visual. Asegúrate de que mapea de verdad." },
    ],
    paraQuien: [
      { icon: "🏆", title: "La mejor de la comparativa", desc: "Para quien quiere acertar y olvidarse de la limpieza diaria.", pickHint: "best" },
      { icon: "💰", title: "Calidad-precio", desc: "Buena succión, autonomía decente y filtro HEPA. La compra inteligente.", pickHint: "value" },
      { icon: "🪙", title: "Si el presupuesto manda", desc: "Aspira sin pagar de más. Para uso ocasional y pisos pequeños.", pickHint: "cheap" },
      { icon: "👑", title: "Premium sin compromisos", desc: "LiDAR, autovaciado, succión profesional. Lo mejor que se vende ahora.", pickHint: "premium" },
    ],
    faqs: [
      { q: "¿Robot o escoba sin cable?", a: "Robot para mantenimiento diario sin esfuerzo. Escoba para limpieza profunda semanal. Lo ideal: combinar ambos. Si solo eliges uno, robot si tu prioridad es comodidad, escoba si es potencia." },
      { q: "¿Cuánta succión necesita un robot?", a: "Mínimo 2500 Pa para alfombras y pelo de mascota. Por debajo de 2000 Pa solo vale para suelos lisos sin pelos." },
      { q: "¿Vale la pena el filtro HEPA?", a: "Si tienes mascotas, alergias o asma: imprescindible. Atrapa partículas de 0,3 micras y la diferencia es notable en pocas semanas." },
      { q: "¿Qué autonomía debe tener una escoba?", a: ">40 min en modo normal cubre la mayoría de casas. Si tienes 150 m²+, busca >60 min o sistema de batería intercambiable." },
      { q: "¿Qué marcas recomiendas?", a: "En robots: Roborock, ECOVACS y iRobot. En escobas: Dyson lidera, Tineco e Xiaomi son buena alternativa más barata. En trineo: Bosch y Miele." },
    ],
    keywords: ["mejor aspiradora 2026", "robot aspirador comparativa", "aspiradora sin cable", "mejor aspiradora calidad precio", "aspiradora HEPA"],
  },
  {
    category: "CAFETERAS",
    slug: "cafetera",
    emoji: "☕",
    label: "Cafetera",
    labelPlural: "Cafeteras",
    color: "#92400E",
    colorDark: "#78350F",
    bgLight: "#FEF3C7",
    borderLight: "#FDE68A",
    minPrice: 30, maxPrice: 2500,
    heroSub: "Espresso, cápsulas, superautomática. Comparamos las que sirven café como en cafetería.",
    intro: [
      "El coste por taza varía 10×: cápsulas 0,30€, espresso con café molido 0,10€, filtro 0,05€. La cafetera adecuada amortiza su precio en menos de un año si el café es parte de tu rutina.",
      "Precios actualizados <strong>varias veces al día</strong> contra las principales tiendas de España.",
    ],
    specRegex: [/(\d+)\s*bar/i, /espresso|cápsulas|cápsula|filtro|superautomática/i],
    tipos: [
      { title: "Espresso manual / semi", emoji: "🟤", pros: ["Café como en cafetería con buen molido", "Coste por taza muy bajo"], cons: ["Curva de aprendizaje", "Hay que limpiarla y mantener"], ideal: "Apasionados del café", color: "#92400E", bg: "#FEF3C7", border: "#FDE68A" },
      { title: "Cápsulas", emoji: "🟣", pros: ["Comodidad máxima", "Sin mantenimiento complicado", "Variedad de sabores"], cons: ["Coste por taza alto", "Genera residuos"], ideal: "Quienes priorizan rapidez sobre coste", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
      { title: "Superautomática", emoji: "🔵", pros: ["Muele, tampa y extrae sola", "Café excelente sin esfuerzo", "Con espumador de leche"], cons: ["Precio inicial alto (>500€)", "Mantenimiento periódico"], ideal: "Familia con varios cafeteros, presupuesto holgado", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
    ],
    criterios: [
      { icon: "💪", title: "Presión real (bar)", desc: "Mínimo 15 bar para extraer crema correcta. Muchos modelos básicos no llegan a 9 bar reales." },
      { icon: "💧", title: "Depósito de agua", desc: "1 L cubre familia diaria. Menos de 0,8 L se queda corto si lo usas varios cafés al día." },
      { icon: "🥛", title: "Vaporizador de leche", desc: "Vital si haces cappuccino o flat white. Que tenga lanza de vapor potente o sistema automático." },
      { icon: "🌡️", title: "Temperatura estable", desc: "Las buenas calientan a 90-95°C de forma constante. Las baratas oscilan demasiado." },
      { icon: "🧹", title: "Limpieza", desc: "Bandeja extraíble, descalcificación automática y porta-filtros desmontables ahorran horas al mes." },
      { icon: "⏱️", title: "Tiempo de calentamiento", desc: "Las buenas calientan en <60 segundos. Las baratas tardan 3-5 minutos." },
    ],
    paraQuien: [
      { icon: "🏆", title: "La mejor de la comparativa", desc: "Si el café es parte de tu rutina diaria y quieres acertar.", pickHint: "best" },
      { icon: "💰", title: "Calidad-precio", desc: "Espresso decente sin pagar superautomática.", pickHint: "value" },
      { icon: "🪙", title: "Si el presupuesto manda", desc: "Para café diario sencillo sin complicaciones.", pickHint: "cheap" },
      { icon: "👑", title: "Premium sin compromisos", desc: "Superautomática con espumador. Café como en cafetería sin esfuerzo.", pickHint: "premium" },
    ],
    faqs: [
      { q: "¿Cápsulas, espresso o superautomática?", a: "Cápsulas: comodidad máxima, coste/taza alto (~0,30€). Espresso: equilibrio entre control y precio (~0,10€/taza). Superautomática: lo mejor sin esfuerzo, inversión inicial alta. Decide por uso y presupuesto." },
      { q: "¿Qué presión necesito?", a: "Mínimo 15 bar para una crema correcta en espresso. Atención: muchos modelos publicitan 19 bar pero la presión real de extracción es 9 bar (es lo correcto)." },
      { q: "¿Compensa una superautomática frente a una espresso manual?", a: "Si todos en casa toman café, sí: muele en cada taza, ajusta dosis y limpia sola. Si eres único cafetero y disfrutas del proceso, una espresso manual ofrece mejor café por menos dinero." },
      { q: "¿Qué pasa con las cápsulas y el medio ambiente?", a: "Genera más residuo que el café molido. Algunas marcas tienen cápsulas reciclables o compostables, pero requieren reciclaje específico. Si el impacto te preocupa, mejor espresso o filtro." },
      { q: "¿Qué marcas recomiendas?", a: "DeLonghi y Krups en superautomáticas. Cecotec y DeLonghi en espresso manual. Nespresso y Dolce Gusto lideran en cápsulas. Sage y Breville son la gama premium absoluta." },
    ],
    keywords: ["mejor cafetera 2026", "cafetera espresso comparativa", "cafetera superautomática", "mejor cafetera calidad precio", "cafetera cápsulas"],
  },
  {
    category: "AIRES_ACONDICIONADOS",
    slug: "aire-acondicionado",
    emoji: "❄️",
    label: "Aire acondicionado",
    labelPlural: "Aires acondicionados",
    color: "#0284C7",
    colorDark: "#075985",
    bgLight: "#F0F9FF",
    borderLight: "#BAE6FD",
    minPrice: 200, maxPrice: 3000,
    heroSub: "Inverter, bomba de calor, frigorías. Comparamos los splits que enfrían bien y duran 10 años.",
    intro: [
      "Un aire acondicionado bien dimensionado consume hasta un <strong>40% menos</strong> que uno mal elegido. Frigorías insuficientes = trabaja al máximo siempre = factura disparada y vida útil reducida.",
      "Precios y stock <strong>en tiempo real</strong> contra las principales tiendas de España.",
    ],
    specRegex: [/(\d+)\s*(?:fr|frig|btu)/i, /inverter/i, /bomba\s*de\s*calor/i],
    tipos: [
      { title: "Split fijo (1×1)", emoji: "🔵", pros: ["Más eficiente y silencioso", "Estética limpia", "Vida útil larga (10-15 años)"], cons: ["Necesita instalación profesional", "Coste inicial mayor"], ideal: "Salones y dormitorios donde se quedará fijo", color: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD" },
      { title: "Multisplit", emoji: "🟢", pros: ["Una unidad exterior, varias interiores", "Estética uniforme en toda la casa", "Más eficiente que varios 1×1"], cons: ["Instalación compleja", "Inversión alta de entrada"], ideal: "Casas con 2-4 estancias a climatizar", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
      { title: "Portátil", emoji: "🟣", pros: ["Sin obras", "Lo mueves de habitación", "Instalación inmediata"], cons: ["Mucho más ruidoso", "Eficiencia muy inferior", "Tubo en la ventana"], ideal: "Alquilados, uso ocasional, necesidad puntual", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
    ],
    criterios: [
      { icon: "📐", title: "Frigorías por m²", desc: "Multiplica m² × 100 para frigorías necesarias. Con mucho sol o última planta, suma 20%." },
      { icon: "🔄", title: "Inverter (siempre)", desc: "Regula velocidad en lugar de encenderse y apagarse. Hasta 35% menos consumo y mucho más silencioso." },
      { icon: "🌡️", title: "Bomba de calor", desc: "Calienta produciendo 3-5× más energía de la que consume. Mucho más eficiente que cualquier radiador eléctrico." },
      { icon: "🔇", title: "Ruido (dB)", desc: "Unidad interior <22 dB para dormitorio. <30 dB para salón. Por encima molesta de noche." },
      { icon: "📡", title: "WiFi y compatibilidad", desc: "Útil si lo usas a diario y quieres encenderlo desde el móvil. Verifica compatibilidad con asistentes." },
      { icon: "🌬️", title: "Caudal y modo eco", desc: "Filtros lavables, purificación de aire y modo silencioso para dormir son los extras útiles." },
    ],
    paraQuien: [
      { icon: "🏆", title: "El mejor de la comparativa", desc: "Para acertar a la primera con un equipo que durará 10-15 años.", pickHint: "best" },
      { icon: "💰", title: "Calidad-precio", desc: "Inverter, A++ y bomba de calor sin pagar premium.", pickHint: "value" },
      { icon: "🪙", title: "Si el presupuesto manda", desc: "Frío fiable a buen precio. Sin extras de marketing.", pickHint: "cheap" },
      { icon: "👑", title: "Premium sin compromisos", desc: "WiFi, modo silencioso real, filtros premium. Lo mejor disponible ahora.", pickHint: "premium" },
    ],
    faqs: [
      { q: "¿Cuántas frigorías necesito?", a: "m² × 100 frigorías. 20 m² → 2000 fr. Con mucha luz solar o última planta suma 20%. Si te quedas corto, el equipo trabajará al máximo siempre = factura alta y avería temprana." },
      { q: "¿Inverter o no?", a: "Inverter siempre. Modula velocidad en vez de encenderse y apagarse: hasta 35% menos consumo, mucho más silencioso y la temperatura es más estable. Sin debate." },
      { q: "¿Vale la pena la bomba de calor?", a: "Sí, sobre todo si lo usas en invierno. Produce 3-5× más calor del que consume en electricidad. Más eficiente que cualquier radiador eléctrico." },
      { q: "¿Split o portátil?", a: "Split sin discusión si va a quedar fijo: más eficiente, más silencioso y dura el doble. Portátil solo si alquilas o uso muy ocasional." },
      { q: "¿Qué marcas recomiendas?", a: "Daikin y Mitsubishi lideran calidad y eficiencia. LG y Panasonic en gama media-alta. Hisense, Hitachi y Cecotec en relación calidad-precio." },
    ],
    keywords: ["mejor aire acondicionado 2026", "split inverter comparativa", "aire acondicionado bomba calor", "mejor aire acondicionado calidad precio", "split 3000 frigorías"],
  },
];

export function getGuideBySlug(slug: string): GuideConfig | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
