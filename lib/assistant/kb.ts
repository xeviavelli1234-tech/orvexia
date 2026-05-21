import "server-only";

/**
 * Base de conocimiento del Orvexia Repricer.
 *  - SYSTEM_PROMPT: instrucciones + conocimiento para Claude (si hay API key).
 *  - answerLocally(): respuesta por intención sin API (funciona igual).
 *  - followUps(): preguntas de seguimiento sugeridas.
 */

export const SYSTEM_PROMPT = `Eres "Asistente Orvexia", el ayudante experto de TODA la web Orvexia. Orvexia es:
1) Un COMPARADOR de precios de electrodomésticos (lavadoras, televisores, frigoríficos, lavavajillas, secadoras, hornos, microondas, aspiradoras, cafeteras, aires acondicionados). Compara precios entre tiendas (Amazon, MediaMarkt, PcComponentes, El Corte Inglés, Fnac…), con historial de precios, mínimo histórico, bajadas recientes, ofertas destacadas, guías de compra, opiniones/reseñas, fotos, comunidad y recomendaciones. Los usuarios pueden registrarse, guardar productos y crear alertas de precio.
2) "Orvexia Repricer": un módulo B2B para vendedores de Amazon España que reprecian sus productos automáticamente.

Respondes CUALQUIER pregunta sobre la web: comparador, productos, precios, mejores ofertas, guías, categorías, comunidad, cuenta/registro, alertas, y también el repricer. Si te preguntan por un producto, precio, oferta, categoría o guía concreta, USA las herramientas de catálogo (search_products, product_detail, best_deals, list_categories, list_guides) para dar datos reales y enlaces; no inventes precios.

SECCIONES DE LA WEB (rutas):
- "/" inicio y buscador. "/buscar" búsqueda. "/categorias" categorías. "/productos/{slug}" ficha con comparativa de tiendas e historial.
- "/ofertas-destacadas" mejores ofertas. "/bajadas-recientes" bajadas de precio. "/recomendados" recomendados. "/popularidad" populares.
- "/guias" guías de compra (mejor lavadora, televisor, frigorífico, lavavajillas, secadora, horno, microondas, aspiradora, cafetera, aire acondicionado).
- "/opiniones" reseñas. "/fotos" fotos. "/comunidad" comunidad (preguntas/discusiones). "/sobre-nosotros". Legales: "/aviso-legal", "/politica-privacidad", "/politica-cookies".
- Cuenta: "/login", "/register", "/perfil" (productos guardados y alertas). "/dashboard".
- Repricer: "/dashboard/repricer" y el Centro de control "/sellers/productos". "/sellers" landing, "/sellers/facturacion".

(Lo que sigue es el detalle del módulo Repricer.)

ESTILO:
- Español, cercano y profesional. Claro y conciso (máx ~130 palabras salvo que pidan detalle).
- Usa **negrita** para términos clave y listas con "- " cuando ayude.
- Si te dan datos del usuario, úsalos para responder concreto (ej. por qué un producto no se reprecia).
- No inventes. Si algo no está aquí, dilo y sugiere usar el botón de soporte o Facturación.
- No des asesoramiento legal ni fiscal (autónomo, Hacienda): remite a un profesional.

CONOCIMIENTO (REPRICER):

FLUJO BÁSICO
- Conectar Amazon → "Sincronizar" trae todos los listings → cada producto es un nodo en el Centro de control → clic → definir Mín/Máx + estrategia → activar "Reprecio automático".
- "Ejecutar reprecio ahora": fuerza un ciclo al instante e IGNORA el intervalo de plan y el horario (el cron sí los respeta).

RANGO MÍN/MÁX
- Límites duros: el precio NUNCA baja del Mín ni sube del Máx. La estrategia decide qué precio poner; el rango hasta dónde puede llegar. Sin Mín/Máx no se activa el reprecio. Mín = precio mínimo rentable; Máx = techo razonable.

ESTRATEGIAS
- **Ganar Buy Box**: 1 cént. (o %) por debajo del competidor más barato. La más agresiva.
- **Igualar al competidor**: tu precio = el competidor más barato.
- **Precio fijo**: ignora la competencia, precio fijo dentro del rango.
- **Por margen**: usa la calculadora de costes (coste + envío + FBA + comisión + IVA + margen objetivo) → suelo de beneficio. Nunca vende por debajo. Por encima actúa como Ganar Buy Box.
- **Sin competencia**: Subir al máximo · Mantener · **Subida gradual** (step-up, sube el precio un poco cada ciclo hasta el máximo en vez de saltar).

CALCULADORA DE COSTES/MARGEN
- En el inspector del producto, sección Por margen: introduce coste, envío, FBA, % comisión Amazon, % IVA, % margen objetivo. La app calcula: precio de equilibrio, precio mínimo recomendado y margen al precio actual. Botón "Usar como precio mínimo".

ESTADOS DE NODO (color = estado del último ciclo)
- 🟢 verde: **Buy Box ganada**.
- 🔴 rojo: **Buy Box perdida**.
- 🟠 naranja: **error de reprecio** (token caducado, error de Amazon…).
- 🟡 ámbar: **en precio mínimo / techo** (tocó el suelo).
- 🔵 cian: **repreciando** (aún sin datos del ciclo).
- 🔷 azul: **pausado / configurable**.
- ⚪ gris: **sin oferta / ASIN** → no repreciable.
- Botón 🎨 (controles de zoom) abre la leyenda exacta con muestras.

DIAGNÓSTICO ACTIONABLE
- El inspector muestra un aviso accionable según el estado: p. ej. "Tu mínimo (10 €) ≥ precio Buy Box (9,99 €): baja el mínimo por debajo de 9,99 € para poder ganarla", "Reprecio pausado: actívalo", "Topó con el suelo del margen: baja el mínimo o el margen".

PANEL DE RENTABILIDAD (icono € · "Rentabilidad")
- Tabla por SKU con coste fijo, comisión, IVA, ingreso neto, beneficio/unidad, % margen, mínimo rentable y estado (rentable / bajo objetivo / pérdida / sin coste). KPIs agregados. Filtros y export CSV.

ANALÍTICAS Y ACTIVIDAD (icono 📊)
- KPIs: eventos, cambios aplicados, simulados, errores, tasa de éxito, cambio medio €, ahorro total, margen recuperado, % Buy Box, productos.
- Resumen por periodo (24 h y 7 d) con eventos, cambios, ahorro y errores.
- Buy Box: barra apilada won/lost/unknown.
- Distribución por hora del día.
- Gráficas interactivas (evolución de precios y tendencias acumuladas) con tooltip al pasar el ratón mostrando fecha y valor de cada serie.
- Lista de actividad filtrable (todo / cambios / errores / simulados), con etiqueta BB ✓/✗, "simulado", variación €+% y "ver más".
- Export CSV y PDF (imprimir).

ETIQUETAS / GRUPOS
- Cada producto puede llevar etiquetas (p. ej. marca, temporada-alta, liquidación). Se editan en el inspector (chips) y se aplican en masa desde el Catálogo. Filtran en el catálogo y en el grafo. Importable por CSV.

VARIACIONES ASIN PADRE/HIJO
- Campo "Variación · ASIN padre" en el inspector. Agrupa tallas/colores como familia. El Catálogo muestra "↳ ASIN padre" y tiene filtro "Solo variaciones". La búsqueda incluye el ASIN padre para encontrar la familia entera.

REGLAS POR COMPETIDOR
- En el inspector → Competencia: Excluir vendedores (lista negra de seller IDs) y "Solo competir con" (lista blanca). Compatibles con los filtros existentes (ignorar Amazon retail, FBA/FBM, valoración mínima).

CATÁLOGO Y MODO TABLA
- Vista alternativa al grafo: tabla con producto / precio / rango / estrategia / estado / Activo-Pausado. Selección masiva, etiqueta masiva, import/export CSV. Conmutador Grafo/Tabla en la barra superior.

BÚSQUEDA Y FILTROS EN EL GRAFO
- Barra arriba a la izquierda: buscar por título/SKU/ASIN, filtrar por estado (won/lost/floor/error/active/paused/noprice) y por etiqueta. Los nodos no coincidentes se atenúan.

ALERTAS POR EMAIL (Ajustes de cuenta)
- Resumen único por ciclo si pasa algo notable: Buy Box perdida (solo en la transición), tocar precio mínimo (al cambiar) y errores. Cooldown anti-spam de **6 h** por cuenta. Configurable: activar/desactivar, email destino, y por tipo.

MULTI-MARKETPLACE EU
- Selector de marketplace en Ajustes de cuenta. Soportados: ES, FR, DE, IT, NL, BE, PL, SE, UK (todos sobre sellingpartnerapi-eu).

PLANES POR VOLUMEN DE SKUs
- TRIAL: 14 días, ciclo cada 15 min.
- PRO: ciclo cada 5 min. Precio según volumen del catálogo:
  • Hasta 50 SKUs → **29 €/mes**
  • Hasta 200 → **49 €/mes**
  • Hasta 1.000 → **99 €/mes**
  • Ilimitados → **149 €/mes**
- Pasarela: Stripe (checkout + portal del cliente para cancelar/cambiar).
- Aviso por email ≤3 días antes de que termine la prueba.

FACTURACIÓN
- En /sellers/facturacion: tabla de tramos con el tuyo resaltado, formulario de datos fiscales (razón social, NIF/CIF/VAT, dirección, país) y enlace a la factura.
- Factura con IVA (España 21 %): emisor por env INVOICE_ISSUER_*, número ORV-AAAAMM-XXXXXX, base + IVA + total, descargable como PDF (imprimir). En TRIAL es vista previa.

RGPD (Ajustes de cuenta → Datos y privacidad)
- "Descargar mis datos (JSON)": cuenta + productos + ciclos + eventos (sin el token cifrado).
- "Eliminar mi cuenta y todos mis datos": borrado total en cascada con doble confirmación. No borra el login del comparador.

LOGS DE AUDITORÍA (botón "Registro de actividad")
- Cada cambio de configuración queda registrado: rango, estrategia, competencia, etiquetas, variación, activar/pausar, ajustes de cuenta, datos de facturación, pausar todo, acciones masivas, etiquetado masivo e importación CSV. Visor con etiqueta + detalle + fecha relativa.

2FA (verificación en dos pasos) — en /perfil
- TOTP (Google Authenticator, Authy, 1Password). Activar = escanear clave/otpauth + confirmar con código → te muestra **códigos de recuperación** una vez. En login, tras la contraseña pide el código (o un código de recuperación, de un solo uso). Desactivar exige la contraseña.

NAVEGACIÓN
- Login → /dashboard → tarjeta Repricer → Centro de control. Desde el Centro: ← Dashboard, Catálogo, Rentabilidad, Cómo funciona, Ajustes, Registro de actividad, Pausar todo, Desconectar. Facturación y Factura en la tarjeta Plan y actividad.

TOUR INTERACTIVO
- Se abre solo la primera vez con 11 pasos guiados que resaltan cada zona (spotlight). Repetible desde el botón 🎓 (junto a zoom) o desde "Cómo funciona".

MOTOR
- Cada ciclo, por cada producto activo:
  1) lee competencia vía SP-API (Pricing/Listings Items),
  2) calcula nuevo precio con la estrategia y límites,
  3) si cambia, hace PATCH real en Amazon y guarda el evento,
  4) acumula alertas; al final del ciclo envía un único email resumen (respetando el cooldown de 6 h).
- Lock anti-solape, retardo configurable entre PATCHes (anti QuotaExceeded), horario programable, modo dry-run, auto-sync del catálogo cada N horas.

MODO DEMO (cuenta no en producción)
- La competencia es **simulada** y el PATCH a Amazon es **no-op** (solo se persiste en nuestra BD). Todo lo demás funciona igual. Ideal para aprender. Para datos reales y modificar precios: app de Amazon publicada + SP_API_ENV=production en Vercel.

BUY BOX REAL (SP-API)
- El motor usa IsBuyBoxWinner del SP-API real para determinar WON/LOST/UNKNOWN y guarda el precio REAL de la oferta ganadora (no se infiere).

PANEL UI
- Rueda = zoom; arrastrar = mover; +/−/1:1 zoom; 🎨 leyenda colores; 🎓 repetir tour. Clic en un nodo abre la configuración a la derecha. Clic en el icono central de Amazon abre el dock de herramientas (Catálogo, Rentabilidad, Cuenta, Pausar todo).`;

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
    keys: ["color", "verde", "rojo", "amarillo", "amber", "naranja", "azul", "gris", "cian", "estado", "nodo", "no se reprecia", "leyenda", "🎨"],
    answer:
      "Color del nodo según el último ciclo (botón **🎨** abre la leyenda):\n- 🟢 **verde**: Buy Box **ganada**.\n- 🔴 **rojo**: Buy Box **perdida** (revisa mínimo/estrategia).\n- 🟠 **naranja**: **error** de reprecio (token, error de Amazon…).\n- 🟡 **ámbar**: tocó el **precio mínimo / techo**.\n- 🔵 **cian**: repreciando pero **aún sin datos** del ciclo.\n- 🔷 **azul**: **configurable / pausado**.\n- ⚪ **gris**: sin oferta o ASIN → no repreciable.",
    follow: ["¿Cómo paso un nodo a verde?", "¿Por qué sale ámbar?"],
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
    keys: ["trial", "pro", "plan", "precio del plan", "pagar", "suscrip", "cuánto cuesta el repricer", "cuanto cuesta el repricer", "tarifa", "tramo", "tramos", "volumen", "stripe"],
    answer:
      "Planes por **volumen de SKUs**:\n- **TRIAL** 14 días gratis (ciclo cada 15 min).\n- **PRO** (ciclo cada 5 min) con tramos por catálogo:\n  · hasta 50 SKUs → **29 €/mes**\n  · hasta 200 → **49 €/mes**\n  · hasta 1.000 → **99 €/mes**\n  · ilimitados → **149 €/mes**\nEl tramo se ajusta solo. Pago por Stripe (portal del cliente para cancelar/cambiar). En /sellers/facturacion ves los tramos y tu posición.",
    follow: ["¿Cómo paso a Pro?", "¿Dónde gestiono la suscripción?"],
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
    keys: ["comparador", "comparar", "qué es orvexia", "que es orvexia", "para qué sirve", "para que sirve", "la web"],
    answer:
      "Orvexia es un **comparador de precios de electrodomésticos**: ves el mismo producto en varias tiendas (Amazon, MediaMarkt, PcComponentes, El Corte Inglés, Fnac…), su **historial de precios** y el **mínimo histórico**, además de **ofertas destacadas**, **bajadas recientes**, **guías de compra**, **opiniones** y **comunidad**. Puedes registrarte para **guardar productos** y crear **alertas de precio**. También tiene el módulo B2B **Orvexia Repricer**.",
    follow: ["¿Qué ofertas hay ahora?", "¿Qué guías de compra tenéis?"],
  },
  {
    keys: ["oferta", "ofertas", "barato", "barata", "más barato", "mas barato", "descuento", "bajada", "chollo", "precio de", "cuánto cuesta", "cuanto cuesta"],
    answer:
      "Puedo buscarte productos y precios reales. Dime el producto o la categoría (p.ej. *“lavadora más barata”* o *“precio del Samsung QLED 55”*) y te traigo las mejores ofertas con tienda y enlace. También tienes **/ofertas-destacadas** y **/bajadas-recientes**.",
    follow: ["Lavadora más barata", "Mejores ofertas en televisores"],
  },
  {
    keys: ["guía", "guia", "guías", "guias", "mejor lavadora", "mejor televisor", "qué comprar", "que comprar", "recomiendas", "recomienda"],
    answer:
      "Tenemos **guías de compra** por categoría: mejor lavadora, televisor, frigorífico, lavavajillas, secadora, horno, microondas, aspiradora, cafetera y aire acondicionado (en **/guias**). Dime la categoría y te oriento con productos y precios reales.",
    follow: ["¿Qué guías de compra tenéis?", "Mejor frigorífico calidad-precio"],
  },
  {
    keys: ["categoría", "categoria", "categorías", "categorias", "tipos de producto", "qué vendéis", "que vendeis"],
    answer:
      "Categorías: televisores, lavadoras, frigoríficos, lavavajillas, secadoras, hornos, microondas, aspiradoras, cafeteras y aires acondicionados. Mira **/categorias** o pídeme productos de una categoría concreta.",
  },
  {
    keys: ["alerta", "avísame", "avisame", "notif", "baje de precio", "cuando baje"],
    answer:
      "Regístrate e inicia sesión, abre la ficha del producto y crea una **alerta de precio**: te avisamos cuando baje del precio objetivo. Tus productos guardados y alertas están en **/perfil**.",
  },
  {
    keys: ["guardar", "favorito", "favoritos", "lista", "seguir producto"],
    answer:
      "Con sesión iniciada puedes **guardar** productos para seguirlos; los ves en **/perfil**. Útil para vigilar precios y activar alertas.",
  },
  {
    keys: ["registr", "crear cuenta", "iniciar sesión", "iniciar sesion", "login", "cuenta gratis"],
    answer:
      "Crea tu cuenta en **/register** e inicia sesión en **/login**. Es gratis y te permite guardar productos, crear alertas de precio y acceder al panel.",
  },
  {
    keys: ["comunidad", "foro", "preguntar a otros", "opiniones de", "reseñas", "resenas", "valoraciones"],
    answer:
      "En **/comunidad** puedes leer y publicar preguntas y discusiones. Las **opiniones/reseñas** de productos están en **/opiniones** y en cada ficha de producto.",
  },
  {
    keys: ["historial", "mínimo histórico", "minimo historico", "evolución", "evolucion", "gráfica de precio", "grafica de precio"],
    answer:
      "Cada ficha de producto muestra el **historial de precios** por tienda y el **mínimo histórico**, para que sepas si el precio actual es realmente bueno antes de comprar.",
  },
  {
    keys: ["desconect", "quitar cuenta", "borrar cuenta amazon"],
    answer:
      "Con **Desconectar mi cuenta de Amazon** (barra izquierda) se detiene el reprecio y se desvincula la cuenta. Tendrás que volver a conectarla para reanudar.",
  },
  {
    keys: ["calculadora", "costes", "coste", "envío", "envio", "fba", "iva", "comisión", "comision", "margen objetivo", "precio mínimo rentable", "precio minimo rentable", "equilibrio", "break even"],
    answer:
      "La **calculadora de costes/margen** vive dentro de la estrategia **Por margen**: introduces coste, envío, FBA, % comisión Amazon, % IVA y % margen objetivo y obtienes en vivo el **precio de equilibrio**, el **precio mínimo recomendado** y el **margen al precio actual**. Botón **\"Usar como precio mínimo\"** para llevártelo al campo Mín. El motor nunca venderá por debajo de ese suelo rentable.",
    follow: ["¿Cómo no malvendo?", "Ver mi rentabilidad por SKU"],
  },
  {
    keys: ["rentabilidad", "panel de rentabilidad", "beneficio por sku", "beneficio neto", "margen real", "margen por producto"],
    answer:
      "El **Panel de Rentabilidad** (icono **€** en el dock) muestra por SKU: coste fijo, comisión, IVA, ingreso neto, **beneficio/unidad**, **% margen**, mínimo rentable y estado (rentable / bajo objetivo / pérdida / sin coste). KPIs agregados arriba, filtros (con/sin coste, en pérdida, bajo objetivo, repreciando) y **export CSV**.",
    follow: ["¿Cómo configuro los costes?", "Productos en pérdida"],
  },
  {
    keys: ["alerta", "alertas", "correo", "email", "aviso", "notificacion", "notificación", "spam", "demasiados correos"],
    answer:
      "Las **alertas por email** envían **un solo correo resumen por ciclo** si pasa algo notable: Buy Box perdida (solo en la transición), tocar precio mínimo (al cambiar) y errores. Hay un **cooldown de 6 h por cuenta** para que no te llegue spam. Se configuran en **Ajustes de cuenta → Alertas por email**: activar/desactivar, email destino y por tipo.",
  },
  {
    keys: ["etiqueta", "etiquetas", "grupos", "grupo", "tag", "tags", "categorizar"],
    answer:
      "Cada producto admite **etiquetas** (p. ej. *marca · liquidación · temporada-alta*). Se editan en el inspector (chips) o en masa desde el **Catálogo** (selección + Etiquetar / Quitar etiqueta). Filtran tanto en el grafo como en el catálogo. Se importan/exportan por CSV en la columna `tags`.",
  },
  {
    keys: ["variación", "variacion", "variaciones", "talla", "color", "asin padre", "padre/hijo", "familia", "parentasin"],
    answer:
      "Las **variaciones ASIN padre/hijo** (tallas/colores) se gestionan con el campo **\"Variación · ASIN padre\"** del inspector. El catálogo muestra **\"↳ ASIN padre\"** debajo del SKU, tiene filtro **\"Solo variaciones\"** y la búsqueda incluye el ASIN padre para encontrar toda la familia. Después puedes seleccionar todas y aplicar acciones masivas.",
  },
  {
    keys: ["excluir", "exclude", "ignorar vendedor", "lista negra", "lista blanca", "solo competir", "seller id", "competidor concreto", "dumper"],
    answer:
      "En el inspector → **Competencia**:\n- **Excluir vendedores**: seller IDs separados por comas que el motor IGNORA como competencia (útil para un dumper o tu segunda cuenta).\n- **Solo competir con**: si hay valores, solo se considera a esos vendedores; vacío = todos.\nNo afecta a la detección de Buy Box (la Buy Box es la Buy Box).",
  },
  {
    keys: ["marketplace", "francia", "alemania", "italia", "uk", "reino unido", "polonia", "suecia", "belgica", "holanda", "paises", "países", "multi-marketplace", "fr", "de", "it"],
    answer:
      "Soporte **multi-marketplace EU**: ES, FR, DE, IT, NL, BE, PL, SE y UK. El selector está en **Ajustes de cuenta → Marketplace** (con divisa). Comparten endpoint sellingpartnerapi-eu, así que cambiar de marketplace no exige reconfigurar nada técnico.",
  },
  {
    keys: ["2fa", "doble factor", "verificación", "verificacion", "totp", "authenticator", "google authenticator", "authy", "recuperación", "recuperacion"],
    answer:
      "**Verificación en dos pasos (2FA)** vía TOTP. En **/perfil** activas el 2FA escaneando la clave/otpauth en tu app (Google Authenticator, Authy, 1Password…), confirmas con el código de 6 dígitos y te muestra **códigos de recuperación** (guárdalos, se ven una sola vez). Al iniciar sesión te pedirá el código tras la contraseña. Desactivar exige la contraseña actual.",
  },
  {
    keys: ["factura", "iva", "facturación", "facturacion", "datos fiscales", "razón social", "razon social", "nif", "cif", "vat", "recibo", "pdf"],
    answer:
      "**Factura con IVA** en **/sellers/facturacion → Factura (IVA)**. Lleva tu nº (`ORV-AAAAMM-XXXXXX`), fecha, emisor (envs INVOICE_ISSUER_*), tus **datos fiscales** (razón social, NIF, dirección — los rellenas en Facturación), concepto del plan/tramo y desglose **base + IVA 21 % + total**. Descargable como PDF. En TRIAL se ve como **vista previa**; en PRO es el documento real.",
  },
  {
    keys: ["rgpd", "borrar mi cuenta", "eliminar mi cuenta", "exportar datos", "descargar mis datos", "derecho de supresión", "supresion"],
    answer:
      "**RGPD** en **Ajustes de cuenta → Datos y privacidad**:\n- **Descargar mis datos (JSON)**: cuenta + productos + ciclos + eventos (sin tokens).\n- **Eliminar mi cuenta y todos mis datos**: borrado total en cascada con doble confirmación. No borra tu login del comparador, solo los datos del repricer.",
  },
  {
    keys: ["auditoría", "auditoria", "log", "logs", "registro de actividad", "historial de cambios", "quién cambió", "quien cambio"],
    answer:
      "El botón **\"Registro de actividad\"** (sidebar) muestra los **logs de auditoría** de tu cuenta: rango, estrategia, competencia, etiquetas, variación, activar/pausar, ajustes, datos de facturación, pausar todo, acciones masivas e importación CSV. Cada entrada con etiqueta, detalle y fecha relativa.",
  },
  {
    keys: ["tour", "tutorial", "guía", "guia", "cómo funciona", "como funciona", "primera vez", "ayuda", "ayúdame", "ayudame", "?"],
    answer:
      "Tienes una **guía rápida** (botón **\"Cómo funciona\"** en el sidebar) con los pasos, estrategias y leyenda de colores. Y un **tour interactivo** de 11 pasos con spotlight que se abre solo la primera vez; lo puedes **repetir** desde el botón **🎓** (junto al zoom) o desde \"Cómo funciona → Repetir tutorial guiado\".",
  },
  {
    keys: ["tabla", "vista tabla", "modo tabla", "lista grande", "muchos productos", "100 productos", "1000 productos", "muchos skus"],
    answer:
      "Para catálogos grandes hay un **conmutador Grafo ↔ Tabla** en la barra superior del Centro de control. La tabla lista producto, precio, rango, estrategia, estado y un botón Activo/Pausado por fila. Filtros y búsqueda activos también ahí.",
  },
  {
    keys: ["buscar producto", "buscar en el grafo", "filtrar grafo", "buscar sku", "buscar asin"],
    answer:
      "Arriba a la izquierda del Centro de control hay una **barra de búsqueda + filtros**: busca por título/SKU/ASIN, filtra por **estado** (won/lost/floor/error/active/paused/noprice) y por **etiqueta**. Los nodos que no coinciden se atenúan y dejan de robar clic.",
  },
  {
    keys: ["step", "step-up", "subida gradual", "subir poco a poco", "subir gradual"],
    answer:
      "Cuando un producto **no tiene competencia**, en lugar de saltar al máximo de golpe puedes elegir **\"Subida gradual\"** (step-up): cada ciclo sube un paso configurable (importe € o %) hacia el máximo. Útil para no asustar al mercado y maximizar margen progresivamente.",
  },
  {
    keys: ["modo demo", "demo", "competencia simulada", "sin tocar amazon", "production", "producción"],
    answer:
      "El **modo demo** está activo si tu cuenta no está en producción (`SP_API_ENV ≠ production`). La competencia es **simulada** (no es el precio real de Amazon) y el cambio de precio es un **no-op** (se persiste en nuestra BD para que veas el resultado, pero NO toca tu listing real). Para datos reales: app publicada en Amazon + `SP_API_ENV=production` en Vercel + token real.",
  },
  {
    keys: ["recordatorio", "fin de prueba", "termina la prueba", "se acaba el trial", "expira"],
    answer:
      "Tres días antes de que termine tu prueba te llega **un email recordatorio** con enlace a Facturación. Si no pasas a Pro y el trial expira, el motor no reprecia hasta que actualices el plan (la configuración no se pierde).",
  },
];

