"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExploreDropdown } from "@/components/ExploreDropdown";
import { CommunityDropdown } from "@/components/CommunityDropdown";
import { HeaderSearch } from "@/components/HeaderSearch";
import { useProfile } from "@/components/ProfileProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function MiniAvatar({ color, emoji, avatarUrl, name, size = 32 }: {
  color: string; emoji: string | null; avatarUrl?: string | null; name: string; size?: number;
}) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  if (avatarUrl) {
    return (
      <div
        className="rounded-full shrink-0 overflow-hidden bg-bg-muted"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: size, height: size, objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }
  return (
    <span
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none"
      style={{ width: size, height: size, background: color, fontSize: emoji ? size * 0.45 : size * 0.35 }}
      aria-hidden="true"
    >
      {emoji || initials}
    </span>
  );
}

function OrvexiaLogo() {
  return (
    <span className="flex items-center gap-2.5 select-none">
      <span
        aria-hidden
        className="relative flex items-center justify-center w-9 h-9 rounded-xl text-white text-base font-black"
        style={{
          backgroundImage: "linear-gradient(135deg, var(--brand-600) 0%, var(--brand-400) 50%, var(--accent-500) 100%)",
          boxShadow: "0 6px 20px -8px rgba(79, 70, 229, 0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        O
      </span>
      <span className="flex items-baseline text-[1.15rem] tracking-[-0.02em] leading-none">
        <span className="font-medium text-fg">Orv</span>
        <span className="font-extrabold text-gradient-brand">exia</span>
      </span>
    </span>
  );
}

const MOBILE_NAV = [
  { label: "Ofertas destacadas", href: "/ofertas-destacadas", icon: "🏷️" },
  { label: "Bajadas recientes", href: "/bajadas-recientes", icon: "📉" },
  { label: "Más populares", href: "/popularidad", icon: "⭐" },
  { label: "Recomendados", href: "/recomendados", icon: "✨" },
  { label: "Categorías", href: "/categorias", icon: "📋" },
  { label: "Comunidad", href: "/comunidad", icon: "🗨️" },
  { label: "Opiniones", href: "/opiniones", icon: "⭐" },
];

export function HeaderClient({
  isLoggedIn,
  logoutAction,
}: {
  isLoggedIn: boolean;
  logoutAction: () => Promise<void>;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const { profile, resetProfile } = useProfile();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen && !mobileSearchOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
      setMobileSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen, mobileSearchOpen]);

  useEffect(() => {
    if (!mobileOpen && !mobileSearchOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen, mobileSearchOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    function handler(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setProfileOpen(false);
      } else {
        if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
          setProfileOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [profileOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 h-16 flex items-center gap-4">

          <Link
            href="/"
            className="flex items-center rounded-xl transition-opacity duration-150 hover:opacity-80 shrink-0"
            aria-label="Orvexia — Inicio"
          >
            <OrvexiaLogo />
          </Link>

          <div className="hidden md:flex items-center gap-1 shrink-0">
            <ExploreDropdown />
          </div>

          <div className="hidden md:flex flex-1 max-w-md">
            <HeaderSearch />
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen((prev) => {
                const next = !prev;
                if (next) setMobileOpen(false);
                return next;
              });
            }}
            className="md:hidden ml-auto flex items-center justify-center w-10 h-10 rounded-lg bg-bg-subtle border border-border text-fg hover:border-border-strong transition-colors"
            aria-label={mobileSearchOpen ? "Cerrar buscador" : "Abrir buscador"}
            aria-expanded={mobileSearchOpen}
            aria-controls="mobile-header-search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </button>

          <div className="hidden md:flex items-center shrink-0">
            <CommunityDropdown />
          </div>

          <div className="hidden md:flex items-center shrink-0">
            <ThemeToggle />
          </div>

          <nav className="hidden md:flex items-center gap-2 shrink-0" aria-label="Cuenta de usuario">
            {isLoggedIn ? (
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  aria-label="Menú de perfil"
                  className="flex items-center rounded-full ring-2 ring-transparent hover:ring-brand-500/30 transition-all"
                >
                  {profile ? (
                    <MiniAvatar color={profile.avatarColor} emoji={profile.avatarEmoji} avatarUrl={profile.avatarUrl} name={profile.name} size={34} />
                  ) : (
                    <span className="w-[34px] h-[34px] rounded-full bg-bg-muted skeleton" />
                  )}
                </button>

                {profileOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+10px)] w-60 bg-bg-elevated rounded-2xl border border-border shadow-lg z-50 overflow-hidden fade-in"
                    role="menu"
                  >
                    {profile && (
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
                        <MiniAvatar color={profile.avatarColor} emoji={profile.avatarEmoji} avatarUrl={profile.avatarUrl} name={profile.name} size={36} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-fg truncate">{profile.name}</p>
                          <p className="text-[11px] text-fg-subtle">Sesión activa</p>
                        </div>
                      </div>
                    )}

                    <div className="py-1.5">
                      <Link
                        href="/dashboard"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                        Mi panel
                      </Link>
                      <Link
                        href="/perfil"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="8" r="4"/><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                        </svg>
                        Ver perfil
                      </Link>
                    </div>

                    <div className="border-t border-border-subtle p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          setConfirmLogoutOpen(true);
                        }}
                        className="w-full h-10 px-4 rounded-lg text-xs font-bold text-fg-muted hover:text-fg hover:bg-bg-subtle border border-border transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm px-4 h-10 inline-flex items-center rounded-lg font-semibold text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="text-sm px-5 h-10 inline-flex items-center rounded-lg font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-600/20 hover:shadow-md hover:shadow-brand-600/30 transition-all"
                >
                  Registrarse
                </Link>
              </>
            )}
          </nav>

          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-bg-subtle transition-colors"
            onClick={() => {
              setMobileOpen((o) => {
                const next = !o;
                if (next) setMobileSearchOpen(false);
                return next;
              });
            }}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú de navegación"}
          >
            <span className={`block w-5 h-0.5 bg-fg transition-all duration-200 ${mobileOpen ? "translate-y-[5px] rotate-45" : ""}`} />
            <span className={`block w-5 h-0.5 bg-fg mt-1.5 transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-fg mt-1.5 transition-all duration-200 ${mobileOpen ? "-translate-y-[11px] -rotate-45" : ""}`} />
          </button>
        </div>
      </header>

      {mobileSearchOpen && (
        <div id="mobile-header-search" className="md:hidden sticky top-16 z-30 bg-bg/95 backdrop-blur-xl border-b border-border-subtle px-3 py-2.5">
          <div className="max-w-7xl mx-auto w-full">
            <HeaderSearch onNavigate={() => setMobileSearchOpen(false)} />
          </div>
        </div>
      )}

      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-16 z-30 bg-fg-strong/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-menu"
            className="md:hidden fixed left-0 right-0 top-16 z-40 bg-bg-elevated border-t border-border-subtle shadow-xl overflow-y-auto max-h-[calc(100vh-4rem)] fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <nav className="p-4 space-y-1">
              <div className="flex items-center justify-between mb-2 px-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-subtle">Navegar</p>
                <ThemeToggle />
              </div>
              {MOBILE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-fg hover:bg-bg-subtle transition-colors"
                >
                  <span className="text-lg" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              ))}

              <div className="border-t border-border-subtle pt-4 mt-4 space-y-2">
                {isLoggedIn ? (
                  <>
                    {profile && (
                      <div className="flex items-center gap-3 px-4 py-2 mb-1">
                        <MiniAvatar color={profile.avatarColor} emoji={profile.avatarEmoji} avatarUrl={profile.avatarUrl} name={profile.name} size={36} />
                        <p className="text-sm font-bold text-fg">{profile.name}</p>
                      </div>
                    )}
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors"
                    >
                      <span className="text-lg" aria-hidden="true">📊</span>
                      Mi panel
                    </Link>
                    <Link
                      href="/perfil"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-fg-muted hover:bg-bg-subtle transition-colors"
                    >
                      <span className="text-lg" aria-hidden="true">👤</span>
                      Ver perfil
                    </Link>
                    <div className="px-4 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          setConfirmLogoutOpen(true);
                        }}
                        className="w-full py-3 rounded-xl text-sm font-bold text-fg-muted hover:text-fg border border-border hover:bg-bg-subtle transition-all"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-fg-muted hover:bg-bg-subtle transition-colors"
                    >
                      <span className="text-lg" aria-hidden="true">👤</span>
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-600/20 transition-all"
                    >
                      Crear cuenta gratis
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </>
      )}

      {confirmLogoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-fg-strong/60 backdrop-blur-md"
            onClick={() => setConfirmLogoutOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-xl border border-border bg-bg-elevated modal-card">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-bg-subtle border border-border flex items-center justify-center text-fg-muted">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-fg-subtle font-bold">Cerrar sesión</p>
                  <h3 className="text-lg font-bold text-fg leading-tight">¿Seguro que quieres salir?</h3>
                </div>
              </div>
              <p className="text-sm text-fg-muted leading-relaxed mb-6">
                Esto cerrará tu sesión en esta ventana. Podrás volver a entrar cuando quieras con tu email y contraseña.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmLogoutOpen(false)}
                  className="flex-1 h-11 rounded-lg border border-border text-sm font-semibold text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
                >
                  Seguir conectado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmLogoutOpen(false);
                    setProfileOpen(false);
                    setMobileOpen(false);
                    resetProfile();
                    logoutAction();
                  }}
                  className="flex-1 h-11 rounded-lg text-sm font-bold text-white bg-fg-strong hover:opacity-90 transition-all"
                >
                  Sí, cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
