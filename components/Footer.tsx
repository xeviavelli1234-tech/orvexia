import Link from "next/link";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

const NAV = [
  {
    title: "Explorar",
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
    links: [
      { label: "Mi panel", href: "/dashboard" },
      { label: "Iniciar sesión", href: "/login" },
      { label: "Crear cuenta", href: "/register" },
    ],
  },
  {
    title: "Orvexia",
    links: [
      { label: "Sobre nosotros", href: "/sobre-nosotros" },
      { label: "Repricer para Amazon", href: "/repricer" },
      { label: "Centro de ayuda", href: "/ayuda" },
      { label: "Aviso legal", href: "/aviso-legal" },
      { label: "Términos del Repricer", href: "/terminos" },
      { label: "Política de privacidad", href: "/politica-privacidad" },
      { label: "Política de cookies", href: "/politica-cookies" },
      { label: "Datos Amazon (SP-API)", href: "/politica-datos-amazon" },
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
          "radial-gradient(ellipse 1200px 600px at 50% 0%, rgba(129,140,248,0.10) 0%, transparent 60%), linear-gradient(180deg, #070614 0%, #050310 100%)",
      }}
    >
      {/* Hairline violeta superior */}
      <span aria-hidden className="absolute left-0 right-0 top-0 h-px" style={{
        background: "linear-gradient(90deg, transparent, rgba(129,140,248,0.5) 50%, transparent)",
      }} />

      {/* Línea de estado, limpia y discreta */}
      <div className="relative border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-center sm:justify-start gap-2 text-[11px] text-white/40">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-300" />
          </span>
          Precios sincronizados varias veces al día con las principales tiendas de España
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group" aria-label="Orvexia — Inicio">
              <span
                className="relative flex items-center justify-center w-9 h-9 rounded-xl text-white text-base font-black shrink-0 overflow-hidden"
                style={{
                  backgroundImage: "linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%)",
                  boxShadow: "0 0 24px -4px rgba(129,140,248,0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                <span className="relative">O</span>
              </span>
              <span className="text-lg font-extrabold tracking-tight">Orvexia</span>
            </Link>
            <p className="text-sm text-white/55 leading-relaxed max-w-xs mb-4">
              Compara precios de electrodomésticos en las principales tiendas de España y ahorra en cada compra.
            </p>
            <p className="text-xs text-white/45 mb-4">
              <a href="mailto:orvexiaesp@gmail.com" className="font-semibold text-brand-300 hover:text-brand-200 transition-colors">
                orvexiaesp@gmail.com
              </a>
            </p>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 max-w-xs">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300 mb-1">Vendedor en Amazon</p>
              <p className="text-xs text-white/70 leading-relaxed">
                También vendemos en Amazon España como{" "}
                <span className="font-semibold text-white">OrvexiaShop</span>.
              </p>
            </div>
          </div>

          {NAV.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300 mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
                    >
                      <span aria-hidden className="text-white/20 group-hover:text-brand-300 transition-colors">›</span>
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
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Orvexia · Todos los derechos reservados
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
