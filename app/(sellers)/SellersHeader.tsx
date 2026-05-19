"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const APP_PREFIXES = ["/sellers/facturacion", "/sellers/analiticas"];

export default function SellersHeader() {
  const pathname = usePathname() || "";

  // El Centro de control es pantalla completa y trae su propia barra.
  if (pathname.startsWith("/sellers/productos")) return null;

  const isApp = APP_PREFIXES.some((p) => pathname.startsWith(p));

  if (isApp) {
    const link = (href: string, label: string) => {
      const active = pathname === href || pathname.startsWith(href + "/");
      return (
        <Link
          href={href}
          className={`hover:text-[var(--brand-600)] transition-colors ${
            active ? "text-[var(--brand-600)] font-semibold" : ""
          }`}
        >
          {label}
        </Link>
      );
    };
    return (
      <header className="border-b border-black/5 dark:border-white/10 bg-bg/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
          <Link href="/dashboard" className="font-bold text-lg tracking-tight">
            Orvexia <span className="text-[var(--brand-600)]">Repricer</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link
              href="/dashboard"
              className="text-fg/60 hover:text-fg transition-colors"
            >
              ← Dashboard
            </Link>
            {link("/sellers/productos", "Centro de control")}
            {link("/sellers/facturacion", "Facturación")}
          </nav>
        </div>
      </header>
    );
  }

  // Cabecera de marketing (landing /sellers y resto).
  return (
    <header className="border-b border-black/5 dark:border-white/10 bg-bg/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
        <Link href="/sellers" className="font-bold text-lg tracking-tight">
          Orvexia <span className="text-[var(--brand-600)]">Repricer</span>
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
  );
}
