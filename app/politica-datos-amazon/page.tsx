import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Protección de Datos de Amazon · Orvexia Repricer",
  description:
    "Cómo Orvexia Repricer accede, usa, protege, conserva y elimina los datos obtenidos vía Amazon Selling Partner API (SP-API).",
};

const UPDATED = "19 de mayo de 2026";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 text-xl font-bold text-white tracking-tight">
      {children}
    </h2>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-relaxed text-white/70">{children}</p>
  );
}
function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="mt-1.5 text-sm leading-relaxed text-white/70">{children}</li>
  );
}

export default function PoliticaDatosAmazon() {
  return (
    <main>
      {/* Hero cibernético */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 bg-grid-cyber opacity-40 pointer-events-none" />
        <div
          className="absolute -top-32 left-1/3 w-[800px] h-[400px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(94,234,212,0.16), transparent 65%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider text-white/40 mb-4">
            <Link href="/" className="hover:text-cyan-300 transition-colors">
              ~/
            </Link>
            <span className="text-white/25">›</span>
            <span className="text-cyan-300">amazon-data</span>
          </div>
          <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">
            ▸ /legal · sp-api data protection
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Protección de datos de{" "}
            <span className="text-gradient-aurora">Amazon</span>
          </h1>
          <p className="text-sm text-white/55">
            Aplicable a Orvexia Repricer · Última actualización:{" "}
            <strong className="text-white/85">{UPDATED}</strong>
          </p>
          <p className="mt-3 text-sm text-white/55 leading-relaxed max-w-2xl">
            Cómo accedemos, usamos, protegemos, conservamos y eliminamos los
            datos obtenidos a través de la{" "}
            <strong className="text-white/85">
              Amazon Selling Partner API (SP-API)
            </strong>
            , conforme al <em>Acceptable Use Policy</em> y la{" "}
            <em>Data Protection Policy</em>.
          </p>
        </div>
        <div className="holo-divider mx-auto max-w-4xl" />
      </div>

      {/* Contenido */}
      <article className="relative max-w-3xl mx-auto px-5 py-14">
      <P>
        Esta política describe cómo Orvexia Repricer (&ldquo;la Aplicación&rdquo;) accede,
        utiliza, almacena, protege, conserva y elimina la información obtenida a través de la
        Amazon Selling Partner API (SP-API). La Aplicación cumple con el{" "}
        <em>Acceptable Use Policy</em> y la{" "}
        <em>Data Protection Policy</em> del Amazon Selling Partner API.
      </P>

      <H>1. Datos a los que se accede</H>
      <P>
        La Aplicación solo solicita los roles estrictamente necesarios para su función
        (reprecio automático):
      </P>
      <ul className="mt-2 list-disc pl-5">
        <LI>
          <strong>Pricing (Precios):</strong> precios competitivos y de oferta de los ASIN del
          vendedor para calcular el nuevo precio.
        </LI>
        <LI>
          <strong>Listings (Listing de producto):</strong> SKU, ASIN, título, imagen, precio
          actual y aplicación del nuevo precio.
        </LI>
        <LI>
          <strong>Identificador del vendedor</strong> (Selling Partner ID) y el{" "}
          <strong>refresh token</strong> de autorización LWA, necesarios para autenticar las
          llamadas a SP-API en nombre del vendedor.
        </LI>
      </ul>
      <P>
        La Aplicación <strong>no</strong> accede, almacena ni procesa Información de
        Identificación Personal (PII) de compradores ni datos de pedidos/clientes. No se
        delega el acceso a PII a aplicaciones de terceros (TDR no utilizado).
      </P>

      <H>2. Finalidad del uso</H>
      <P>
        Los datos se usan exclusivamente para prestar el servicio de reprecio automático al
        propio vendedor: leer la competencia, calcular el precio según su estrategia y límites,
        aplicar el cambio en su catálogo de Amazon y mostrarle su actividad y analíticas. No se
        usan para ningún otro fin, ni se venden, alquilan ni comparten con terceros con fines
        publicitarios o comerciales.
      </P>

      <H>3. Cifrado</H>
      <ul className="mt-2 list-disc pl-5">
        <LI>
          <strong>En tránsito:</strong> todas las comunicaciones se realizan sobre HTTPS/TLS
          1.2 o superior.
        </LI>
        <LI>
          <strong>En reposo:</strong> el refresh token de Amazon se almacena{" "}
          <strong>cifrado con AES-256-GCM</strong>. La base de datos está gestionada por un
          proveedor con cifrado en reposo.
        </LI>
      </ul>

      <H>4. Control de acceso y aislamiento</H>
      <P>
        Cada vendedor solo puede acceder a sus propios datos: las consultas están segmentadas
        por cuenta de usuario autenticada (multi-tenant aislado). El acceso a los sistemas de
        producción está restringido al personal autorizado bajo el principio de mínimo
        privilegio. Las claves y secretos se gestionan como variables de entorno seguras y
        nunca se exponen en el cliente ni en el repositorio.
      </P>

      <H>5. Conservación y eliminación</H>
      <P>
        El refresh token y la configuración se conservan, cifrados, mientras la cuenta del
        vendedor esté activa y sea necesario para prestar el servicio. Al{" "}
        <strong>desconectar la cuenta de Amazon</strong> o solicitar la baja, las credenciales
        de Amazon dejan de utilizarse y se eliminan. El vendedor puede solicitar en cualquier
        momento la eliminación completa de sus datos escribiendo al contacto de abajo; se
        atenderá en un plazo máximo de 30 días. Los datos no se conservan más allá de lo
        necesario para la finalidad descrita ni más de lo exigido legalmente.
      </P>

      <H>6. Subencargados (sub-procesadores)</H>
      <P>
        La Aplicación se apoya en proveedores de infraestructura que actúan como encargados de
        tratamiento, bajo acuerdos de protección de datos:
      </P>
      <ul className="mt-2 list-disc pl-5">
        <LI>Alojamiento y ejecución de la aplicación (proveedor cloud).</LI>
        <LI>Base de datos PostgreSQL gestionada (con cifrado en reposo).</LI>
        <LI>Pasarela de pago para la suscripción (no recibe datos de Amazon).</LI>
      </ul>
      <P>
        Ningún subencargado recibe datos de Amazon salvo el alojamiento y la base de datos
        estrictamente necesarios para operar el servicio.
      </P>

      <H>7. Registro y detección</H>
      <P>
        Se registran los ciclos de reprecio y errores para diagnóstico y seguridad, sin incluir
        secretos en claro. Los tokens nunca se escriben en logs.
      </P>

      <H>8. Respuesta a incidentes</H>
      <P>
        Ante una sospecha de acceso no autorizado o brecha de seguridad que afecte a datos de
        Amazon, la Aplicación: (1) contiene y mitiga el incidente, (2) revoca y rota las
        credenciales afectadas, (3) notifica a Amazon en un plazo máximo de 24 horas desde su
        detección y a los vendedores afectados sin dilación indebida, y (4) documenta y aplica
        medidas correctoras.
      </P>

      <H>9. Cumplimiento</H>
      <P>
        La Aplicación cumple el Acceptable Use Policy y la Data Protection Policy del Amazon
        Selling Partner API, así como el Reglamento General de Protección de Datos (RGPD) y la
        normativa española aplicable.
      </P>

      <H>10. Contacto</H>
      <P>
        Para ejercer derechos sobre los datos, solicitar su eliminación o notificar incidencias
        de seguridad: <strong>orvexiaesp@gmail.com</strong>.
      </P>

      <p className="mt-10 text-xs text-white/40">
        Este documento puede actualizarse; la fecha de la última revisión
        figura al inicio.
      </p>
      </article>
    </main>
  );
}
