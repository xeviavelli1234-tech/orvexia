import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad | Orvexia",
  description:
    "Política de privacidad de Orvexia. Información sobre el tratamiento de tus datos personales conforme al RGPD y la LOPDGDD.",
};

const SECTIONS = [
  {
    title: "1. Responsable del tratamiento",
    content: (
      <>
        <p>
          El responsable del tratamiento de los datos personales recogidos a través de este sitio web es
          <strong> Orvexia</strong>, accesible en <strong>orvexia.es</strong>.
        </p>
        <p className="mt-2">
          Para cualquier consulta relacionada con la privacidad puedes contactarnos en:{" "}
          <a href="mailto:orvexiaesp@gmail.com" className="text-[#4F46E5] hover:underline">
            orvexiaesp@gmail.com
          </a>
        </p>
      </>
    ),
  },
  {
    title: "2. Datos que recogemos",
    content: (
      <>
        <p>Recogemos los siguientes datos según cómo interactúes con el sitio:</p>
        <ul className="mt-3 space-y-2 list-none">
          {[
            {
              label: "Datos de registro",
              desc: "Nombre, dirección de correo electrónico y contraseña (encriptada) cuando creas una cuenta. Si te registras con Google, recibimos nombre, correo y foto de perfil de Google.",
            },
            {
              label: "Datos de uso",
              desc: "Páginas visitadas, búsquedas realizadas, productos consultados, votos y comentarios publicados en la comunidad. Estos datos se recogen de forma agregada y anonimizada para mejorar el servicio.",
            },
            {
              label: "Datos técnicos",
              desc: "Dirección IP, tipo de navegador, sistema operativo y páginas de referencia. Se recogen automáticamente para garantizar la seguridad y el correcto funcionamiento del servicio.",
            },
            {
              label: "Cookies",
              desc: "Usamos cookies técnicas necesarias para el funcionamiento del sitio y, con tu consentimiento, cookies de analítica y publicidad. Consulta nuestra política de cookies para más detalle.",
            },
          ].map((item) => (
            <li key={item.label} className="flex gap-3 items-start">
              <span className="mt-0.5 w-2 h-2 rounded-full bg-[#4F46E5] flex-shrink-0" />
              <span>
                <strong className="text-[#0F172A]">{item.label}:</strong>{" "}
                <span className="text-[#475569]">{item.desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    title: "3. Finalidad y base legal del tratamiento",
    content: (
      <table className="w-full text-sm border-collapse mt-1">
        <thead>
          <tr className="bg-[#F1F5F9]">
            <th className="text-left px-3 py-2 font-semibold text-[#0F172A] rounded-tl-lg">Finalidad</th>
            <th className="text-left px-3 py-2 font-semibold text-[#0F172A] rounded-tr-lg">Base legal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9]">
          {[
            ["Gestionar tu cuenta y autenticación", "Ejecución de contrato (Art. 6.1.b RGPD)"],
            ["Mostrarte comparativas y precios personalizados", "Interés legítimo (Art. 6.1.f RGPD)"],
            ["Enviar notificaciones de alertas de precio (si las activas)", "Consentimiento (Art. 6.1.a RGPD)"],
            ["Analítica de uso del sitio", "Consentimiento (Art. 6.1.a RGPD)"],
            ["Publicidad personalizada", "Consentimiento (Art. 6.1.a RGPD)"],
            ["Cumplimiento de obligaciones legales", "Obligación legal (Art. 6.1.c RGPD)"],
          ].map(([fin, base]) => (
            <tr key={fin}>
              <td className="px-3 py-2 text-[#334155]">{fin}</td>
              <td className="px-3 py-2 text-[#64748B]">{base}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
  {
    title: "4. Conservación de los datos",
    content: (
      <ul className="space-y-2 list-none">
        {[
          ["Datos de cuenta", "Mientras mantengas la cuenta activa. Tras la baja, se eliminan en un plazo máximo de 30 días salvo obligación legal de conservación."],
          ["Datos de sesión", "7 días desde el último acceso (cookie de sesión)."],
          ["Datos de analítica", "26 meses (estándar de Google Analytics) o hasta que retires el consentimiento."],
          ["Registros de seguridad (logs)", "90 días."],
        ].map(([tipo, plazo]) => (
          <li key={tipo as string} className="flex gap-3 items-start">
            <span className="mt-0.5 w-2 h-2 rounded-full bg-[#4F46E5] flex-shrink-0" />
            <span>
              <strong className="text-[#0F172A]">{tipo}:</strong>{" "}
              <span className="text-[#475569]">{plazo}</span>
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: "5. Destinatarios y transferencias internacionales",
    content: (
      <>
        <p className="mb-3">
          Tus datos pueden ser compartidos con los siguientes terceros en la medida estrictamente necesaria:
        </p>
        <ul className="space-y-2 list-none">
          {[
            ["Vercel (alojamiento)", "EE.UU. — acogido al Data Privacy Framework UE-EE.UU."],
            ["Google (autenticación OAuth y analítica)", "EE.UU. — acogido al Data Privacy Framework UE-EE.UU."],
            ["Neon / PostgreSQL (base de datos)", "UE — sin transferencia internacional."],
            ["Amazon, PcComponentes, El Corte Inglés, Fnac (enlaces de afiliados)", "Solo se comparte el clic a través de un enlace de seguimiento. No se transfieren datos personales identificables."],
          ].map(([dest, info]) => (
            <li key={dest as string} className="flex gap-3 items-start">
              <span className="mt-0.5 w-2 h-2 rounded-full bg-[#4F46E5] flex-shrink-0" />
              <span>
                <strong className="text-[#0F172A]">{dest}:</strong>{" "}
                <span className="text-[#475569]">{info}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[#475569]">
          No vendemos, alquilamos ni cedemos tus datos a terceros con fines comerciales propios.
        </p>
      </>
    ),
  },
  {
    title: "6. Tus derechos",
    content: (
      <>
        <p className="mb-3">
          De acuerdo con el RGPD y la LOPDGDD, tienes los siguientes derechos sobre tus datos:
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            ["Acceso", "Solicitar una copia de los datos que tenemos sobre ti."],
            ["Rectificación", "Corregir datos inexactos o incompletos."],
            ["Supresión", "Solicitar la eliminación de tus datos («derecho al olvido»)."],
            ["Oposición", "Oponerte al tratamiento basado en interés legítimo."],
            ["Portabilidad", "Recibir tus datos en formato estructurado y legible por máquina."],
            ["Limitación", "Solicitar que se restrinja el tratamiento de tus datos."],
            ["Retirar consentimiento", "En cualquier momento para los tratamientos basados en él, sin efecto retroactivo."],
            ["Reclamar ante la AEPD", "Si consideras que tus derechos han sido vulnerados puedes presentar una reclamación ante la Agencia Española de Protección de Datos (aepd.es)."],
          ].map(([der, desc]) => (
            <div key={der as string} className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
              <p className="font-semibold text-[#0F172A] text-sm mb-1">{der}</p>
              <p className="text-xs text-[#64748B] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-[#475569]">
          Para ejercer cualquiera de estos derechos escríbenos a{" "}
          <a href="mailto:orvexiaesp@gmail.com" className="text-[#4F46E5] hover:underline">
            orvexiaesp@gmail.com
          </a>{" "}
          indicando el derecho que deseas ejercer y adjuntando una copia de tu documento de identidad.
          Responderemos en el plazo máximo de 30 días.
        </p>
      </>
    ),
  },
  {
    title: "7. Seguridad",
    content: (
      <p>
        Aplicamos medidas técnicas y organizativas apropiadas para proteger tus datos frente a accesos no
        autorizados, pérdida o destrucción. Las contraseñas se almacenan siempre cifradas (hash bcrypt).
        Las comunicaciones entre tu navegador y nuestros servidores se realizan mediante HTTPS/TLS.
        Realizamos revisiones periódicas de seguridad de nuestra infraestructura.
      </p>
    ),
  },
  {
    title: "8. Menores de edad",
    content: (
      <p>
        Orvexia no está dirigido a menores de 14 años. No recogemos conscientemente datos de menores.
        Si eres padre o tutor y crees que tu hijo nos ha proporcionado datos personales, contáctanos en{" "}
        <a href="mailto:orvexiaesp@gmail.com" className="text-[#4F46E5] hover:underline">
          orvexiaesp@gmail.com
        </a>{" "}
        y los eliminaremos de inmediato.
      </p>
    ),
  },
  {
    title: "9. Cambios en esta política",
    content: (
      <p>
        Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa aplicable.
        Cuando lo hagamos, actualizaremos la fecha de revisión al pie de esta página. Si los cambios son
        significativos, te lo notificaremos por correo electrónico o mediante un aviso destacado en el sitio.
        Te recomendamos revisar esta página periódicamente.
      </p>
    ),
  },
  {
    title: "10. Política de cookies",
    content: (
      <p>
        Para más información sobre las cookies que utilizamos y cómo gestionarlas, consulta nuestra{" "}
        <Link href="/politica-cookies" className="text-[#4F46E5] hover:underline font-medium">
          Política de cookies
        </Link>
        .
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-3">
            <Link href="/" className="hover:text-[#4F46E5] transition-colors">Inicio</Link>
            <span>/</span>
            <span>Política de privacidad</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#0F172A] tracking-tight mb-3">
            Política de Privacidad
          </h1>
          <p className="text-sm text-[#64748B]">
            Última actualización: <strong className="text-[#334155]">18 de abril de 2026</strong>
          </p>
          <p className="mt-3 text-sm text-[#475569] leading-relaxed max-w-2xl">
            En Orvexia nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política explica
            qué datos recogemos, para qué los usamos y cuáles son tus derechos conforme al{" "}
            <strong>Reglamento General de Protección de Datos (RGPD)</strong> y la{" "}
            <strong>Ley Orgánica 3/2018 de Protección de Datos (LOPDGDD)</strong>.
          </p>
        </div>
      </div>

      {/* Índice rápido */}
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
