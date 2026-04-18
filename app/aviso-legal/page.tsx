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
            ["Actividad", "Comparador de precios de electrodomésticos y tecnología de hogar"],
          ].map(([k, v]) => (
            <li key={k as string} className="flex gap-2 text-sm">
              <span className="font-semibold text-[#0F172A] flex-shrink-0">{k}:</span>
              <span className="text-[#475569]">{v}</span>
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
              <span className="text-[#475569]">{item}</span>
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
    title: "8. Exclusión de garantías y responsabilidad",
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
            <span className="text-[#475569]">{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: "9. Privacidad y cookies",
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
    title: "10. Legislación aplicable y jurisdicción",
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
    <main className="bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-3">
            <Link href="/" className="hover:text-[#4F46E5] transition-colors">Inicio</Link>
            <span>/</span>
            <span>Aviso legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight mb-3">
            Aviso Legal y Términos de Uso
          </h1>
          <p className="text-sm text-[#64748B]">
            Última actualización: <strong className="text-[#334155]">18 de abril de 2026</strong>
          </p>
          <p className="mt-3 text-sm text-[#475569] leading-relaxed max-w-2xl">
            Este documento establece las condiciones legales que rigen el acceso y uso de{" "}
            <strong>orvexia.es</strong>, en cumplimiento de la{" "}
            <strong>Ley 34/2002 de Servicios de la Sociedad de la Información (LSSICE)</strong> y
            demás normativa aplicable.
          </p>
        </div>
      </div>

      {/* Índice */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-2xl p-5">
          <p className="text-xs font-bold text-[#4F46E5] uppercase tracking-widest mb-3">Índice</p>
          <ol className="grid sm:grid-cols-2 gap-1">
            {SECTIONS.map((s, i) => (
              <li key={s.title}>
                <a
                  href={`#seccion-${i + 1}`}
                  className="text-sm text-[#4338CA] hover:text-[#312E81] hover:underline transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Secciones */}
      <div className="max-w-4xl mx-auto px-6 pb-16 space-y-4">
        {SECTIONS.map((s, i) => (
          <article
            key={s.title}
            id={`seccion-${i + 1}`}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-6 scroll-mt-6"
          >
            <h2 className="text-base font-bold text-[#0F172A] mb-4">{s.title}</h2>
            <div className="text-sm leading-relaxed text-[#334155]">{s.content}</div>
          </article>
        ))}

        {/* Footer legal */}
        <div className="text-center pt-4">
          <p className="text-xs text-[#94A3B8]">
            Orvexia · orvexia.es ·{" "}
            <a href="mailto:orvexiaesp@gmail.com" className="hover:text-[#4F46E5] transition-colors">
              orvexiaesp@gmail.com
            </a>
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Versión 1.0 — Última revisión: 18 de abril de 2026
          </p>
        </div>
      </div>
    </main>
  );
}
