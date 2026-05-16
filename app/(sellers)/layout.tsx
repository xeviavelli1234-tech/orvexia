import Link from "next/link";
import { REPRICER_ENABLED } from "@/lib/featureFlags";
import RepricerComingSoon from "@/components/RepricerComingSoon";

export const metadata = {
  title: "Orvexia Repricer · Reprecio automático para Amazon ES",
  description:
    "Reprecia tus productos en Amazon España automáticamente. Define precio mínimo y máximo por producto y nuestro motor reprecia cada 5 minutos.",
};

export default function SellersLayout({ children }: { children: React.ReactNode }) {
  if (!REPRICER_ENABLED) return <RepricerComingSoon />;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <header className="border-b border-black/5 dark:border-white/10 bg-bg/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
          <Link href="/sellers" className="font-bold text-lg tracking-tight">
            Orvexia <span className="text-[var(--brand-600)]">Repricer</span>
            <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400 px-2 py-0.5 rounded-full">
              Beta · En desarrollo
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/sellers#como-funciona" className="hover:text-[var(--brand-600)]">
              Cómo funciona
            </Link>
            <Link href="/sellers#precios" className="hover:text-[var(--brand-600)]">
              Precios
            </Link>
            <Link href="/sellers#faq" className="hover:text-[var(--brand-600)]">
              FAQ
            </Link>
            <Link href="/sellers/facturacion" className="hover:text-[var(--brand-600)]">
              Facturación
            </Link>
            <Link
              href="/login?next=/dashboard"
              className="rounded-lg bg-[var(--brand-600)] text-white px-4 py-2 font-semibold hover:bg-[var(--brand-700)] transition-colors"
            >
              Empezar gratis
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-black/5 dark:border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-5 py-10 text-sm text-fg/60 flex flex-wrap items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} Orvexia. Todos los derechos reservados.</div>
          <div className="flex gap-5">
            <Link href="/aviso-legal" className="hover:text-fg">
              Aviso legal
            </Link>
            <Link href="/politica-privacidad" className="hover:text-fg">
              Privacidad
            </Link>
            <Link href="/" className="hover:text-fg">
              Comparador
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