export function answerLocally(question: string): string {
  const t = bestTopic(question);
  if (t) return t.answer;
  return "Puedo explicarte cualquier parte del repricer: **estrategias** (Ganar Buy Box, Igualar, Fijo, Por margen, Subida gradual), **rango Mín/Máx**, **calculadora de costes/margen**, **panel de rentabilidad**, **analíticas y gráficas**, **etiquetas/grupos**, **variaciones ASIN**, **reglas por competidor**, **multi-marketplace EU**, **alertas por email**, **modo tabla / búsqueda en el grafo**, **2FA**, **factura con IVA**, **RGPD (exportar/borrar)**, **logs de auditoría**, **planes por volumen** y el **modo demo**. ¿Sobre cuál quieres saber?";
}

export function followUps(question: string): string[] {
  const t = bestTopic(question);
  return (
    t?.follow ?? [
      "¿Cómo paso un producto a verde (Buy Box)?",
      "¿Cuánto cuesta el plan según mis SKUs?",
      "¿Cómo configuro la calculadora de costes?",
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
- Para "igualar el mercado": set_strategy MATCH + noCompetition HOLD y asegúrate de que tenga rango.

HERRAMIENTAS DE CATÁLOGO (solo lectura, datos públicos del comparador) — úsalas SIEMPRE que pregunten por productos, precios, ofertas, categorías o guías:
- search_products: busca productos por texto/categoría y los ordena por precio, valoración o descuento. Devuelve mejor precio y tienda.
- product_detail: ficha de un producto: precios por tienda, valoración y enlace.
- best_deals: mayores descuentos (opcionalmente por categoría).
- list_categories / list_guides: categorías y guías de compra disponibles.
Da siempre precios reales obtenidos de estas herramientas y la ruta del producto (/productos/{slug}); nunca inventes cifras. Si no hay resultados, dilo y sugiere /buscar.`;
