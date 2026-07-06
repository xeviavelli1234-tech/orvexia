# Guía de estilo v4 — «violeta» (toda la web salvo la herramienta Repricer)

Referencia canónica: `app/page.tsx` (home rediseñada) y `app/_components/SectionPrimitives.tsx`.
Utilidades CSS nuevas en `app/globals.css` (bloques «Home v4» y siguientes).

## Identidad

- **Un solo acento: violeta** (`brand-*`: #818CF8 / #6366F1 / #A5B4FC). Sin cyan, lime ni fuchsia decorativos.
  - Verde esmeralda SOLO para estados de éxito/«Disponible»/ahorro-stock.
  - `hot-*`/ámbar solo para descuentos dentro de tarjetas de producto.
- Fondo de página: `bg-[#050310]` (o `bg-void-deep` existente). Superficies: `bg-white/[0.02–0.04]` con `border-white/[0.07]`.
- Paneles destacados: gradiente `linear-gradient(160deg,#100d26 0%,#0a0819 55%,#070614 100%)` + `border-brand-400/15` + `rounded-3xl` + `noise-overlay` opcional.
- Halos: radial-gradient violeta `rgba(129,140,248,0.15–0.25)` con `halo-breathe`.

## Qué ELIMINAR del estilo viejo (cyberpunk/HUD)

- Kickers mono tipo `▸ /leaderboard · ...`, códigos `SRV-01`/`MOD/02`, `[SYNC ⇄]`, barras «SYS · ONLINE», build ids, `v3.1.0`.
- `font-mono-ui` en labels decorativos (para números tabulares usar `.tabular`).
- `HudFrame`/`hud-corners`, tickers (`ticker-track`), `particle`, `data-stream`, `scanline-drift`, `beam-sweep`, `flicker`.
- `text-gradient-neon`, `text-glow-cyan`; degradados multicolor cyan→lime→fuchsia.
- `bg-grid-cyber` como protagonista (se tolera `bg-grid-cyber-fine` a opacidad ≤40 con mask radial).
- Acordeones/headers con estética «terminal» (`orvexia@user · ~/dashboard`, `$ orvexia init`).

## Componentes canónicos

- **Cabecera de sección**: `SectionHead` / `SectionChip` / `AudienceLabel` de `app/_components/SectionPrimitives.tsx`.
- **Botón primario**: `rounded-full bg-brand-500 hover:bg-brand-400 text-white font-bold h-12 px-7` + `shine-on-hover` + `active:scale-[0.97]` + sombra `0 8px 36px -6px rgba(99,102,241,0.85)`.
- **Botón secundario**: `rounded-full border border-white/12 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06] text-white/80 hover:text-white h-12 px-7 font-semibold`.
- **Chips/badges**: `rounded-full border border-brand-400/25 bg-brand-400/10 text-brand-200 text-[10–11px] font-semibold` (esmeralda para éxito).
- **Cards**: `rounded-2xl border-white/[0.07]` + hover `-translate-y-1`, `border-brand-400/30–40`, sombra violeta `0 24px 60px -24px rgba(99,102,241,0.55)`; `shine-on-hover` opcional.
- **Inputs/buscadores destacados**: wrapper `border-glow-violet rounded-2xl p-px` + interior `rounded-[15px] bg-[#0a0818]/95`.
- **FAQ/acordeón**: patrón de la home (`details` + icono «+» que rota 45°, `open:border-brand-400/30`).
- **Aparición al scroll**: clase `reveal` en cabeceras/paneles/cards (CSS-only, progresivo).
- **Separadores**: `divider-glow` en vez de `border-t` plano entre secciones.
- H1/H2: extrabold, `letter-spacing:-0.03/-0.04em`, `textWrap:'balance'`; segunda línea con `text-shimmer-violet` si es un hero.

## Reglas duras

1. NO tocar: `app/(sellers)/**`, `app/dashboard/repricer/**` (la herramienta conserva su identidad esmeralda), `lib/**`, rutas `app/api/**`.
   La landing pública `app/repricer/page.tsx` SÍ está migrada a v4 (jul 2026).
2. Mantener TODA la funcionalidad: props, lógica, hooks, aria-*, metadata/SEO, ids de anclas, textos (salvo labels puramente decorativos del estilo viejo).
3. No renombrar exports ni mover ficheros.
4. Cambios solo de presentación (className/estilos/estructura JSX visual).
