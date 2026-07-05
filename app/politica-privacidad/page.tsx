import type { Metadata } from "next";
import Link from "next/link";
import { SectionChip } from "@/app/_components/SectionPrimitives";

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
          <a href="mailto:orvexiaesp@gmail.com" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
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
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
              <span>
                <strong className="text-white/85">{item.label}:</strong>{" "}
                <span className="text-white/60">{item.desc}</span>
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse mt-1">
          <thead>
            <tr className="bg-white/[0.04]">
              <th className="text-left px-3 py-2 font-semibold text-white/85 rounded-tl-lg">Finalidad</th>
              <th className="text-left px-3 py-2 font-semibold text-white/85 rounded-tr-lg">Base legal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {[
              ["Gestionar tu cuenta y autenticación", "Ejecución de contrato (Art. 6.1.b RGPD)"],
              ["Mostrarte comparativas y precios personalizados", "Interés legítimo (Art. 6.1.f RGPD)"],
              ["Enviar notificaciones de alertas de precio (si las activas)", "Consentimiento (Art. 6.1.a RGPD)"],
              ["Analítica de uso del sitio", "Consentimiento (Art. 6.1.a RGPD)"],
              ["Publicidad personalizada", "Consentimiento (Art. 6.1.a RGPD)"],
              ["Cumplimiento de obligaciones legales", "Obligación legal (Art. 6.1.c RGPD)"],
            ].map(([fin, base]) => (
              <tr key={fin}>
                <td className="px-3 py-2 text-white/80">{fin}</td>
                <td className="px-3 py-2 text-white/60">{base}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
            <span>
              <strong className="text-white/85">{tipo}:</strong>{" "}
              <span className="text-white/60">{plazo}</span>
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
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
              <span>
                <strong className="text-white/85">{dest}:</strong>{" "}
                <span className="text-white/60">{info}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-white/60">
          No vendemos, alquilamos ni cedemos tus datos a terceros con fines comerciales propios.
        </p>
      </>
    ),
  },
  {
    title: "6. Datos obtenidos de Amazon Selling Partner API",
    content: (
      <>
        <p className="mb-3">
          De forma <strong>separada e independiente</strong> al comparador público, Orvexia opera una
          tienda propia en Amazon España bajo la marca <strong>OrvexiaShop</strong>. Para gestionar
          únicamente esa cuenta de vendedor utilizamos la <strong>Amazon Selling Partner API (SP-API)</strong>.
        </p>
        <ul className="space-y-2 list-none mb-3">
          {[
            ["Naturaleza de los datos", "ASIN/SKU, título de producto, precio actual, precio competitivo y estado del listing de nuestra propia cuenta de vendedor. No se tratan datos personales de compradores."],
            ["Finalidad", "Repricing automático y mantenimiento del catálogo dentro de un rango mín/máx definido manualmente por nosotros sobre nuestra propia cuenta."],
            ["No se comparten con terceros", "Estos datos se utilizan exclusivamente de forma interna y nunca se exponen en el comparador público de orvexia.es."],
            ["No se cruzan con datos de usuarios", "Los datos de SP-API están aislados técnica y operativamente de los datos de visitantes y cuentas de orvexia.es."],
            ["Cifrado y conservación", "Los refresh tokens de OAuth se almacenan cifrados en reposo (AES-256-GCM) y las comunicaciones con Amazon se realizan sobre HTTPS/TLS. Se conservan únicamente mientras la autorización con Amazon esté vigente y se eliminan a los 30 días de revocada."],
            ["Cumplimiento", "El tratamiento se realiza conforme a la Amazon Data Protection Policy (DPP) y la Acceptable Use Policy (AUP) de la SP-API."],
          ].map(([k, v]) => (
            <li key={k as string} className="flex gap-3 items-start">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
              <span>
                <strong className="text-white/85">{k}:</strong>{" "}
                <span className="text-white/60">{v}</span>
              </span>
            </li>
          ))}
        </ul>
        <p>
          Para el detalle técnico completo consulta la{" "}
          <Link href="/politica-datos-amazon" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
            Política de Protección de Datos de Amazon
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    title: "7. Tus derechos",
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
            <div key={der as string} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
              <p className="mb-1 text-sm font-semibold text-white/90">{der}</p>
              <p className="text-xs leading-relaxed text-white/55">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/60">
          Para ejercer cualquiera de estos derechos escríbenos a{" "}
          <a href="mailto:orvexiaesp@gmail.com" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
            orvexiaesp@gmail.com
          </a>{" "}
          indicando el derecho que deseas ejercer y adjuntando una copia de tu documento de identidad.
          Responderemos en el plazo máximo de 30 días.
        </p>
      </>
    ),
  },
  {
    title: "8. Seguridad",
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
    title: "9. Menores de edad",
    content: (
      <p>
        Orvexia no está dirigido a menores de 14 años. No recogemos conscientemente datos de menores.
        Si eres padre o tutor y crees que tu hijo nos ha proporcionado datos personales, contáctanos en{" "}
        <a href="mailto:orvexiaesp@gmail.com" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
          orvexiaesp@gmail.com
        </a>{" "}
        y los eliminaremos de inmediato.
      </p>
    ),
  },
  {
    title: "10. Cambios en esta política",
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
    title: "11. Política de cookies",
    content: (
      <p>
        Para más información sobre las cookies que utilizamos y cómo gestionarlas, consulta nuestra{" "}
        <Link href="/politica-cookies" className="font-medium text-brand-300 hover:text-brand-200 hover:underline">
          Política de cookies
        </Link>
        .
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
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
            <SectionChip label="Legal · Privacidad" />
          </div>
          <h1
            className="mt-6 font-extrabold tracking-tight text-white"
            style={{ fontSize: "clamp(2rem, 4.6vw, 3rem)", lineHeight: 1.08, letterSpacing: "-0.03em", textWrap: "balance" }}
          >
            Política de Privacidad
          </h1>
          <p className="mt-4 text-sm text-white/60">
            Última actualización: <strong className="text-white/85">24 de mayo de 2026</strong>
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>
            En Orvexia nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política explica
            qué datos recogemos, para qué los usamos y cuáles son tus derechos conforme al{" "}
            <strong className="text-white/85">Reglamento General de Protección de Datos (RGPD)</strong> y la{" "}
            <strong className="text-white/85">Ley Orgánica 3/2018 de Protección de Datos (LOPDGDD)</strong>.
          </p>
        </div>
      </div>

      {/* Índice rápido */}
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
