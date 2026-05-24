import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso Legal y Términos de Uso | Orvexia",
  description:
    "Aviso legal, términos y condiciones de uso de Orvexia. Información sobre el titular del sitio, condiciones de acceso y responsabilidades.",
};

const SECTIONS = [
  {
    title: "1. Titular del sitio web",
    content: (
      <div className="space-y-2">
        <p>En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSICE), se informa:</p>
        <ul className="mt-3 space-y-1.5 list-none">
          {[
            ["Denominación", "Orvexia"],
            ["Sitio web", "orvexia.es"],
            ["Correo electrónico de contacto", "orvexiaesp@gmail.com"],
            ["Actividad principal", "Comparador de precios de electrodomésticos y tecnología de hogar"],
            ["Actividad secundaria", "Venta directa de electrodomésticos como vendedor en Amazon España bajo la marca OrvexiaShop"],
          ].map(([k, v]) => (
            <li key={k as string} className="flex gap-2 text-sm">
              <span className="font-semibold text-fg flex-shrink-0">{k}:</span>
              <span className="text-fg-muted">{v}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    title: "2. Objeto y aceptación",
    content: (
      <p>
        El presente Aviso Legal regula el acceso y uso del sitio web <strong>orvexia.es</strong> (en adelante, «el Sitio»).
        El acceso o uso del Sitio implica la aceptación plena y sin reservas de las presentes condiciones.
        Si no estás de acuerdo con alguna de ellas, debes abstenerte de acceder o utilizar el Sitio.
        Orvexia se reserva el derecho a modificar este Aviso Legal en cualquier momento; los cambios serán
        efectivos desde su publicación en el Sitio.
      </p>
    ),
  },
  {
    title: "3. Condiciones de uso",
    content: (
      <>
        <p className="mb-3">El usuario se compromete a utilizar el Sitio de conformidad con la ley, la moral y el orden público. Queda expresamente prohibido:</p>
        <ul className="space-y-2 list-none">
          {[
            "Usar el Sitio con fines fraudulentos, ilícitos o contrarios a la buena fe.",
            "Reproducir, copiar, distribuir o comercializar los contenidos sin autorización expresa.",
            "Introducir virus, código malicioso o cualquier otro elemento que pueda dañar el sistema.",
            "Realizar acciones que sobrecarguen o dañen la infraestructura técnica del Sitio.",
            "Intentar acceder a áreas restringidas o datos de otros usuarios sin autorización.",
            "Publicar en la comunidad contenidos ofensivos, falsos, difamatorios o que infrinjan derechos de terceros.",
          ].map((item) => (
            <li key={item} className="flex gap-3 items-start text-sm">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#4F46E5] flex-shrink-0" />
              <span className="text-fg-muted">{item}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    title: "4. Registro de cuenta",
    content: (
      <p>
        Para acceder a ciertas funcionalidades (guardar favoritos, participar en la comunidad, configurar alertas de precio)
        es necesario registrarse. El usuario garantiza que los datos facilitados durante el registro son verídicos,
        actuales y completos, y es responsable de mantener la confidencialidad de su contraseña.
        Orvexia no será responsable de los daños derivados del uso no autorizado de la cuenta por parte de terceros
        cuando sea consecuencia de un incumplimiento del usuario en la custodia de sus credenciales.
        El usuario puede solicitar la baja de su cuenta en cualquier momento escribiendo a{" "}
        <a href="mailto:orvexiaesp@gmail.com" className="text-[#4F46E5] hover:underline">orvexiaesp@gmail.com</a>.
      </p>
    ),
  },
  {
    title: "5. Propiedad intelectual e industrial",
    content: (
      <>
        <p className="mb-3">
          Todos los contenidos del Sitio —incluyendo textos, imágenes, diseño, logotipos, código fuente y bases de datos—
          son propiedad de Orvexia o de sus licenciantes y están protegidos por la normativa española e internacional
          de propiedad intelectual e industrial.
        </p>
        <p>
          Se autoriza la visualización y descarga de contenidos exclusivamente para uso personal y no comercial,
          siempre que se mantenga íntegra la atribución a Orvexia. Cualquier otro uso requiere autorización expresa
          y por escrito del titular.
        </p>
      </>
    ),
  },
  {
    title: "6. Contenido de la comunidad (UGC)",
    content: (
      <p>
        Los usuarios que publiquen comentarios, valoraciones u otras contribuciones en el Sitio ceden a Orvexia
        una licencia no exclusiva, gratuita y mundial para reproducir, mostrar y distribuir dicho contenido
        dentro del propio Sitio. El usuario declara que el contenido publicado es original, no infringe derechos
        de terceros y no contiene información falsa, ofensiva o ilegal. Orvexia se reserva el derecho a eliminar
        sin previo aviso cualquier contenido que vulnere estas condiciones o la legalidad vigente.
      </p>
    ),
  },
  {
    title: "7. Precios, ofertas y enlaces de afiliados",
    content: (
      <>
        <p className="mb-3">
          Los precios mostrados en el Sitio se obtienen de fuentes externas y se actualizan periódicamente.
          <strong> Orvexia no garantiza que los precios mostrados sean los vigentes en el momento de la compra</strong>;
          el precio definitivo es siempre el que figura en la tienda del vendedor en el momento de la transacción.
        </p>
        <p>
          El Sitio contiene enlaces de afiliados a tiendas como Amazon, PcComponentes, El Corte Inglés y Fnac.
          Cuando realizas una compra a través de estos enlaces, Orvexia puede recibir una comisión. Este hecho
          no supone ningún coste adicional para el comprador ni influye en el orden de los resultados ni en el
          contenido editorial.
        </p>
      </>
    ),
  },
  {
    title: "8. Actividad como vendedor en Amazon (OrvexiaShop)",
    content: (
      <>
        <p className="mb-3">
          De forma separada e independiente al comparador, Orvexia opera una tienda propia en
          Amazon España como vendedor bajo la marca <strong>OrvexiaShop</strong>. La gestión de
          esta cuenta se realiza mediante la <strong>Amazon Selling Partner API (SP-API)</strong>,
          de forma estrictamente privada y únicamente sobre nuestra propia cuenta de vendedor.
        </p>
        <ul className="space-y-2 list-none mb-3">
          {[
            "El comparador público de orvexia.es y la cuenta de vendedor OrvexiaShop son la misma entidad jurídica, pero operan de forma técnica y operativamente aislada.",
            "Los datos obtenidos vía SP-API no se utilizan en el comparador público ni se comparten con terceros.",
            "Los precios de Amazon que se muestran en el comparador público proceden del programa de afiliados (enlaces públicos / Product Advertising API), no de SP-API.",
            "El tratamiento de datos de SP-API se realiza conforme a la Amazon Data Protection Policy y la Acceptable Use Policy.",
          ].map((item) => (
            <li key={item} className="flex gap-3 items-start text-sm">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#4F46E5] flex-shrink-0" />
              <span className="text-fg-muted">{item}</span>
            </li>
          ))}
        </ul>
        <p>
          Para más detalle consulta la{" "}
          <Link href="/politica-datos-amazon" className="text-[#4F46E5] hover:underline font-medium">
            Política de Protección de Datos de Amazon
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    title: "9. Exclusión de garantías y responsabilidad",
    content: (
      <ul className="space-y-2 list-none">
        {[
          "Orvexia no garantiza la disponibilidad continuada del Sitio ni la ausencia de errores en su funcionamiento.",
          "Orvexia no se responsabiliza de los daños derivados del uso o imposibilidad de uso del Sitio.",
          "Orvexia no es responsable de los contenidos, productos o servicios de los sitios web de terceros enlazados.",
          "Orvexia no garantiza la exactitud, completitud o actualidad de la información publicada, aunque pone todos los medios razonables para mantenerla correcta.",
        ].map((item) => (
          <li key={item} className="flex gap-3 items-start text-sm">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#4F46E5] flex-shrink-0" />
            <span className="text-fg-muted">{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: "10. Privacidad y cookies",
    content: (
      <p>
        El tratamiento de datos personales se rige por nuestra{" "}
        <Link href="/politica-privacidad" className="text-[#4F46E5] hover:underline font-medium">
          Política de Privacidad
        </Link>{" "}
        y nuestra{" "}
        <Link href="/politica-cookies" className="text-[#4F46E5] hover:underline font-medium">
          Política de Cookies
        </Link>
        , que forman parte integrante de este Aviso Legal.
      </p>
    ),
  },
  {
    title: "11. Legislación aplicable y jurisdicción",
    content: (
      <p>
        El presente Aviso Legal se rige por la legislación española. Para la resolución de cualquier controversia
        derivada del acceso o uso del Sitio, las partes se someten a los Juzgados y Tribunales competentes
        conforme a la normativa vigente. Sin perjuicio de lo anterior, si eres consumidor, podrás acudir a la
        plataforma de resolución de litigios en línea de la UE disponible en{" "}
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#4F46E5] hover:underline"
        >
          ec.europa.eu/consumers/odr
        </a>
        .
      </p>
    ),
  },
];

export default function AvisoLegalPage() {
  return (
    <main>
      {/* Header */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 bg-grid-cyber opacity-40 pointer-events-none" />
        <div className="absolute -top-32 left-1/3 w-[800px] h-[400px] rounded-full pointer-events-none"
             style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.16), transparent 65%)" }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-white/40 mb-4">
            <Link href="/" className="hover:text-cyan-300 transition-colors">~/</Link>
            <span className="text-white/25">›</span>
            <span className="text-cyan-300">aviso_legal</span>
          </div>
          <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">▸ /legal · terms</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Aviso Legal y <span className="text-gradient-neon">Términos de Uso</span>
          </h1>
          <p className="text-sm text-white/55">
            Última actualización: <strong className="text-white/85">24 de mayo de 2026</strong>
          </p>
          <p className="mt-3 text-sm text-white/55 leading-relaxed max-w-2xl">
            Este documento establece las condiciones legales que rigen el acceso y uso de{" "}
            <strong className="text-white/85">orvexia.es</strong>, en cumplimiento de la{" "}
            <strong className="text-white/85">Ley 34/2002 de Servicios de la Sociedad de la Información (LSSICE)</strong> y
            demás normativa aplicable.
          </p>
        </div>
      </div>

      {/* Índice */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="rounded-2xl p-5 bg-cyan-400/[0.06] border border-cyan-400/25">
          <p className="font-mono-ui text-[10px] font-bold text-cyan-300 uppercase tracking-[0.2em] mb-3">▸ /index</p>
          <ol className="grid sm:grid-cols-2 gap-1">
            {SECTIONS.map((s, i) => (
              <li key={s.title}>
                <a
                  href={`#seccion-${i + 1}`}
                  className="text-sm text-cyan-200 hover:text-cyan-100 hover:underline transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Secciones */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 space-y-4">
        {SECTIONS.map((s, i) => (
          <article
            key={s.title}
            id={`seccion-${i + 1}`}
            className="bg-bg-elevated rounded-2xl border border-white/[0.08] p-6 scroll-mt-6"
          >
            <h2 className="text-base font-bold text-white mb-4">{s.title}</h2>
            <div className="text-sm leading-relaxed text-white/75">{s.content}</div>
          </article>
        ))}

        <div className="text-center pt-4">
          <p className="font-mono-ui text-[10px] uppercase tracking-wider text-white/40">
            orvexia · orvexia.es ·{" "}
            <a href="mailto:orvexiaesp@gmail.com" className="hover:text-cyan-300 transition-colors">
              orvexiaesp@gmail.com
            </a>
          </p>
          <p className="font-mono-ui text-[10px] uppercase tracking-wider text-white/40 mt-1">
            v1.1 · last_rev=2026-05-24
          </p>
        </div>
      </div>
    </main>
  );
}
