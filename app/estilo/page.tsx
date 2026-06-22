import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sistema de diseño",
  robots: { index: false, follow: false },
};

const RAMPS: { name: string; tones: { label: string; hex: string }[] }[] = [
  {
    name: "Brand · índigo",
    tones: [
      { label: "300", hex: "#A5B4FC" },
      { label: "400", hex: "#818CF8" },
      { label: "500", hex: "#6366F1" },
      { label: "600", hex: "#4F46E5" },
      { label: "700", hex: "#4338CA" },
    ],
  },
  {
    name: "Accent · esmeralda (ahorro)",
    tones: [
      { label: "100", hex: "#D1FAE5" },
      { label: "300", hex: "#6EE7B7" },
      { label: "500", hex: "#10B981" },
      { label: "600", hex: "#059669" },
      { label: "700", hex: "#047857" },
    ],
  },
  {
    name: "Hot · ofertas",
    tones: [
      { label: "100", hex: "#FFEDD5" },
      { label: "500", hex: "#F97316" },
      { label: "600", hex: "#EA580C" },
      { label: "700", hex: "#C2410C" },
    ],
  },
  {
    name: "Neutros · superficies",
    tones: [
      { label: "bg", hex: "#04050B" },
      { label: "elev", hex: "#0A0D1A" },
      { label: "subtle", hex: "#10131F" },
      { label: "muted", hex: "#161A28" },
      { label: "border", hex: "#1E2230" },
    ],
  },
];

