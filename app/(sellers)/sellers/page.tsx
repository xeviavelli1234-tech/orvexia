import Link from "next/link";

export default function SellersLandingPage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="px-5 pt-20 pb-24 text-center max-w-4xl mx-auto">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[var(--brand-600)] bg-[var(--brand-50)] px-3 py-1 rounded-full mb-6">
          Para vendedores de Amazon España
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
          Gana más en Amazon sin{" "}
          <span className="text-[var(--brand-600)]">vigilar tus precios</span>.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-fg/70 max-w-2xl mx-auto">
          Define un mínimo y un máximo por producto. Nuestro motor reprecia
          automáticamente cada 5 minutos para que ganes la Buy Box sin
          regalar margen.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login?next=/sellers/dashboard"
            className="rounded-lg bg-[var(--brand-600)] text-white px-7 py-3.5 font-semibold hover:bg-[var(--brand-700)] transition-colors shadow-sm"
          >
            Empezar 14 días gratis
          </Link>
          <Link
            href="#como-funciona"
            className="rounded-lg border border-fg/15 px-7 py-3.5 font-semibold hover:bg-fg/5 transition-colors"
          >
            Ver cómo funciona
          </Link>
        </div>
        <p className="mt-5 text-xs text-fg/50">
          Sin tarjeta. Sin permanencia. Solo Amazon ES.
        </p>
      </section>

      {/* ── Benefits ──────────────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-8">
          <Benefit
            title="Reprecia cada 5 minutos"
            body="En cuanto un competidor baja el precio, tu listing se ajusta automáticamente — siempre dentro del rango que tú decides."
          />
          <Benefit
            title="Min y max bajo tu control"
            body="Tú fijas el precio mínimo (tu margen mínimo aceptable) y el máximo. El motor jamás se sale de esos límites."
          />
          <Benefit
            title="Setup en 2 minutos"
            body="Conecta tu cuenta de Amazon Seller con un clic, importa tus productos y define los rangos. Listo."
          />
        </div>
      </section>

      {/* ── Cómo funciona ─────────────────────────────────────────────────── */}
      <section id="como-funciona" className="px-5 py-20 bg-fg/[0.02]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-center">
            Cómo funciona
          </h2>
          <ol className="mt-12 space-y-8">
            <Step
              n={1}
              title="Conecta tu cuenta de Amazon Seller"
              body="OAuth oficial de Amazon SP-API. No guardamos tu contraseña — usamos el sistema seguro de Amazon."
            />
            <Step
              n={2}
              title="Define precio mínimo y máximo por producto"
              body="Importamos tus listings automáticamente. Por cada producto pones tu suelo (margen mínimo) y techo (precio de catálogo)."
            />
            <Step
              n={3}
              title="El motor reprecia cada 5 minutos"
              body="Cuando un competidor baja, te ajustamos 0,01 € por debajo (sin pasarte del mínimo). Cuando suben, vuelves a tu máximo."
            />
            <Step
              n={4}
              title="Tú ves los cambios y los pausas cuando quieras"
              body="Historial completo de cada cambio de precio. Pausa un producto con un clic."
            />
          </ol>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="precios" className="px-5 py-20 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight text-center">
          Un precio. Sin sorpresas.
        </h2>
        <p className="mt-3 text-center text-fg/70">
          Empieza gratis 14 días. Sin tarjeta. Cancela cuando quieras.
        </p>

        <div className="mt-12 rounded-2xl border border-[var(--brand-200)] bg-bg p-8 shadow-sm">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight">29 €</span>
            <span className="text-fg/60">/mes</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm">
            <Check>Productos ilimitados</Check>
            <Check>Reprecio cada 5 minutos</Check>
            <Check>Historial completo de cambios</Check>
            <Check>Amazon España (más marketplaces próximamente)</Check>
            <Check>Soporte por email</Check>
          </ul>
          <Link
            href="/login?next=/sellers/dashboard"
            className="mt-8 block text-center rounded-lg bg-[var(--brand-600)] text-white px-6 py-3 font-semibold hover:bg-[var(--brand-700)] transition-colors"
          >
            Empezar 14 días gratis
          </Link>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="px-5 py-20 bg-fg/[0.02]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-center">
            Preguntas frecuentes
          </h2>
          <div className="mt-10 space-y-6">
            <Faq q="¿Es seguro conectar mi cuenta de Amazon?">
              Sí. Usamos OAuth oficial de Amazon (Login with Amazon + SP-API). No
              vemos ni guardamos tu contraseña. Puedes revocar el acceso desde
              tu cuenta de Seller Central en cualquier momento.
            </Faq>
            <Faq q="¿Qué pasa si un competidor desaparece?">
              Si no hay competencia, tu precio sube automáticamente hasta el
              máximo que tú has definido. Así maximizas el margen cuando estás
              solo en la oferta.
            </Faq>
            <Faq q="¿Necesito cuenta Profesional de Amazon?">
              Sí. Amazon solo permite cambios de precio automatizados a sellers
              con plan Profesional (39 €/mes pagados a Amazon).
            </Faq>
            <Faq q="¿Puedo pausar un producto sin borrarlo?">
              Sí. Cada producto tiene un toggle para activar/desactivar el
              reprecio, conservando los rangos min/max para reactivarlo después.
            </Faq>
            <Faq q="¿Cobráis comisión por venta?">
              No. Solo la cuota mensual fija. Las ventas que generes son
              íntegramente tuyas.
            </Faq>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="px-5 py-24 text-center max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Empieza a ganar la Buy Box hoy
        </h2>
        <p className="mt-4 text-fg/70">
          14 días gratis. Sin tarjeta. Configuración en 2 minutos.
        </p>
        <Link
          href="/login?next=/sellers/dashboard"
          className="mt-8 inline-block rounded-lg bg-[var(--brand-600)] text-white px-8 py-4 font-semibold hover:bg-[var(--brand-700)] transition-colors shadow-sm"
        >
          Empezar gratis
        </Link>
      </section>
    </>
  );
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="mt-2 text-fg/70 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-5">
      <div className="flex-none w-9 h-9 rounded-full bg-[var(--brand-600)] text-white font-bold flex items-center justify-center">
        {n}
      </div>
      <div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="mt-1 text-fg/70">{body}</p>
      </div>
    </li>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg
        className="flex-none w-5 h-5 text-[var(--accent-600)] mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.585l7.296-7.296a1 1 0 011.408 0z"
          clipRule="evenodd"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-fg/10 bg-bg px-5 py-4">
      <summary className="cursor-pointer font-semibold flex items-center justify-between list-none">
        {q}
        <svg
          className="w-5 h-5 transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <p className="mt-3 text-fg/70 text-sm leading-relaxed">{children}</p>
    </details>
  );
}
