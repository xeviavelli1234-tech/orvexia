import Link from "next/link";

const NAV = [
  {
    title: "Explorar",
    links: [
      { label: "Ofertas destacadas", href: "/ofertas-destacadas" },
      { label: "Bajadas recientes", href: "/bajadas-recientes" },
      { label: "Más populares", href: "/popularidad" },
      { label: "Recomendados", href: "/recomendados" },
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
  { label: "Mi Panel", href: "/dashboard" },
      { label: "Iniciar sesión", href: "/login" },
      { label: "Crear cuenta", href: "/register" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white mt-auto" role="contentinfo">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group" aria-label="Orvexia - Inicio">
              <span
                className="flex items-center justify-center w-8 h-8 rounded-xl text-white text-sm font-black shrink-0"
                style={{ backgroundImage: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
              >
                O
              </span>
              <span className="text-lg font-bold text-white">Orvexia</span>
            </Link>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Compara precios de electrodomésticos en las principales tiendas de España y ahorra en cada compra.
            </p>
          </div>

          {/* Nav columns */}
          {NAV.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-xs font-bold uppercase tracking-widest text-[#64748B] mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#94A3B8] hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-t border-[#1E293B] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#475569]">
            © {new Date().getFullYear()} Orvexia. Todos los derechos reservados.
          </p>
          <p className="text-xs text-[#475569]">
            Los precios se actualizan periódicamente. Verifica siempre el precio final en la tienda.
          </p>
        </div>
      </div>
    </footer>
  );
}