export default function StyleguidePage() {
  return (
    <main className="min-h-screen bg-void-deep text-fg px-4 sm:px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Intro */}
        <header className="relative isolate overflow-hidden card card-pad !p-8 sm:!p-12">
          <div
            className="absolute inset-0 -z-10 opacity-60 bg-grid-cyber"
            style={{ maskImage: "radial-gradient(ellipse at 50% 0%, #000 40%, transparent 75%)" }}
          />
          <p className="eyebrow">▸ Orvexia · Design System</p>
          <h1 className="section-title mt-3">
            Un lenguaje visual <span className="text-gradient-neon">coherente</span>
          </h1>
          <p className="section-sub mt-4 max-w-2xl">
            Tokens, tipografía y componentes reutilizables construidos sobre la base actual. La idea:
            que cada página hable el mismo idioma — preciso, agradable e intuitivo — sin reinventar el
            estilo en cada pantalla.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="btn btn-primary btn-lg shine-on-hover">Empezar</button>
            <button className="btn btn-neon btn-lg">Ver componentes</button>
            <button className="btn btn-ghost btn-lg">Documentación</button>
          </div>
        </header>

        {/* Paleta */}
        <Section eyebrow="01 · Color" title="Paleta">
          <div className="grid gap-6 sm:grid-cols-2">
            {RAMPS.map((ramp) => (
              <div key={ramp.name}>
                <div className="text-sm font-semibold text-fg-muted mb-2">{ramp.name}</div>
                <div className="flex overflow-hidden rounded-xl border border-border">
                  {ramp.tones.map((t) => (
                    <div key={t.label} className="flex-1 group" title={t.hex}>
                      <div className="h-16" style={{ background: t.hex }} />
                      <div className="px-1.5 py-1 text-center bg-bg-elevated">
                        <div className="text-[10px] font-mono-ui text-fg-subtle">{t.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Tipografía */}
        <Section eyebrow="02 · Texto" title="Tipografía">
          <div className="card card-pad space-y-4">
            <p className="eyebrow">Eyebrow · etiqueta mono</p>
            <p className="text-5xl font-extrabold tracking-tight">Display 5xl</p>
            <p className="text-3xl font-bold tracking-tight">Título 3xl</p>
            <p className="text-xl font-semibold">Subtítulo xl</p>
            <p className="text-base text-fg-muted leading-relaxed max-w-2xl">
              Cuerpo base — el texto largo usa <span className="text-fg">--fg</span> y secundario{" "}
              <span className="text-fg-muted">--fg-muted</span> para una jerarquía clara y legible
              incluso sobre fondos oscuros con halos.
            </p>
            <p className="text-sm text-fg-subtle">Texto pequeño / metadatos · fg-subtle</p>
            <p className="font-mono-ui text-sm text-accent-300">precio · 1.299,00 € · tabular-nums</p>
          </div>
        </Section>

        {/* Botones */}
        <Section eyebrow="03 · Acción" title="Botones">
          <div className="card card-pad space-y-6">
            <Row label="Variantes">
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-accent">Accent</button>
              <button className="btn btn-neon">Neon</button>
              <button className="btn btn-ghost">Ghost</button>
            </Row>
            <Row label="Tamaños">
              <button className="btn btn-primary btn-sm">Small</button>
              <button className="btn btn-primary">Default</button>
              <button className="btn btn-primary btn-lg">Large</button>
            </Row>
            <Row label="Estados">
              <button className="btn btn-primary shine-on-hover">Con brillo</button>
              <button className="btn btn-accent" disabled>
                Desactivado
              </button>
              <button className="btn btn-ghost glow-on-hover">Glow al hover</button>
            </Row>
          </div>
        </Section>

        {/* Tarjetas */}
        <Section eyebrow="04 · Contenedores" title="Tarjetas y superficies">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="card card-pad card-hover">
              <p className="eyebrow">.card</p>
              <p className="mt-2 font-semibold">Superficie base</p>
              <p className="mt-1 text-sm text-fg-muted">Elevada, con borde y sombra. Pasa el ratón.</p>
            </div>
            <div className="card-glass card-pad">
              <p className="eyebrow">.card-glass</p>
              <p className="mt-2 font-semibold">Cristal</p>
              <p className="mt-1 text-sm text-fg-muted">Blur translúcido para overlays sobre hero.</p>
            </div>
            <div className="relative card card-pad hud-corners text-accent-300">
              <span className="hud-tl" />
              <span className="hud-tr" />
              <span className="hud-bl" />
              <span className="hud-br" />
              <p className="eyebrow !text-accent-300">.hud-corners</p>
              <p className="mt-2 font-semibold text-fg">Marco HUD</p>
              <p className="mt-1 text-sm text-fg-muted">Esquinas tipo interfaz futurista.</p>
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section eyebrow="05 · Señales" title="Badges y chips">
          <div className="card card-pad flex flex-wrap gap-3">
            <span className="badge badge-brand">Nuevo</span>
            <span className="badge badge-accent">-32% ahorro</span>
            <span className="badge badge-hot">🔥 Oferta</span>
            <span className="badge badge-danger">Sin stock</span>
            <span className="badge badge-muted">Neutro</span>
            <span className="badge badge-accent">
              <span className="live-dot" style={{ width: 7, height: 7 }} /> En vivo
            </span>
          </div>
        </Section>

        {/* Formularios */}
        <Section eyebrow="06 · Entrada" title="Formularios">
          <div className="card card-pad grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Buscar producto</label>
              <input className="input" placeholder="Lavadora 9 kg…" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" placeholder="tu@correo.com" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notas</label>
              <textarea className="input" rows={3} placeholder="Escribe aquí…" />
            </div>
          </div>
        </Section>

        {/* Detalles */}
        <Section eyebrow="07 · Carácter" title="Detalles guays">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="neon-border card-pad rounded-2xl">
              <p className="eyebrow">.neon-border</p>
              <p className="mt-2 font-semibold">Borde neón animado</p>
              <p className="mt-1 text-sm text-fg-muted">Gradiente en movimiento alrededor del marco.</p>
            </div>
            <div className="card card-pad overflow-hidden">
              <p className="eyebrow">.ticker</p>
              <p className="mt-2 mb-3 font-semibold">Marquesina de datos</p>
              <div className="overflow-hidden">
                <div className="ticker-track flex gap-6 whitespace-nowrap font-mono-ui text-sm text-accent-300">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <span key={i} className="flex gap-6">
                      <span>LAVADORA −18%</span>
                      <span className="text-brand-300">FRIGORÍFICO −24%</span>
                      <span className="text-hot-500">TV OLED −31%</span>
                      <span>LAVAVAJILLAS −12%</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="card card-pad">
              <p className="eyebrow">.text-glow</p>
              <p className="mt-3 text-3xl font-extrabold text-glow-cyan text-accent-300">1.299 €</p>
              <p className="mt-1 text-sm text-fg-muted">Resplandor para cifras destacadas.</p>
            </div>
            <div className="card card-pad card-hover shine-on-hover">
              <p className="eyebrow">.shine-on-hover</p>
              <p className="mt-2 font-semibold">Barrido de luz</p>
              <p className="mt-1 text-sm text-fg-muted">Pasa el ratón para ver el reflejo cruzar.</p>
            </div>
          </div>
        </Section>

        <footer className="pt-6 border-t border-border text-sm text-fg-subtle">
          Sistema de diseño de Orvexia · página de referencia interna (no indexada). Desde aquí
          propagamos el lenguaje al resto de la web, una superficie a la vez.
        </footer>
      </div>
    </main>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="section-title mt-2 text-3xl sm:text-4xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="w-24 shrink-0 text-xs font-mono-ui uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
