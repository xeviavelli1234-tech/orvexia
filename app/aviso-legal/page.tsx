import type { Metadata } from "next";
import Link from "next/link";
import { SectionChip } from "@/app/_components/SectionPrimitives";

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
              <span className="font-semibold text-white/85 flex-shrink-0">{k}:</span>
              <span className="text-white/60">{v}</span>
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
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
              <span className="text-white/60">{item}</span>
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
        <a href="mailto:orvexiaesp@gmail.com" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">orvexiaesp@gmail.com</a>.
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
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
              <span className="text-white/60">{item}</span>
            </li>
          ))}
        </ul>
        <p>
          Para más detalle consulta la{" "}
          <Link href="/politica-datos-amazon" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
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
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
            <span className="text-white/60">{item}</span>
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
        <Link href="/politica-privacidad" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
          Política de Privacidad
        </Link>{" "}
        y nuestra{" "}
        <Link href="/politica-cookies" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
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
          className="font-medium text-brand-300 hover:text-brand-200 hover:underline"
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
    <main className="min-h-screen bg-[#050310] text-white/90">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-white/[0.05]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[720px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(129,140,248,0.14), transparent 70%)" }}
        />
        <div className="reveal relative mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-16">
          <div className="flex justify-center sm:justify-start">
            <SectionChip label="Legal · Aviso legal" />
          </div>
          <h1
            className="mt-6 font-extrabold tracking-tight text-white"
            style={{ fontSize: "clamp(2rem, 4.6vw, 3rem)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" }}
          >
            Aviso Legal y Términos de Uso
          </h1>
          <p className="mt-4 text-sm text-white/60">
            Última actualización: <strong className="text-white/85">24 de mayo de 2026</strong>
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>
            Este documento establece las condiciones legales que rigen el acceso y uso de{" "}
            <strong className="text-white/85">orvexia.es</strong>, en cumplimiento de la{" "}
            <strong className="text-white/85">Ley 34/2002 de Servicios de la Sociedad de la Información (LSSICE)</strong> y
            demás normativa aplicable.
          </p>
        </div>
      </div>

      {/* Índice */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <nav aria-label="Índice del documento" className="rounded-2xl border border-brand-400/20 bg-brand-400/[0.05] p-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">Índice</p>
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <li key={s.title}>
                <a
                  href={`#seccion-${i + 1}`}
                  className="text-sm text-white/65 transition-colors hover:text-brand-200 hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Secciones */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-20 space-y-3">
        {SECTIONS.map((s, i) => (
          <article
            key={s.title}
            id={`seccion-${i + 1}`}
            className="scroll-mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-7"
          >
            <h2 className="mb-4 text-base font-bold text-white">{s.title}</h2>
            <div className="text-sm leading-relaxed text-white/70">{s.content}</div>
          </article>
        ))}

        <div className="pt-6 text-center">
          <p className="text-xs text-white/40">
            Orvexia · orvexia.es ·{" "}
            <a href="mailto:orvexiaesp@gmail.com" className="transition-colors hover:text-brand-300">
              orvexiaesp@gmail.com
            </a>
          </p>
          <p className="mt-1 text-xs text-white/40">Última revisión: 24 de mayo de 2026</p>
        </div>
      </div>
    </main>
  );
}
