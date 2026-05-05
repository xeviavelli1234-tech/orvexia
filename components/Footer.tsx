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
          "radial-gradient(ellipse 1200px 600px at 50% 0%, rgba(99,102,241,0.10) 0%, transparent 60%), linear-gradient(180deg, #0A0B10 0%, #0F1117 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group" aria-label="Orvexia — Inicio">
              <span
                className="flex items-center justify-center w-9 h-9 rounded-xl text-white text-base font-black shrink-0"
                style={{
                  backgroundImage: "linear-gradient(135deg, #4F46E5 0%, #818CF8 50%, #10B981 100%)",
                  boxShadow: "0 6px 20px -8px rgba(79,70,229,0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                O
              </span>
              <span className="text-lg font-extrabold tracking-tight">Orvexia</span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Compara precios de electrodomésticos en las principales tiendas de España y ahorra en cada compra.
            </p>
          </div>

          {NAV.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6 pb-3">
          <p className="text-xs text-white/40 leading-relaxed text-center max-w-3xl mx-auto">
            Uso de enlaces de afiliados de Amazon, PcComponentes, Fnac y El Corte Inglés asociados a comisión por venta.
            Esto no supone ningún coste adicional para el comprador y nos ayuda a mantener el servicio gratuito.
          </p>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} Orvexia. Todos los derechos reservados.</p>
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
