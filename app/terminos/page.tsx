import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos del Servicio y Política de Reembolso | Orvexia Repricer",
  description:
    "Condiciones contractuales del servicio de suscripción Orvexia Repricer (SaaS B2B): planes, facturación, cancelación, política de reembolso y limitación de responsabilidad.",
};

const SECTIONS = [
  {
    title: "1. Introducción y partes",
    content: (
      <>
        <p className="mb-3">
          Estos Términos del Servicio (en adelante, «Términos») regulan el contrato de
          suscripción al servicio <strong>Orvexia Repricer</strong> (en adelante, «el Servicio»),
          un software como servicio (SaaS) de reprecio automático para vendedores de Amazon
          España operado por <strong>Orvexia</strong> (en adelante, «Orvexia», «nosotros»).
        </p>
        <p className="mb-3">
          El Servicio se contrata por internet a través de{" "}
          <strong>orvexia.es/sellers/facturacion</strong>. Al iniciar el proceso de suscripción
          (incluyendo el período de prueba gratuito) el usuario (en adelante, «el Cliente»)
          declara haber leído, comprendido y aceptado íntegramente los presentes Términos.
        </p>
        <p>
          Estos Términos se aplican exclusivamente al Servicio de suscripción. El uso del
          comparador público de orvexia.es se rige por el{" "}
          <Link href="/aviso-legal" className="text-[#4F46E5] hover:underline font-medium">
            Aviso Legal
          </Link>{" "}
          general del sitio.
        </p>
      </>
    ),
  },
  {
    title: "2. Descripción del Servicio",
    content: (
      <>
        <p className="mb-3">
          Orvexia Repricer es una herramienta automatizada que ajusta el precio de los listings
          de Amazon del Cliente conforme a las reglas que él mismo configura (precio mínimo,
          precio máximo, estrategia frente al Buy Box) y dentro de los límites de la{" "}
          <strong>Amazon Selling Partner API (SP-API)</strong>.
        </p>
        <ul className="space-y-2 list-none">
          {[
            "El Servicio requiere que el Cliente disponga de una cuenta de vendedor profesional activa en Amazon España (Seller Central) y autorice a Orvexia mediante el flujo OAuth oficial de Amazon.",
            "El Cliente conserva en todo momento la propiedad de su cuenta de Amazon y puede revocar la autorización OAuth desde Seller Central en cualquier momento.",
            "Orvexia no compra, vende ni almacena inventario del Cliente. Únicamente actualiza precios en su nombre.",
            "El Servicio es 'best-effort': dependemos de la disponibilidad de SP-API y de los límites de cuota que Amazon impone. No ofrecemos un acuerdo de nivel de servicio (SLA) con garantía de tiempo de actividad.",
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
    title: "3. Período de prueba gratuito",
    content: (
      <>
        <p className="mb-3">
          La primera suscripción de cada Cliente incluye un <strong>período de prueba gratuito
          de 14 días naturales</strong>. Durante el período de prueba:
        </p>
        <ul className="space-y-2 list-none mb-3">
          {[
            "El Cliente debe introducir un método de pago válido (tarjeta) en el checkout de Stripe, pero no se le cargará importe alguno durante los 14 días.",
            "El Servicio funciona con un intervalo de reprecio de 15 minutos y un límite de 50 productos activos.",
            "El Cliente puede cancelar en cualquier momento durante el trial sin coste.",
            "Si no se cancela antes del día 14, la suscripción se activa automáticamente al plan Pro (ver Sección 4).",
            "El período de prueba es de un solo uso por cuenta. Cancelar y volver a suscribirse no concede un nuevo trial.",
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
    title: "4. Plan, precio y facturación",
    content: (
      <>
        <p className="mb-3">
          El Servicio se factura mediante una <strong>suscripción mensual recurrente</strong> de
          precio plano. Tarifa vigente:
        </p>
        <table className="w-full text-sm border-collapse mt-1 mb-3">
          <thead>
            <tr className="bg-bg-subtle">
              <th className="text-left px-3 py-2 font-semibold text-fg rounded-tl-lg">Plan</th>
              <th className="text-left px-3 py-2 font-semibold text-fg">Catálogo incluido</th>
              <th className="text-left px-3 py-2 font-semibold text-fg rounded-tr-lg">Precio (IVA incluido)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            <tr>
              <td className="px-3 py-2 text-fg font-semibold">Pro</td>
              <td className="px-3 py-2 text-fg-muted">SKUs ilimitados</td>
              <td className="px-3 py-2 text-fg-muted">19 €/mes</td>
            </tr>
          </tbody>
        </table>
        <ul className="space-y-2 list-none">
          {[
            "El precio mostrado incluye el IVA español del 21%. Para operaciones intracomunitarias B2B con NIF-IVA válido puede aplicarse la inversión del sujeto pasivo conforme a la normativa europea.",
            "La suscripción se renueva automáticamente cada mes en la fecha del cargo inicial. El Cliente autoriza expresamente a Stripe a realizar estos cargos recurrentes con el método de pago facilitado.",
            "Los pagos se procesan por Stripe Payments Europe, Ltd. Orvexia no almacena ni tiene acceso a los datos de la tarjeta del Cliente.",
            "El plan incluye SKUs ilimitados, reprecio cada 5 minutos, soporte por correo y todas las funcionalidades del Servicio.",
            "Orvexia se reserva el derecho a modificar el precio con un preaviso mínimo de 30 días por correo electrónico. El Cliente podrá cancelar antes de la entrada en vigor del nuevo precio sin coste adicional.",
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
    title: "5. Cancelación de la suscripción",
    content: (
      <>
        <p className="mb-3">
          El Cliente puede <strong>cancelar la suscripción en cualquier momento</strong>, sin
          permanencia ni penalización, desde:
        </p>
        <ul className="space-y-2 list-none mb-3">
          {[
            "El portal de Stripe accesible mediante el botón «Gestionar suscripción» en /sellers/facturacion.",
            "Escribiendo a orvexiaesp@gmail.com con la solicitud de cancelación. Confirmaremos por correo en menos de 48 horas hábiles.",
          ].map((item) => (
            <li key={item} className="flex gap-3 items-start text-sm">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#4F46E5] flex-shrink-0" />
              <span className="text-fg-muted">{item}</span>
            </li>
          ))}
        </ul>
        <p className="mb-3">
          Efectos de la cancelación:
        </p>
        <ul className="space-y-2 list-none">
          {[
            "La cancelación es efectiva al final del período de facturación en curso ya pagado. El Cliente conserva acceso completo al Servicio hasta esa fecha.",
            "No se efectúan cargos posteriores ni renovaciones automáticas.",
            "Al finalizar el período pagado, el Servicio pasa al modo «pausado»: la cuenta se mantiene pero el reprecio automático se detiene.",
            "Los datos del Cliente (configuración de listings, historial de cambios, reglas) se conservan durante 90 días tras la cancelación, por si decide reactivar el Servicio. Pasado ese plazo se eliminan.",
            "El Cliente puede solicitar la eliminación inmediata de sus datos en cualquier momento (ver Política de Privacidad).",
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
    title: "6. Política de reembolso",
    content: (
      <>
        <p className="mb-3">
          Al tratarse de un servicio digital de suscripción recurrente, dirigido a empresarios
          y profesionales (B2B), <strong>no se ofrecen reembolsos parciales del mes en curso</strong>
          {" "}una vez efectuado el cargo, salvo en los supuestos descritos a continuación.
        </p>
        <p className="mb-3">
          <strong>Casos en los que sí se realiza reembolso íntegro o parcial:</strong>
        </p>
        <ul className="space-y-2 list-none mb-3">
          {[
            "Cargo duplicado o erróneo imputable a Orvexia: reembolso íntegro del importe duplicado.",
            "Cargo realizado pese a una cancelación previamente solicitada por escrito: reembolso íntegro del cargo indebido.",
            "Indisponibilidad del Servicio durante más de 7 días naturales consecutivos por causa imputable a Orvexia (excluyendo incidencias de Amazon SP-API, Vercel, Stripe u otros proveedores externos): reembolso prorrateado proporcional a los días de indisponibilidad.",
            "Cobro tras un trial gratuito que el Cliente intentó cancelar y no pudo hacerlo por un fallo técnico de la plataforma: reembolso íntegro del primer cargo.",
          ].map((item) => (
            <li key={item} className="flex gap-3 items-start text-sm">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#4F46E5] flex-shrink-0" />
              <span className="text-fg-muted">{item}</span>
            </li>
          ))}
        </ul>
        <p className="mb-3">
          <strong>Solicitudes de reembolso:</strong> deben dirigirse a{" "}
          <a href="mailto:orvexiaesp@gmail.com" className="text-[#4F46E5] hover:underline">
            orvexiaesp@gmail.com
          </a>{" "}
          en el plazo máximo de 14 días naturales desde el cargo. Indica el correo de la
          cuenta, el motivo y, si procede, las fechas de incidencia. Respondemos en menos de
          5 días hábiles. Los reembolsos aprobados se devuelven al mismo método de pago en
          un plazo de 5 a 10 días hábiles según los tiempos bancarios.
        </p>
        <p>
          <strong>Derecho de desistimiento:</strong> en el caso de Clientes consumidores
          (excepcional en B2B), conforme al art. 103.m) del TRLGDCU, el derecho de
          desistimiento no se aplica a contenidos digitales suministrados de forma inmediata
          tras la aceptación expresa del Cliente. El período de prueba gratuito de 14 días ya
          cumple holgadamente con el plazo de desistimiento del art. 102.
        </p>
      </>
    ),
  },
  {
    title: "7. Obligaciones del Cliente",
    content: (
      <>
        <p className="mb-3">El Cliente se compromete a:</p>
        <ul className="space-y-2 list-none">
          {[
            "Mantener activa y operativa su cuenta de vendedor profesional en Amazon España durante toda la vigencia de la suscripción.",
            "Cumplir las Políticas de Vendedor de Amazon y la legislación aplicable a su actividad comercial. Orvexia no se responsabiliza de sanciones, suspensiones o cierres de cuenta de Amazon derivados del incumplimiento de dichas políticas por parte del Cliente.",
            "Configurar de manera diligente sus reglas de reprecio (precio mínimo, precio máximo, estrategia). Orvexia no es responsable de pérdidas comerciales derivadas de reglas mal configuradas por el Cliente.",
            "Facilitar datos de facturación correctos y completos (denominación social, NIF/CIF, domicilio fiscal).",
            "No intentar realizar ingeniería inversa, descompilar o eludir las protecciones técnicas del Servicio.",
            "No utilizar el Servicio para actividades fraudulentas, manipulación de mercado, fijación concertada de precios u otras conductas anticompetitivas.",
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
    title: "8. Suspensión por impago",
    content: (
      <>
        <p className="mb-3">
          Si el cargo mensual falla (tarjeta caducada, fondos insuficientes, etc.), Stripe
          intentará el cobro automáticamente hasta 3 veces en los 14 días siguientes y
          notificará al Cliente por correo.
        </p>
        <ul className="space-y-2 list-none">
          {[
            "Durante el período de reintentos el Servicio continúa activo.",
            "Si transcurridos 14 días el cargo sigue sin completarse, el Servicio se suspenderá y el reprecio automático se detendrá.",
            "El Cliente puede reactivar el Servicio en cualquier momento actualizando el método de pago desde el portal de Stripe.",
            "La cuenta y los datos del Cliente se conservan durante 90 días tras la suspensión por impago. Pasado ese plazo se eliminan.",
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
    title: "9. Limitación de responsabilidad",
    content: (
      <>
        <p className="mb-3">
          En la medida máxima permitida por la ley, Orvexia no responde por:
        </p>
        <ul className="space-y-2 list-none mb-3">
          {[
            "Pérdida de Buy Box, descenso de ventas o reducción de beneficios derivados del uso del Servicio.",
            "Errores en los precios provocados por reglas mal configuradas por el Cliente o por datos incorrectos en su catálogo de Amazon.",
            "Indisponibilidad o errores en servicios de terceros (Amazon SP-API, Stripe, Vercel, Neon, proveedores de email).",
            "Suspensión, restricción o cierre de la cuenta de Amazon del Cliente por causas ajenas al Servicio.",
            "Daños indirectos, pérdida de beneficios, pérdida de oportunidades comerciales o daños a la reputación.",
          ].map((item) => (
            <li key={item} className="flex gap-3 items-start text-sm">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#4F46E5] flex-shrink-0" />
              <span className="text-fg-muted">{item}</span>
            </li>
          ))}
        </ul>
        <p>
          La responsabilidad máxima acumulada de Orvexia frente al Cliente, por cualquier
          causa, queda limitada al importe total efectivamente abonado por el Cliente durante
          los 12 meses inmediatamente anteriores al hecho generador de la reclamación. Esta
          limitación no se aplica a los supuestos de dolo o negligencia grave, ni a los
          derechos irrenunciables del consumidor cuando éstos resulten de aplicación.
        </p>
      </>
    ),
  },
  {
    title: "10. Propiedad intelectual",
    content: (
      <>
        <p>
          La titularidad del software, código, marcas, logotipos, diseño y demás contenidos
          del Servicio corresponde a Orvexia o a sus licenciantes. La suscripción otorga al
          Cliente una <strong>licencia de uso no exclusiva, no transferible y revocable</strong>
          {" "}durante la vigencia del contrato, limitada al uso del Servicio sobre su propia
          cuenta de Amazon. El Cliente conserva la titularidad sobre sus propios datos y
          reglas de reprecio.
        </p>
      </>
    ),
  },
  {
    title: "11. Protección de datos",
    content: (
      <p>
        El tratamiento de datos personales del Cliente y de los datos obtenidos vía Amazon
        SP-API se rige por la{" "}
        <Link href="/politica-privacidad" className="text-[#4F46E5] hover:underline font-medium">
          Política de Privacidad
        </Link>
        {" "}y la{" "}
        <Link href="/politica-datos-amazon" className="text-[#4F46E5] hover:underline font-medium">
          Política de Protección de Datos de Amazon
        </Link>
        , que forman parte integrante de estos Términos.
      </p>
    ),
  },
  {
    title: "12. Modificaciones",
    content: (
      <p>
        Orvexia se reserva el derecho a modificar estos Términos. Cualquier modificación
        sustancial se notificará al Cliente por correo electrónico con al menos 30 días de
        antelación a su entrada en vigor. Si el Cliente no está de acuerdo con la
        modificación, podrá cancelar la suscripción antes de la fecha de entrada en vigor
        sin coste adicional. El uso continuado del Servicio tras dicha fecha implica la
        aceptación de los nuevos Términos.
      </p>
    ),
  },
  {
    title: "13. Legislación aplicable y jurisdicción",
    content: (
      <>
        <p className="mb-3">
          Los presentes Términos se rigen por la legislación española. Para la resolución
          de cualquier controversia derivada del contrato de suscripción, las partes se
          someten expresamente a los Juzgados y Tribunales que correspondan conforme a la
          normativa vigente.
        </p>
        <p>
          Si el Cliente tiene la condición de consumidor (lo que es excepcional en este
          Servicio B2B), podrá acudir a la plataforma europea de resolución de litigios en
          línea disponible en{" "}
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
      </>
    ),
  },
  {
    title: "14. Contacto",
    content: (
      <>
        <p className="mb-2">Para cualquier consulta relacionada con estos Términos:</p>
        <ul className="space-y-1.5 list-none">
          {[
            ["Correo de soporte", "orvexiaesp@gmail.com"],
            ["Web", "orvexia.es"],
            ["Portal del cliente", "orvexia.es/sellers/facturacion"],
          ].map(([k, v]) => (
            <li key={k as string} className="flex gap-2 text-sm">
              <span className="font-semibold text-fg flex-shrink-0">{k}:</span>
              <span className="text-fg-muted">{v}</span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
];

export default function TerminosPage() {
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
            <span className="text-cyan-300">terminos</span>
          </div>
          <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">▸ /legal · saas · refunds</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Términos del Servicio y <span className="text-gradient-neon">Política de Reembolso</span>
          </h1>
          <p className="text-sm text-white/55">
            Última actualización: <strong className="text-white/85">27 de mayo de 2026</strong>
          </p>
          <p className="mt-3 text-sm text-white/55 leading-relaxed max-w-2xl">
            Estos términos regulan el contrato de suscripción a{" "}
            <strong className="text-white/85">Orvexia Repricer</strong>, el servicio SaaS de
            reprecio automático para vendedores de Amazon España. Incluye el régimen de
            facturación, cancelación, reembolsos y limitación de responsabilidad.
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
            v1.0 · last_rev=2026-05-27
          </p>
        </div>
      </div>
    </main>
  );
}
