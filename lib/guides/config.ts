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

/** Errores comunes que cometen los compradores al elegir este electrodoméstico. */
export type Error = { icon: string; title: string; desc: string };

/** Mejor momento del año para comprar barato, con descuento típico esperado. */
export type Periodo = { mes: string; descuento: string; nota: string };

/** Marca con su punto fuerte, débil e ideal de uso. */
export type Marca = { name: string; strong: string; weak: string; ideal: string };

/** Término técnico explicado en una línea. */
export type Termino = { term: string; def: string };

/** Rango de presupuesto: qué encontrar y qué esperar. */
export type Presupuesto = { rango: string; etiqueta: string; desc: string; ejemplo: string };

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
  /** Errores comunes al elegir */
  errores?: Error[];
  /** Calendario de mejores momentos para comprar */
  cuandoComprar?: Periodo[];
  /** Marcas recomendadas con fortalezas/debilidades */
  marcas?: Marca[];
  /** Glosario técnico */
  glosario?: Termino[];
  /** Rangos de presupuesto */
  presupuestos?: Presupuesto[];
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
    errores: [
      { icon: "📏", title: "No medir el hueco antes", desc: "El error #1: el frigorífico llega y no entra por la puerta o sobresale 10 cm. Mide ancho, alto, fondo Y el camino hasta la cocina." },
      { icon: "🏷️", title: "Mirar solo capacidad total", desc: "300 L de capacidad útil pesan más que 380 L con paredes gruesas. Compara siempre la cifra útil." },
      { icon: "💸", title: "Ignorar el coste energético", desc: "Un clase F consume 200€+/año, un clase A menos de 90€. En 10 años son 1.000€ de diferencia, más que el extra de precio inicial." },
      { icon: "🔊", title: "No comprobar los decibelios", desc: "Cocina abierta al salón y compras un equipo de 42 dB: lo oirás de fondo todas las noches. Para piso cerrado, <38 dB." },
      { icon: "🚪", title: "Olvidar la apertura de puerta", desc: "Hay modelos que solo abren a un lado. Si la pared lateral te obliga al otro sentido, se queda inservible." },
    ],
    cuandoComprar: [
      { mes: "Black Friday (último viernes nov.)", descuento: "20-35%", nota: "El mejor momento del año para frigoríficos premium. Stock alto, descuentos reales contra PVP." },
      { mes: "Rebajas de enero", descuento: "15-25%", nota: "Liquidan stock 2025 para meter modelos 2026. Buen momento si no te importa el modelo del año anterior." },
      { mes: "Rebajas de verano (julio)", descuento: "10-20%", nota: "Menos agresivas que las de invierno. Algunos modelos de cocina suben antes de septiembre." },
      { mes: "Cyber Monday + semana siguiente", descuento: "15-25%", nota: "Continuación del Black Friday. A veces los modelos top vuelven a bajar si no se vendieron." },
    ],
    marcas: [
      { name: "Bosch / Siemens / Balay", strong: "Fiabilidad y vida útil. 12+ años funcionando sin problemas.", weak: "Diseño conservador, precio premium en gama alta.", ideal: "Quien quiere comprar una sola vez en 15 años." },
      { name: "LG", strong: "Linear Cooling, control de humedad y diseño interior cuidado.", weak: "Reparaciones más caras que BSH.", ideal: "Si valoras conservación de fruta y verdura a tope." },
      { name: "Samsung", strong: "Estética premium y funciones inteligentes (cámara interior, Family Hub).", weak: "Algunos modelos sufren ruidos del compresor con el tiempo.", ideal: "Cocinas modernas, presupuesto holgado." },
      { name: "Liebherr", strong: "Referente absoluto en gama alta: BioFresh y conservación de élite.", weak: "Precio muy alto y catálogo limitado en España.", ideal: "Quien cocina mucho y quiere lo mejor en conservación." },
      { name: "Beko / Hisense", strong: "Relación calidad-precio imbatible en gama media-baja.", weak: "Acabados algo más justos, vida útil 8-10 años (no 15).", ideal: "Presupuesto ajustado, segunda vivienda." },
    ],
    glosario: [
      { term: "No Frost", def: "Sistema que ventila aire frío seco para evitar escarcha. Imprescindible." },
      { term: "Clase energética", def: "Etiqueta de A (mejor) a G (peor) según consumo anual normalizado." },
      { term: "Zona 0°C / BioFresh", def: "Compartimento entre 0-2°C que conserva carne y pescado 3× más tiempo." },
      { term: "Linear Cooling", def: "Tecnología LG que mantiene temperatura estable ±0.5°C en toda la nevera." },
      { term: "Inverter", def: "Compresor que modula su velocidad en vez de encenderse/apagarse. Más eficiente y silencioso." },
      { term: "Profundidad encimera", def: "Modelos de 60-66 cm de fondo que quedan alineados con muebles estándar." },
      { term: "Dual cooling", def: "Dos circuitos de frío independientes para nevera y congelador, sin mezcla de aire/olores." },
    ],
    presupuestos: [
      { rango: "300-450€", etiqueta: "Básico", desc: "Combi 1 puerta, capacidad 250-300 L, clase D o E. Sin no frost en muchos casos.", ejemplo: "2ª vivienda o estudios" },
      { rango: "450-700€", etiqueta: "Equilibrado", desc: "Combi No Frost de marca conocida, clase A o B, 300-350 L. La compra inteligente.", ejemplo: "Pareja o familia pequeña" },
      { rango: "700-1100€", etiqueta: "Familia", desc: "Combi grande (380-450 L), zona 0°C, dual cooling, clase A. Bosch/LG gama media-alta.", ejemplo: "Familia de 4-5" },
      { rango: "1100€+", etiqueta: "Premium", desc: "Americano o French Door 500 L+, dispensador agua/hielo, WiFi, acabado inox premium.", ejemplo: "Cocinas grandes" },
    ],
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
    errores: [
      { icon: "⚖️", title: "Comprarla pequeña", desc: "Te ahorras 50€ en 7 kg y haces dos coladas a la semana en vez de una. La lavadora más grande no es ineficiente: la electrónica detecta carga." },
      { icon: "🌀", title: "Obsesionarse con las RPM", desc: "1600 RPM solo merece la pena para prendas voluminosas. 1400 RPM es el dulce spot. 1200 RPM ya es suficiente para uso normal." },
      { icon: "🚿", title: "Ignorar el motor inverter", desc: "Sin inverter pierdes 5+ años de vida útil y multiplicas el ruido. Casi todas las gamas medias y altas lo llevan." },
      { icon: "📱", title: "Pagar por WiFi que no usarás", desc: "El 80% de la gente nunca enciende la lavadora desde el móvil. No pagues 100€ extra por una función que no aprovecharás." },
      { icon: "🚿", title: "No verificar el tipo de instalación", desc: "Algunos modelos necesitan toma de agua específica o tienen poca tolerancia de altura. Mide y revisa antes." },
    ],
    cuandoComprar: [
      { mes: "Black Friday (último viernes nov.)", descuento: "20-30%", nota: "Mejor momento absoluto. Especialmente para gama media-alta Bosch/AEG/LG." },
      { mes: "Rebajas de enero", descuento: "15-25%", nota: "Liquidan stock anterior. Si te conviene un modelo 2025 es el momento." },
      { mes: "Mid-season Spring (marzo-abril)", descuento: "10-15%", nota: "Reactivan ventas con descuentos en gama básica y media tras pico navideño." },
      { mes: "Rebajas de verano", descuento: "10-20%", nota: "Buen momento para Beko, Indesit y marcas de relación calidad-precio." },
    ],
    marcas: [
      { name: "Bosch / Siemens / Balay", strong: "Motor EcoSilence con 10 años de garantía. Lavado impecable a 1.400 RPM.", weak: "Premium en precio, especialmente Siemens.", ideal: "Quien busca una compra para 12-15 años." },
      { name: "LG", strong: "Motor Direct Drive (sin correa) con 10 años de garantía. AI DD reconoce tejidos.", weak: "Servicio técnico más lento que BSH.", ideal: "Tecnología punta y silencio extremo." },
      { name: "AEG", strong: "Tecnología SoftWater suaviza el agua y reduce detergente. Programas premium.", weak: "Más cara que Bosch a igualdad de prestaciones.", ideal: "Quien cuida ropa delicada y quiere lo mejor." },
      { name: "Samsung", strong: "EcoBubble disuelve detergente en agua fría (ahorra luz). AddWash añade ropa a media colada.", weak: "Algunos modelos tienen problemas con el sello de la puerta a los 5-6 años.", ideal: "Familias con muchas coladas variadas." },
      { name: "Beko", strong: "Relación calidad-precio top en gama 8 kg de uso normal.", weak: "Vida útil 8-10 años, no 15.", ideal: "Presupuesto ajustado, primer hogar." },
    ],
    glosario: [
      { term: "RPM", def: "Revoluciones por minuto del centrifugado. Más RPM = ropa más seca al salir." },
      { term: "Inverter", def: "Motor sin escobillas, regula velocidad. Más silencioso, eficiente y duradero." },
      { term: "Direct Drive", def: "Motor LG conectado directamente al tambor (sin correa). Menos averías." },
      { term: "EcoBubble", def: "Sistema Samsung que disuelve detergente con espuma en agua fría." },
      { term: "AutoDosis", def: "Dosificador que añade el detergente exacto según carga. Útil para uso intensivo." },
      { term: "Clase A", def: "Más eficiente. Diferencia con C son ~40€/año en luz+agua." },
      { term: "Función Vapor", def: "Trata ropa con vapor para reducir bacterias, alérgenos y arrugas." },
    ],
    presupuestos: [
      { rango: "250-400€", etiqueta: "Básico", desc: "7 kg, 1200 RPM, sin inverter o inverter básico. Marcas como Indesit, Candy.", ejemplo: "Estudio o primera vivienda" },
      { rango: "400-600€", etiqueta: "Equilibrado", desc: "8-9 kg, 1400 RPM, motor inverter con garantía 10 años, clase A o B.", ejemplo: "Pareja o familia pequeña" },
      { rango: "600-900€", etiqueta: "Familia", desc: "9-10 kg, 1400 RPM, programas inteligentes, eco40-60, clase A. BSH gama media.", ejemplo: "Familia de 4+, uso intensivo" },
      { rango: "900€+", etiqueta: "Premium", desc: "10-12 kg, 1600 RPM, vapor, autodosis, WiFi real. AEG/Miele/LG top.", ejemplo: "Quien lava mucho y quiere lo mejor" },
    ],
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
    errores: [
      { icon: "📏", title: "Comprar pantalla pequeña", desc: "El error universal: te quedarás corto en 6 meses. Para sofá a 3 m, 65\" no es grande, es el mínimo razonable." },
      { icon: "✨", title: "Confiar en el HDR sin brillo", desc: "Una TV con HDR10 que solo alcanza 300 nits es marketing. Para que el HDR se note, mínimo 600-800 nits de pico." },
      { icon: "🎮", title: "Olvidar HDMI 2.1 en gaming", desc: "Si tienes PS5/Xbox Series X y quieres 4K@120Hz, necesitas HDMI 2.1 con ALLM y VRR. No vale con 2.0b." },
      { icon: "📡", title: "Smart TV con sistema raro", desc: "Sistemas propietarios desactualizan apps en 2-3 años. Google TV, webOS y Tizen son seguros." },
      { icon: "🔊", title: "Esperar buen sonido del altavoz", desc: "TVs delgadas tienen altavoces minúsculos. Reserva 200-400€ para barra de sonido o no oirás los diálogos." },
    ],
    cuandoComprar: [
      { mes: "Black Friday + Cyber Monday", descuento: "25-40%", nota: "El mejor mes del año para TVs. OLED y QLED premium con descuentos brutales." },
      { mes: "Mundial / Eurocopa (junio)", descuento: "15-25%", nota: "Las marcas lanzan promociones agresivas en TVs grandes durante grandes eventos deportivos." },
      { mes: "Lanzamiento modelos nuevos (abril-mayo)", descuento: "20-30%", nota: "Los modelos del año anterior se liquidan. Son los mismos paneles que el modelo nuevo." },
      { mes: "Rebajas verano", descuento: "10-20%", nota: "Menos agresivas pero útil para gama media. Hisense y TCL bajan mucho." },
    ],
    marcas: [
      { name: "LG", strong: "Líder absoluto en OLED. webOS es el smart TV más fluido. Diseño premium.", weak: "Brillo máximo limitado vs QLED en habitaciones muy iluminadas.", ideal: "Cinéfilos y gamers exigentes (HDMI 2.1 en toda la gama)." },
      { name: "Sony", strong: "Procesador de imagen Bravia Cognitive: mejor escalado del mercado. Google TV.", weak: "Precios más altos a igualdad de panel.", ideal: "Quien valora calidad de imagen pura y no rinde tributo al marketing." },
      { name: "Samsung", strong: "QLED y Neo QLED dominan brillo y color. Game Hub para cloud gaming sin consola.", weak: "Tizen no soporta Dolby Vision (solo HDR10+).", ideal: "Salones luminosos, gamers que valoran cloud gaming." },
      { name: "TCL / Hisense", strong: "QLED Mini-LED a mitad de precio que Samsung/Sony. Google TV integrado.", weak: "Procesado y software algo más lentos que premium.", ideal: "Quien quiere mejor calidad-precio absoluta en 2026." },
      { name: "Philips", strong: "Ambilight: iluminación trasera que extiende imagen. Único en el mercado.", weak: "Sistema operativo Google TV con bugs ocasionales.", ideal: "Quien quiere experiencia inmersiva diferente al resto." },
    ],
    glosario: [
      { term: "OLED", def: "Cada píxel emite su propia luz. Negros perfectos, contraste infinito." },
      { term: "QLED", def: "LCD con capa de puntos cuánticos: más brillo y mejor color, pero negros menos puros." },
      { term: "Mini-LED", def: "QLED con miles de zonas de retroiluminación. Casi alcanza OLED en contraste, supera en brillo." },
      { term: "HDR10 / HDR10+ / Dolby Vision", def: "Estándares de alto rango dinámico. Dolby Vision es el más completo (metadatos dinámicos)." },
      { term: "120 Hz", def: "Tasa de refresco. Imprescindible para gaming en consolas de nueva generación." },
      { term: "HDMI 2.1", def: "Versión que soporta 4K@120Hz, ALLM y VRR. Necesario para PS5/Xbox Series." },
      { term: "ALLM / VRR", def: "Auto Low Latency Mode + Variable Refresh Rate. Eliminan stuttering y tearing en juegos." },
      { term: "Nits", def: "Unidad de brillo. 600+ nits es HDR decente, 1000+ nits es excelente." },
    ],
    presupuestos: [
      { rango: "300-500€", etiqueta: "Básico", desc: "TV 50-55\" LED 4K, 60 Hz, smart TV básico. Hisense, TCL básicos.", ejemplo: "Segunda TV, dormitorio" },
      { rango: "500-900€", etiqueta: "Equilibrado", desc: "55-65\" QLED o LED premium, 120 Hz, HDR real, Google TV. Hisense/TCL gama media-alta.", ejemplo: "Salón estándar" },
      { rango: "900-1500€", etiqueta: "Recomendado", desc: "65\" OLED de gama media o 75\" QLED top, HDMI 2.1, Dolby Vision. LG C-series, Samsung Q70.", ejemplo: "Salón principal, gaming" },
      { rango: "1500€+", etiqueta: "Premium", desc: "65-77\" OLED top o Mini-LED 85\". Sony Bravia 9, LG G-series, Samsung S95.", ejemplo: "Cine en casa, exigencia máxima" },
    ],
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
    errores: [
      { icon: "🍽️", title: "Quedarse corto en cubiertos", desc: "Familia de 4 con lavavajillas de 9 cubiertos = pones el lavavajillas a diario. Mínimo 12 para una familia." },
      { icon: "🔇", title: "Ignorar los decibelios", desc: "48 dB se oye desde el salón y arruina las pelis. Para cocina abierta, máximo 44 dB. 42 dB es el oro." },
      { icon: "💧", title: "Comprar uno que no seque plástico", desc: "Tupper que sale chorreando = arrepentimiento cada lavado. Busca aire caliente o ventilador, no solo condensación." },
      { icon: "📦", title: "Olvidar el tercer nivel", desc: "Bandeja superior para cubiertos largos y utensilios planos. Una vez la tienes, no quieres lavavajillas sin ella." },
      { icon: "🧂", title: "No verificar dureza del agua", desc: "Si tu agua es muy dura (Madrid, Mediterráneo), necesitas modelo con descalcificador o el lavado fracasará en 6 meses." },
    ],
    cuandoComprar: [
      { mes: "Black Friday", descuento: "20-35%", nota: "Mejor momento para gama media-alta Bosch y AEG. Stock alto." },
      { mes: "Rebajas de enero", descuento: "15-25%", nota: "Liquidaciones agresivas en gama básica y media." },
      { mes: "Eurocopa / Mundial (junio)", descuento: "10-20%", nota: "Promociones de paquetes 'cocina completa' para reformas." },
      { mes: "Cyber Monday", descuento: "15-30%", nota: "Suele repetir descuentos del Black Friday con algún modelo extra rebajado." },
    ],
    marcas: [
      { name: "Bosch / Siemens / Balay", strong: "Lavado y secado top, motor EcoSilence, 41-42 dB en gama media.", weak: "Premium en precio, especialmente Siemens.", ideal: "Quien busca el lavado perfecto con vida útil de 15+ años." },
      { name: "AEG", strong: "AirDry: puerta se abre sola al final del ciclo para secar mejor.", weak: "Stock limitado en España.", ideal: "Quien valora el secado perfecto del plástico." },
      { name: "Miele", strong: "Referente absoluto: lavado, silencio (38 dB) y durabilidad (20+ años).", weak: "Precios desde 1.000€, fuera de presupuesto medio.", ideal: "Quien compra una sola vez y quiere lo mejor." },
      { name: "Beko / Hisense", strong: "Calidad-precio imbatible. 12 cubiertos por 350-450€.", weak: "Vida útil 8-10 años, secado plástico mejorable.", ideal: "Presupuesto ajustado, segunda vivienda." },
      { name: "Whirlpool", strong: "6th Sense que ajusta agua y temperatura según suciedad.", weak: "Acabados algo justos en gama media.", ideal: "Familias con uso intensivo a precio medio." },
    ],
    glosario: [
      { term: "Cubiertos", def: "Unidad estándar (1 plato + 1 vaso + cubierto). Familia 4 = 12-13 cubiertos." },
      { term: "Eco40-60", def: "Programa estándar regulado por UE. Lava a 40-60°C con consumo bajísimo (2-3h)." },
      { term: "Tercer nivel", def: "Bandeja superior plana para cubiertos largos y utensilios. Útil." },
      { term: "AirDry / AutoOpen", def: "La puerta se abre al final del ciclo para secar plástico mejor." },
      { term: "ZeoLite", def: "Mineral que absorbe humedad y la convierte en calor. Bosch/Siemens." },
      { term: "Descalcificador", def: "Sistema que neutraliza la dureza del agua con sal. Imprescindible en agua dura." },
      { term: "Apertura tercer brazo", def: "Brazo aspersor extra que mejora el lavado en la bandeja superior." },
    ],
    presupuestos: [
      { rango: "300-450€", etiqueta: "Básico", desc: "9-12 cubiertos, 46-48 dB, secado condensación. Beko, Indesit, Whirlpool básico.", ejemplo: "Pareja, presupuesto ajustado" },
      { rango: "450-700€", etiqueta: "Equilibrado", desc: "12-13 cubiertos, 42-44 dB, tercer nivel, clase A o B. Balay, Bosch gama media.", ejemplo: "Familia 3-4" },
      { rango: "700-1100€", etiqueta: "Familia", desc: "14-15 cubiertos, 41-42 dB, AutoOpen, brazo aspersor superior. Bosch/AEG.", ejemplo: "Familia grande, uso intensivo" },
      { rango: "1100€+", etiqueta: "Premium", desc: "Miele/Siemens top: 38 dB, sensores avanzados, cesta variable, WiFi real.", ejemplo: "Cocina premium, exigencia total" },
    ],
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
    errores: [
      { icon: "🔥", title: "Comprar condensación clásica", desc: "Te ahorras 100€ y pagas 50€/año más en luz para siempre. La bomba de calor se amortiza en 2-3 años." },
      { icon: "⚖️", title: "Menor capacidad que la lavadora", desc: "Lavadora 9 kg + secadora 7 kg = secas en dos cargas o la dañas. Mismo o mayor que la lavadora." },
      { icon: "💧", title: "No conectar al desagüe", desc: "Vaciar depósito cada 3 cargas es coñazo. Si puedes, conéctala a desagüe directo desde el primer día." },
      { icon: "📱", title: "Pagar por programas que no usarás", desc: "20 programas específicos para 'jeans dark blue' son marketing. 5-6 programas reales cubren todo." },
      { icon: "🌡️", title: "Olvidar el sensor de humedad", desc: "Una secadora sin sensor mete temperatura fija = ropa quemada o aún húmeda. Sensor es estándar moderno." },
    ],
    cuandoComprar: [
      { mes: "Black Friday", descuento: "25-35%", nota: "Mejor mes absoluto. Las bomba de calor de marca caen 200-300€." },
      { mes: "Otoño (sept-oct)", descuento: "10-20%", nota: "Buen momento porque hay stock, antes del frenesí navideño." },
      { mes: "Rebajas de invierno (enero)", descuento: "15-25%", nota: "Demanda alta por lluvia + necesidad real. Marcas premium con descuento agresivo." },
      { mes: "Cyber Monday", descuento: "20-30%", nota: "Repesca del Black Friday. Algunas marcas guardan modelos para esta semana." },
    ],
    marcas: [
      { name: "Bosch / Siemens / Balay", strong: "Vida útil 12+ años. SelfCleaning Condenser elimina pelusa automáticamente.", weak: "Premium en precio.", ideal: "Quien usa secadora varias veces por semana." },
      { name: "AEG", strong: "AbsoluteCare: secado especial para lana y delicado a baja temperatura.", weak: "Catálogo más reducido en España.", ideal: "Hogares con ropa delicada o lana." },
      { name: "LG", strong: "Inverter Direct Drive con 10 años de garantía. Más silencioso del mercado.", weak: "Apps con bugs ocasionales.", ideal: "Pisos con cocina cerca del salón." },
      { name: "Samsung", strong: "AI EcoDry detecta humedad real y ajusta tiempo. AddDry para añadir ropa.", weak: "Bomba de calor más cara que la competencia directa.", ideal: "Quien quiere añadir ropa a mitad de ciclo." },
      { name: "Beko", strong: "Calidad-precio decente en bomba de calor desde 450€.", weak: "Acabados ajustados, vida útil 8-10 años.", ideal: "Primera secadora, presupuesto ajustado." },
    ],
    glosario: [
      { term: "Bomba de calor", def: "Sistema que reutiliza el calor del propio aire. Consume la mitad que condensación." },
      { term: "Condensación", def: "Sistema antiguo que calienta aire y condensa la humedad. Consume el doble." },
      { term: "Sensor de humedad", def: "Detecta cuándo la ropa está seca y apaga automáticamente. Estándar moderno." },
      { term: "Clase A+++", def: "Máxima eficiencia, gasta ~50€/año en uso familiar." },
      { term: "Tambor de acero", def: "Resiste mejor el desgaste que el tambor plástico. Suele en gama media-alta." },
      { term: "Iluminación interior", def: "LED dentro del tambor. Útil para verificar ropa pequeña que cae." },
      { term: "Filtro de pelusa", def: "Hay que limpiarlo en cada uso. Bosch tiene autolimpieza opcional." },
    ],
    presupuestos: [
      { rango: "350-500€", etiqueta: "Básico", desc: "7-8 kg, bomba de calor entrada, clase A o A+. Beko, Indesit, Candy.", ejemplo: "Primera secadora, uso esporádico" },
      { rango: "500-750€", etiqueta: "Equilibrado", desc: "8-9 kg, bomba de calor con sensor humedad, A++. Balay, Bosch básica.", ejemplo: "Familia, uso semanal" },
      { rango: "750-1100€", etiqueta: "Familia", desc: "9-10 kg, A+++, programas inteligentes, autolimpieza. Bosch/Siemens gama media.", ejemplo: "Familia grande, uso frecuente" },
      { rango: "1100€+", etiqueta: "Premium", desc: "10+ kg, vapor, conectividad, sensores avanzados. AEG, Miele, LG top.", ejemplo: "Quien quiere lo mejor sin compromisos" },
    ],
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
    errores: [
      { icon: "📐", title: "No medir el hueco con margen", desc: "Hornos integrables miden 60 cm pero algunos necesitan +1 cm de ventilación. Mide y consulta ficha técnica." },
      { icon: "🌀", title: "Comprar uno sin convección", desc: "Sin aire forzado cocina de manera desigual: arriba quemado, abajo crudo. Cualquier moderno la trae." },
      { icon: "🧹", title: "Pirolítico para alguien que no limpiará", desc: "Sí, autolimpia. Pero cada ciclo gasta 3 kWh y dura 2 horas. Si lo limpias en cada uso, no compensa el extra de 200€." },
      { icon: "📦", title: "Subestimar la capacidad", desc: "60 L es lo justo para una bandeja de pollo. Si haces canelones o pizzas familiares, 71 L+ sin dudar." },
      { icon: "🔌", title: "Olvidar la potencia eléctrica", desc: "Algunos hornos top piden 3.5 kW y tu casa solo tiene 3.3 kW contratados. Salta el térmico siempre." },
    ],
    cuandoComprar: [
      { mes: "Black Friday", descuento: "20-35%", nota: "El mejor mes para hornos pirolíticos premium. Cuidado con stock limitado." },
      { mes: "Reforma de cocina (paquete)", descuento: "10-25%", nota: "Si compras horno + placa + campana de la misma marca, descuento adicional típico." },
      { mes: "Rebajas de enero", descuento: "15-25%", nota: "Liquidación stock 2025. Modelos del año anterior son idénticos al nuevo." },
      { mes: "Cyber Monday", descuento: "15-25%", nota: "Segunda oportunidad si te perdiste el Black Friday." },
    ],
    marcas: [
      { name: "Bosch / Siemens / Balay", strong: "Calentamiento rápido, pirolítico fiable, sondas precisas. 12+ años de vida útil.", weak: "Premium en precio.", ideal: "Quien cocina mucho y quiere acertar." },
      { name: "AEG", strong: "SteamBake (vapor para pan/repostería), múltiples niveles de cocción.", weak: "Catálogo más limitado.", ideal: "Repostería y panadería casera." },
      { name: "Miele", strong: "Referente absoluto. Vapor, sondas, sistema MultiSteam.", weak: "Precio desde 1.500€.", ideal: "Cocina como hobby serio." },
      { name: "Whirlpool / Hotpoint", strong: "Tecnología 6th Sense que ajusta tiempo y temperatura.", weak: "Materiales algo más justos en gama media.", ideal: "Familias con uso frecuente, presupuesto medio." },
      { name: "Cecotec / Teka", strong: "Pirolítico desde 250-300€. Buena relación calidad-precio.", weak: "Vida útil 7-10 años (no 15).", ideal: "Primera reforma, presupuesto ajustado." },
    ],
    glosario: [
      { term: "Convección", def: "Aire forzado con ventilador. Cocina uniforme y reduce tiempos. Estándar moderno." },
      { term: "Pirolítico", def: "Sistema de autolimpieza que quema restos a 500°C. Deja interior impecable." },
      { term: "Catalítico", def: "Paredes con esmalte que absorbe grasa. Más barato que pirolítico pero menos eficaz." },
      { term: "Hidrolítico", def: "Autolimpieza con agua y vapor a 80°C. Eficaz para suciedad ligera." },
      { term: "Función vapor", def: "Inyecta humedad durante cocción. Pan, pescado y carnes con más jugosidad." },
      { term: "Sonda de carne", def: "Termómetro que se clava en la pieza. El horno se apaga al alcanzar temperatura." },
      { term: "Multifunción", def: "Programas combinados (grill+aire, vapor+aire) que automatizan recetas." },
    ],
    presupuestos: [
      { rango: "180-350€", etiqueta: "Básico", desc: "Multifunción con convección, limpieza catalítica, 60 L. Cecotec, Teka básico.", ejemplo: "Primera vivienda, uso ocasional" },
      { rango: "350-550€", etiqueta: "Equilibrado", desc: "Multifunción + pirolítico, 65-71 L, clase A. Balay, Bosch gama media.", ejemplo: "Familia, uso semanal" },
      { rango: "550-900€", etiqueta: "Familia", desc: "Pirolítico + vapor opcional, sonda, 71+ L, clase A+. Bosch/Siemens.", ejemplo: "Cocina principal, uso frecuente" },
      { rango: "900€+", etiqueta: "Premium", desc: "Vapor + pirolítico + WiFi + sondas. AEG, Miele, NEFF SlideHide.", ejemplo: "Cocina como hobby, panadería" },
    ],
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
    errores: [
      { icon: "🔢", title: "Comprar 600 W como uso diario", desc: "600 W tarda el doble en calentar. Para uso real, mínimo 700 W. Para cocinar, 900 W+." },
      { icon: "🔥", title: "Grill decorativo (<800 W reales)", desc: "Algunos modelos baratos publicitan grill pero solo dan 600 W de potencia real. No dora." },
      { icon: "📐", title: "Pensar que cabe el plato", desc: "Algunos microondas tienen plato giratorio de 24 cm. Tu plato familiar de 27 cm no entra. Mide siempre." },
      { icon: "⚙️", title: "No verificar inverter", desc: "Sin inverter, recalentar comida grande sale por fuera caliente y centro frío. Con inverter calienta uniformemente." },
      { icon: "🔇", title: "Olvidar que pitan al terminar", desc: "Algunos modelos pitan a volumen alto sin opción a silenciar. Verifica que sea ajustable o desactivable." },
    ],
    cuandoComprar: [
      { mes: "Black Friday", descuento: "20-40%", nota: "Mejor mes. Microondas Panasonic inverter y combinados con descuentos brutales." },
      { mes: "Rebajas de enero", descuento: "15-25%", nota: "Buen momento para gama básica y media." },
      { mes: "Vuelta al cole (sept)", descuento: "10-20%", nota: "Carrefour, MediaMarkt y otros sacan promos de electrodomésticos pequeños." },
      { mes: "Cyber Monday", descuento: "15-25%", nota: "Continuación del Black Friday con repesca de modelos populares." },
    ],
    marcas: [
      { name: "Panasonic", strong: "Inverter pionero. Calentamiento uniforme y vida útil 10+ años.", weak: "Diseño algo conservador.", ideal: "Quien usa microondas a diario." },
      { name: "Samsung", strong: "Convección + grill en combinado. Diseño premium.", weak: "Reparaciones algo caras.", ideal: "Cocinas sin horno separado." },
      { name: "LG", strong: "NeoChef sin plato, inverter, fácil limpieza.", weak: "Menos modelos básicos.", ideal: "Quien valora diseño y facilidad de limpieza." },
      { name: "Cecotec", strong: "Precio bajísimo y muchas funciones para el precio.", weak: "Vida útil 4-6 años, plásticos justos.", ideal: "Primera vivienda, uso ocasional." },
      { name: "Balay / Bosch", strong: "Integrables de gama media-alta para cocina premium.", weak: "Precio alto para libre instalación.", ideal: "Cocinas integradas en muebles." },
    ],
    glosario: [
      { term: "Inverter", def: "Tecnología que modula potencia en lugar de encender/apagar. Calentamiento uniforme." },
      { term: "Grill", def: "Resistencia superior que tuesta y dora. Útil para gratinar." },
      { term: "Convección", def: "Aire caliente forzado. Permite hornear como un horno pequeño." },
      { term: "Combinado", def: "Microondas + grill + convección. Sustituye al horno en porciones pequeñas." },
      { term: "Plato giratorio", def: "Tradicional. Necesita rotación para uniformidad. Los modernos sin plato distribuyen ondas mejor." },
      { term: "Sensor de humedad", def: "Detecta cuándo la comida está hecha y se apaga automáticamente." },
      { term: "Capacidad (L)", def: "Litros del interior. 20 L cabe 1 plato, 28+ L para platos familiares." },
    ],
    presupuestos: [
      { rango: "50-120€", etiqueta: "Básico", desc: "Solo microondas, 700 W, 17-20 L. Cecotec, Severin básicos.", ejemplo: "Recalentar, descongelar simple" },
      { rango: "120-250€", etiqueta: "Equilibrado", desc: "Con grill, 800-900 W, 23-25 L, inverter en algunos. Panasonic, Cecotec.", ejemplo: "Uso diario familiar" },
      { rango: "250-450€", etiqueta: "Combinado", desc: "Grill + convección, 28-32 L, programas inteligentes. Samsung, LG.", ejemplo: "Sin horno separado, uso variado" },
      { rango: "450€+", etiqueta: "Premium", desc: "Integrable, vapor, automático, acabados premium. Bosch, Siemens.", ejemplo: "Cocinas integradas exigentes" },
    ],
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
    errores: [
      { icon: "📢", title: "Confundir vatios con succión", desc: "El motor en W no es succión real. Mira Pa (Pascales) en robots y AW (AirWatts) en escobas." },
      { icon: "🐾", title: "Sin filtro HEPA con mascotas", desc: "El polvo y pelos de mascota recirculan por la casa. HEPA atrapa partículas de 0,3 micras." },
      { icon: "🔋", title: "Batería 30 min en piso grande", desc: "Casa de 100 m² + autonomía de 30 min = aspirar a medias. Mínimo 40-60 min para uso real." },
      { icon: "🤖", title: "Robot sin LiDAR en piso grande", desc: "Robot con sensor giroscópico se pierde y deja zonas sin aspirar. LiDAR mapea de verdad." },
      { icon: "🪣", title: "Depósito ridículo", desc: "Robot con 0,2 L necesita vaciado cada 2 días. Mínimo 0,4 L o estación de autovaciado." },
    ],
    cuandoComprar: [
      { mes: "Amazon Prime Day (julio)", descuento: "25-45%", nota: "Mejor mes absoluto para robots Roborock, iRobot y Dyson." },
      { mes: "Black Friday", descuento: "30-50%", nota: "Especialmente brutal en gama premium. Robots top a mitad de precio." },
      { mes: "Cyber Monday", descuento: "25-40%", nota: "Continuación con repesca de modelos." },
      { mes: "Rebajas enero", descuento: "15-30%", nota: "Liquidación stock. Buen momento para escobas Dyson." },
    ],
    marcas: [
      { name: "Roborock", strong: "Mejor relación calidad-precio en robots con LiDAR. Mopa vibratoria.", weak: "App con traducción de español justa.", ideal: "Quien quiere lo último en robots sin pagar iRobot." },
      { name: "iRobot Roomba", strong: "Pioneros, navegación fiable, ecosistema con autovaciado.", weak: "Premium en precio. Algunos modelos sin LiDAR.", ideal: "Quien quiere la marca conocida y soporte." },
      { name: "Dyson", strong: "Líder absoluto en escobas sin cable. Succión profesional.", weak: "Precios desde 500€. Batería se degrada en 3-4 años.", ideal: "Limpieza intensiva con presupuesto." },
      { name: "Tineco / Xiaomi", strong: "Escobas potentes a precio razonable. Algunas con autolimpieza.", weak: "Servicio postventa más lento.", ideal: "Quien quiere Dyson sin pagar Dyson." },
      { name: "Bosch / Miele", strong: "Trineos con cable de fiabilidad legendaria. Filtración HEPA top.", weak: "Cable molesto, ya en declive.", ideal: "Casas grandes con presupuesto, alergias serias." },
    ],
    glosario: [
      { term: "Pa (Pascales)", def: "Unidad de succión en robots. >2500 Pa para alfombras y pelo." },
      { term: "AW (AirWatts)", def: "Unidad de succión real en escobas. >150 AW es potencia profesional." },
      { term: "LiDAR", def: "Láser que mapea la casa con precisión. La mejor navegación para robots." },
      { term: "HEPA", def: "Filtro de alta eficiencia. Atrapa 99,97% de partículas a 0,3 micras." },
      { term: "Autovaciado", def: "Estación que succiona el depósito del robot. Vacías la base cada 1-2 meses." },
      { term: "Mopa vibratoria", def: "Mopa que vibra a alta frecuencia para fregar mejor que solo arrastre." },
      { term: "Cepillo anti-enredo", def: "Diseño que evita que pelos se enrollen. Imprescindible con mascotas." },
    ],
    presupuestos: [
      { rango: "80-200€", etiqueta: "Básico", desc: "Escoba sin cable básica o robot sin mapeo. Xiaomi, Cecotec.", ejemplo: "Piso pequeño, uso ocasional" },
      { rango: "200-400€", etiqueta: "Equilibrado", desc: "Escoba con HEPA y >40 min o robot con giroscopio. Tineco, Roborock básico.", ejemplo: "Piso medio, uso semanal" },
      { rango: "400-700€", etiqueta: "Recomendado", desc: "Escoba Dyson V11/V12 o robot con LiDAR y mopa. Roborock S7/S8.", ejemplo: "Casa grande o mascotas" },
      { rango: "700€+", etiqueta: "Premium", desc: "Robot con autovaciado + autolavado de mopa, escoba Dyson V15. Roborock S8 Pro+.", ejemplo: "Quien quiere olvidarse de limpiar" },
    ],
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
    errores: [
      { icon: "💪", title: "Creer en los 19 bar", desc: "Marketing: la presión real de extracción correcta son 9 bar. Si la cafetera anuncia 19 bar es solo presión de bomba, no de extracción." },
      { icon: "☕", title: "Cápsulas siendo cafetero diario", desc: "0,30€/cápsula × 2/día × 365 días = 219€/año en cápsulas. Una espresso buena se amortiza en menos de 1 año." },
      { icon: "🌡️", title: "Comprar sin termoblock decente", desc: "Modelos baratos calientan mal: el café sale tibio o quemado. Termoblock o caldera son cruciales." },
      { icon: "🧹", title: "Olvidar el mantenimiento", desc: "Una cafetera sin limpiar/descalcificar deja de extraer crema en 6 meses. Verifica que tenga descalcificación automática." },
      { icon: "🥛", title: "Vaporizador débil para cappuccino", desc: "Si haces flat white o cappuccino, necesitas lanza de vapor potente. Vaporizador automático de marca low-cost no espuma bien." },
    ],
    cuandoComprar: [
      { mes: "Black Friday", descuento: "25-40%", nota: "Las superautomáticas DeLonghi y Krups caen hasta 300€. Mejor mes." },
      { mes: "Navidad (diciembre)", descuento: "15-30%", nota: "Lanzan paquetes 'café molido + cafetera' o cápsulas regalo." },
      { mes: "Día del Padre (marzo)", descuento: "10-20%", nota: "Promociones específicas en cafeteras espresso y superautomáticas." },
      { mes: "Rebajas verano", descuento: "10-25%", nota: "Buen momento para Nespresso/Dolce Gusto en cápsulas." },
    ],
    marcas: [
      { name: "DeLonghi", strong: "Líder en superautomáticas. Molinillo cerámico y vaporizador potente.", weak: "Precios premium en gama alta.", ideal: "Quien quiere café como en cafetería sin esfuerzo." },
      { name: "Sage / Breville", strong: "La gama premium absoluta. Espresso manual para baristas.", weak: "Precios desde 700€. Curva de aprendizaje.", ideal: "Apasionados del café que buscan perfección." },
      { name: "Krups", strong: "Buena relación calidad-precio en superautomáticas. Fácil mantenimiento.", weak: "Vaporizador algo menos potente que DeLonghi.", ideal: "Familia que quiere superautomática sin gastar 1.000€." },
      { name: "Nespresso / Dolce Gusto", strong: "Comodidad extrema. Variedad de sabores enorme.", weak: "Coste/taza alto, generación de residuos.", ideal: "Quien valora rapidez sobre coste." },
      { name: "Cecotec", strong: "Espresso manual desde 80€. Sirve para empezar.", weak: "Vida útil 3-5 años. Presión real cuestionable.", ideal: "Iniciarse en espresso sin gastar." },
    ],
    glosario: [
      { term: "Bar (presión)", def: "Presión de extracción. 9 bar es lo correcto, 19 bar es de bomba (marketing)." },
      { term: "Espresso", def: "Café extraído a 90-95°C con presión. Crema en superficie." },
      { term: "Termoblock", def: "Sistema de calentamiento rápido. Buenos calientan en <30 segundos." },
      { term: "Caldera", def: "Depósito de agua a temperatura constante. Más estable que termoblock pero más lento." },
      { term: "Vaporizador / Steam wand", def: "Lanza para espumar leche. Manual da más control, automático más comodidad." },
      { term: "Molinillo cónico", def: "Muele café de manera uniforme sin sobrecalentar grano. Estándar en superautomáticas." },
      { term: "Tamper / Tampado", def: "Herramienta para compactar café molido antes de extraer." },
    ],
    presupuestos: [
      { rango: "30-100€", etiqueta: "Básico", desc: "Cafetera de cápsulas (Dolce Gusto, Nespresso entrada) o espresso muy básico.", ejemplo: "Café ocasional o de oficina" },
      { rango: "100-250€", etiqueta: "Equilibrado", desc: "Espresso manual con vaporizador (DeLonghi Dedica, Krups XP).", ejemplo: "Cafetero diario sin perfeccionar" },
      { rango: "250-600€", etiqueta: "Superautomática", desc: "Superautomática DeLonghi Magnifica, Krups EA. Café decente sin esfuerzo.", ejemplo: "Familia cafetera, comodidad" },
      { rango: "600€+", etiqueta: "Premium", desc: "Superautomáticas top con vaporizador automático o Sage Barista manual.", ejemplo: "Café como hobby serio" },
    ],
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
    errores: [
      { icon: "📐", title: "Mal dimensionado de frigorías", desc: "Te quedas corto = trabaja al máximo siempre = factura disparada y vida útil de 5 años en lugar de 12. Calcula bien." },
      { icon: "💨", title: "Comprar portátil para uso fijo", desc: "Portátil consume 50% más que un split y mete ruido. Solo merece la pena para alquilado o uso puntual." },
      { icon: "🚿", title: "Olvidar la instalación profesional", desc: "Una mala instalación = fugas de gas en 1-2 años. Pide certificado de instalación con garantía mínima de 2 años." },
      { icon: "❄️", title: "Sin bomba de calor en zona fría", desc: "Si vives donde hay invierno real, una bomba de calor calienta gastando 3-5× menos que radiador eléctrico. Pagas el extra de entrada y ahorras todo el invierno." },
      { icon: "📡", title: "Pagar WiFi que no usarás", desc: "Si no piensas encenderlo desde el móvil al volver del trabajo, no pagues el extra de WiFi. Ahorras 100-200€." },
    ],
    cuandoComprar: [
      { mes: "Invierno (enero-febrero)", descuento: "20-35%", nota: "El MEJOR mes para aire acondicionado. Nadie compra en invierno: stock alto y precios mínimos." },
      { mes: "Black Friday", descuento: "15-25%", nota: "Buen momento pero no el mejor para A/C. La gente piensa en otros electrodomésticos." },
      { mes: "Primavera tardía (marzo-abril)", descuento: "10-20%", nota: "Última oportunidad antes de la subida de mayo. Stocks aún disponibles." },
      { mes: "NUNCA en junio-agosto", descuento: "0%", nota: "Demanda altísima. Precios suben hasta 30%. Instaladores con lista de espera de meses." },
    ],
    marcas: [
      { name: "Daikin", strong: "Líder absoluto en eficiencia y silencio. Vida útil 15+ años.", weak: "Premium en precio.", ideal: "Quien quiere acertar y olvidar 15 años." },
      { name: "Mitsubishi Electric", strong: "Sensor de presencia, modo silencio extremo (19 dB).", weak: "Precios altos. Menos modelos en España.", ideal: "Dormitorios donde el silencio es crítico." },
      { name: "LG", strong: "Dual Inverter con 10 años de garantía. Buena relación calidad-precio.", weak: "Reparaciones algo caras en gama alta.", ideal: "Equilibrio calidad-precio para vivienda principal." },
      { name: "Panasonic", strong: "Filtros premium (NanoeX). Calidad de aire mejorada.", weak: "Precios algo altos para sus prestaciones.", ideal: "Alérgicos o casas con polución exterior alta." },
      { name: "Hisense / Cecotec / Hitachi", strong: "Inverter desde 350-500€. Funcional sin pagar premium.", weak: "Vida útil 8-10 años (no 15).", ideal: "Segunda vivienda, presupuesto ajustado." },
    ],
    glosario: [
      { term: "Frigorías", def: "Capacidad de refrigeración. m² × 100 = frigorías mínimas necesarias." },
      { term: "Inverter", def: "Modula velocidad del compresor. Hasta 35% menos consumo que on/off." },
      { term: "Bomba de calor", def: "Sistema reversible que también calienta. 3-5× más eficiente que radiador eléctrico." },
      { term: "SEER / SCOP", def: "Eficiencia estacional. SEER >7 (frío) y SCOP >4 (calor) son excelentes." },
      { term: "BTU", def: "Unidad inglesa de potencia térmica. 1 frigoría ≈ 3,97 BTU/h." },
      { term: "Caudal de aire (m³/h)", def: "Volumen de aire movido. Mayor = enfría/calienta más rápido." },
      { term: "Refrigerante R32", def: "Gas actual, ecológico y eficiente. R410A es la generación anterior." },
    ],
    presupuestos: [
      { rango: "300-550€", etiqueta: "Básico", desc: "Split 1×1 inverter de marca low-cost, 2.000-3.000 fr, A++. Hisense, Cecotec, Hitachi básico.", ejemplo: "Dormitorio o salón pequeño (15-20 m²)" },
      { rango: "550-900€", etiqueta: "Equilibrado", desc: "Split de marca conocida con bomba de calor real, 3.000-4.000 fr, A+++. LG, Panasonic.", ejemplo: "Salón estándar (20-30 m²)" },
      { rango: "900-1500€", etiqueta: "Premium", desc: "Daikin/Mitsubishi de gama media con silencio <22 dB, filtros premium, WiFi. 4.500+ fr.", ejemplo: "Casa amplia o exigencia de silencio" },
      { rango: "1500€+", etiqueta: "Multisplit", desc: "Una exterior con 2-4 interiores. Daikin/Mitsubishi top. Más instalación.", ejemplo: "Climatizar casa completa con estética uniforme" },
    ],
  },
];

export function getGuideBySlug(slug: string): GuideConfig | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
