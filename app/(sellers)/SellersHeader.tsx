"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const APP_PREFIXES = ["/sellers/facturacion", "/sellers/analiticas"];

export default function SellersHeader() {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);

  // Close menu on route change.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // El Centro de control es pantalla completa y trae su propia barra.
  if (pathname.startsWith("/sellers/productos")) return null;

  const isApp = APP_PREFIXES.some((p) => pathname.startsWith(p));

  const appLinks: { href: string; label: string }[] = [
    { href: "/sellers/productos", label: "Centro de control" },
    { href: "/sellers/facturacion", label: "Facturación" },
  ];

  const marketingLinks: { href: string; label: string }[] = [
    { href: "/sellers#como-funciona", label: "Cómo funciona" },
    { href: "/sellers#precios", label: "Precios" },
    { href: "/sellers#faq", label: "FAQ" },
    { href: "/sellers/facturacion", label: "Facturación" },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header className="border-b border-black/5 dark:border-white/10 bg-bg/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4">
          <Link
            href={isApp ? "/dashboard" : "/sellers"}
            className="font-bold text-base sm:text-lg tracking-tight whitespace-nowrap"
          >
            Orvexia <span className="text-[var(--brand-600)]">Repricer</span>
          </Link>

          {/* Desktop nav */}
          {isApp ? (
            <nav className="hidden md:flex items-center gap-5 text-sm">
              <Link
                href="/dashboard"
                className="text-fg/60 hover:text-fg transition-colors"
              >
                ← Dashboard
              </Link>
              {appLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`hover:text-[var(--brand-600)] transition-colors ${
                    isActive(l.href) ? "text-[var(--brand-600)] font-semibold" : ""
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          ) : (
            <nav className="hidden md:flex items-center gap-6 text-sm">
              {marketingLinks.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-[var(--brand-600)]">
                  {l.label}
                </Link>
              ))}
              <Link
                href="/login?next=/dashboard"
                className="rounded-lg bg-[var(--brand-600)] text-white px-4 py-2 font-semibold hover:bg-[var(--brand-700)] transition-colors"
              >
                Empezar gratis
              </Link>
            </nav>
          )}

          {/* Mobile actions: primary CTA + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {!isApp && (
              <Link
                href="/login?next=/dashboard"
                className="rounded-lg bg-[var(--brand-600)] text-white text-xs font-semibold px-3 h-9 inline-flex items-center hover:bg-[var(--brand-700)] transition-colors"
              >
                Empezar
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="sellers-mobile-menu"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              className="w-9 h-9 inline-flex flex-col items-center justify-center gap-1 rounded-lg border border-black/10 dark:border-white/15 bg-bg-elevated hover:bg-bg-subtle transition-colors"
            >
              <span className={`block w-4 h-0.5 bg-fg transition-all duration-200 ${open ? "translate-y-[5px] rotate-45" : ""}`} />
              <span className={`block w-4 h-0.5 bg-fg transition-all duration-200 ${open ? "opacity-0" : ""}`} />
              <span className={`block w-4 h-0.5 bg-fg transition-all duration-200 ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 top-[57px] z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="sellers-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="md:hidden fixed left-0 right-0 top-[57px] z-40 bg-bg-elevated border-t border-white/[0.06] border-b border-white/[0.06] shadow-xl max-h-[calc(100vh-57px)] overflow-y-auto animate-fade-in"
          >
            <nav className="flex flex-col py-2">
              {isApp ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-5 py-3.5 text-sm text-fg/70 hover:bg-bg-subtle hover:text-fg transition-colors border-b border-white/[0.04]"
                  >
                    ← Volver al Dashboard
                  </Link>
                  {appLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`px-5 py-3.5 text-sm font-semibold transition-colors border-b border-white/[0.04] ${
                        isActive(l.href)
                          ? "text-[var(--brand-600)] bg-[var(--brand-50)]/5"
                          : "text-fg hover:bg-bg-subtle"
                      }`}
                    >
                      {l.label}
                    </Link>
                  ))}
                </>
              ) : (
                <>
                  {marketingLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="px-5 py-3.5 text-sm font-semibold text-fg hover:bg-bg-subtle hover:text-[var(--brand-600)] transition-colors border-b border-white/[0.04]"
                    >
                      {l.label}
                    </Link>
                  ))}
                  <div className="px-5 py-3">
                    <Link
                      href="/login?next=/dashboard"
                      className="block w-full text-center rounded-lg bg-[var(--brand-600)] text-white px-4 py-3 font-semibold hover:bg-[var(--brand-700)] transition-colors"
                    >
                      Empezar gratis →
                    </Link>
                  </div>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
