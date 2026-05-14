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
                <strong className="text-fg">{item.label}:</strong>{" "}
                <span className="text-fg-muted">{item.desc}</span>
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
          <tr className="bg-bg-subtle">
            <th className="text-left px-3 py-2 font-semibold text-fg rounded-tl-lg">Finalidad</th>
            <th className="text-left px-3 py-2 font-semibold text-fg rounded-tr-lg">Base legal</th>
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
              <td className="px-3 py-2 text-fg">{fin}</td>
              <td className="px-3 py-2 text-fg-muted">{base}</td>
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
              <strong className="text-fg">{tipo}:</strong>{" "}
              <span className="text-fg-muted">{plazo}</span>
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
                <strong className="text-fg">{dest}:</strong>{" "}
                <span className="text-fg-muted">{info}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-fg-muted">
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
            <div key={der as string} className="bg-bg-subtle rounded-xl p-4 border border-border">
              <p className="font-semibold text-fg text-sm mb-1">{der}</p>
              <p className="text-xs text-fg-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-fg-muted">
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
            <span className="text-cyan-300">privacidad</span>
          </div>
          <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">▸ /legal · privacy</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Política de <span className="text-gradient-neon">Privacidad</span>
          </h1>
          <p className="text-sm text-white/55">
            Última actualización: <strong className="text-white/85">18 de abril de 2026</strong>
          </p>
          <p className="mt-3 text-sm text-white/55 leading-relaxed max-w-2xl">
            En Orvexia nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política explica
            qué datos recogemos, para qué los usamos y cuáles son tus derechos conforme al{" "}
            <strong className="text-white/85">Reglamento General de Protección de Datos (RGPD)</strong> y la{" "}
            <strong className="text-white/85">Ley Orgánica 3/2018 de Protección de Datos (LOPDGDD)</strong>.
          </p>
        </div>
      </div>

      {/* Índice rápido */}
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
            v1.0 · last_rev=2026-04-18
          </p>
        </div>
      </div>
    </main>
  );
}
