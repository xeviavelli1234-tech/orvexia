import Link from "next/link";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

const NAV = [
  {
    title: "Explorar",
    code: "/explore",
    links: [
      { label: "Ofertas destacadas", href: "/ofertas-destacadas" },
      { label: "Bajadas recientes", href: "/bajadas-recientes" },
      { label: "Más populares", href: "/popularidad" },
      { label: "Recomendados", href: "/recomendados" },
      { label: "Guías de compra", href: "/guias" },
    ],
  },
  {
    title: "Categorías",
    code: "/catalog",
    links: [
      { label: "Televisores", href: "/categorias/televisores" },
      { label: "Lavadoras", href: "/categorias/lavadoras" },
      { label: "Frigoríficos", href: "/categorias/frigorificos" },
      { label: "Lavavajillas", href: "/categorias/lavavajillas" },
      { label: "Ver todas", href: "/categorias" },
    ],
  },
  {
    title: "Mi cuenta",
    code: "/user",
    links: [
      { label: "Mi panel", href: "/dashboard" },
      { label: "Iniciar sesión", href: "/login" },
      { label: "Crear cuenta", href: "/register" },
    ],
  },
  {
    title: "Orvexia",
    code: "/system",
    links: [
      { label: "Sobre nosotros", href: "/sobre-nosotros" },
      { label: "Aviso legal", href: "/aviso-legal" },
      { label: "Política de privacidad", href: "/politica-privacidad" },
      { label: "Política de cookies", href: "/politica-cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      className="mt-auto relative overflow-hidden text-white"
      role="contentinfo"
      style={{
        background:
          "radial-gradient(ellipse 1200px 600px at 50% 0%, rgba(94,234,212,0.10) 0%, transparent 60%), radial-gradient(ellipse 900px 500px at 100% 100%, rgba(168,85,247,0.10) 0%, transparent 65%), linear-gradient(180deg, #06070F 0%, #03040A 100%)",
      }}
    >
      {/* Top neon hairline */}
      <span aria-hidden className="absolute left-0 right-0 top-0 h-px" style={{
        background: "linear-gradient(90deg, transparent, rgba(94,234,212,0.4) 20%, rgba(129,140,248,0.5) 50%, rgba(240,171,252,0.4) 80%, transparent)",
      }} />

      {/* Status ribbon */}
      <div className="relative border-b border-white/[0.06] bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between font-mono-ui text-[10px] uppercase tracking-wider">
          <div className="flex items-center gap-4 text-white/45">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span>sys · online</span>
            </span>
            <span className="hidden sm:inline text-white/25">·</span>
            <span className="hidden sm:inline">tx <span className="text-cyan-300">∞</span> precios/día</span>
            <span className="hidden md:inline text-white/25">·</span>
            <span className="hidden md:inline">node <span className="text-fuchsia-300">eu-west-1</span></span>
          </div>
          <div className="flex items-center gap-3 text-white/35">
            <span>ssl <span className="text-emerald-300">✓</span></span>
            <span className="text-white/25">·</span>
            <span>v3.1.0</span>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group" aria-label="Orvexia — Inicio">
              <span
                className="relative flex items-center justify-center w-9 h-9 rounded-xl text-white text-base font-black shrink-0 overflow-hidden"
                style={{
                  backgroundImage: "linear-gradient(135deg, #4F46E5 0%, #818CF8 35%, #5EEAD4 70%, #A3E635 100%)",
                  boxShadow: "0 0 24px -4px rgba(94,234,212,0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                <span className="absolute inset-0 opacity-30" style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
                  backgroundSize: "6px 6px",
                }} />
                <span className="relative">O</span>
              </span>
              <span className="text-lg font-extrabold tracking-tight">Orvexia</span>
            </Link>
            <p className="text-sm text-white/55 leading-relaxed max-w-xs mb-4">
              Compara precios de electrodomésticos en las principales tiendas de España y ahorra en cada compra.
            </p>
            <div className="font-mono-ui text-[10px] text-white/35 space-y-0.5">
              <div>▸ <span className="text-cyan-300/80">orvexiaesp@gmail.com</span></div>
              <div>▸ build <span className="text-white/55">stable</span></div>
            </div>
          </div>

          {NAV.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 mb-1">▸ {col.code}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/85 mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
                    >
                      <span aria-hidden className="text-white/20 group-hover:text-cyan-300 transition-colors">›</span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-t border-white/[0.08] pt-6 pb-3">
          <p className="text-xs text-white/40 leading-relaxed text-center max-w-3xl mx-auto">
            Uso de enlaces de afiliados de Amazon, PcComponentes, Fnac y El Corte Inglés asociados a comisión por venta.
            Esto no supone ningún coste adicional para el comprador y nos ayuda a mantener el servicio gratuito.
          </p>
        </div>

        <div className="border-t border-white/[0.08] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono-ui text-[10px] uppercase tracking-wider text-white/40">
            © {new Date().getFullYear()} orvexia · all rights reserved
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <CookieSettingsButton />
            <p className="text-xs text-white/40">
              Los precios se actualizan periódicamente. Verifica siempre el precio final en la tienda.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
