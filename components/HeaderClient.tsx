"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExploreDropdown } from "@/components/ExploreDropdown";
import { CommunityDropdown } from "@/components/CommunityDropdown";
import { HeaderSearch } from "@/components/HeaderSearch";
import { useProfile } from "@/components/ProfileProvider";

function MiniAvatar({ color, emoji, avatarUrl, name, size = 32 }: {
  color: string; emoji: string | null; avatarUrl?: string | null; name: string; size?: number;
}) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  if (avatarUrl) {
    return (
      <div
        className="rounded-full shrink-0 overflow-hidden bg-[#E2E8F0]"
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
    <span className="flex items-center gap-2 select-none">
      <span
        className="flex items-center justify-center w-8 h-8 rounded-xl text-white text-sm font-black"
        style={{
          backgroundImage: "linear-gradient(135deg, #2563EB, #7C3AED)",
          boxShadow: "0 2px 10px rgba(37,99,235,0.4)",
        }}
      >
        O
      </span>
      <span className="flex items-baseline gap-0 text-[1.2rem] tracking-tight leading-none">
        <span className="font-light text-[#0F172A]">Orv</span>
        <span
          className="font-extrabold"
          style={{
            backgroundImage: "linear-gradient(90deg, #2563EB, #7C3AED)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          exia
        </span>
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const { profile, resetProfile } = useProfile();
  const profileRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  // Close profile dropdown on Escape or click-outside
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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 h-16 flex items-center gap-4">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center rounded-xl transition-opacity duration-150 hover:opacity-75 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2"
            aria-label="Orvexia — Inicio"
          >
            <OrvexiaLogo />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <ExploreDropdown />
          </div>

          {/* Search */}
          <div className="hidden sm:flex flex-1 max-w-md">
            <HeaderSearch />
          </div>

          {/* Mobile search shortcut */}
          <Link
            href="/buscar"
            className="sm:hidden ml-auto flex items-center justify-center w-10 h-10 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] hover:border-[#CBD5E1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            aria-label="Abrir buscador"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </Link>

          {/* Comunidad dropdown */}
          <div className="hidden md:flex items-center shrink-0">
            <CommunityDropdown />
          </div>

          {/* Desktop Auth */}
          <nav className="hidden sm:flex items-center gap-2 shrink-0" aria-label="Cuenta de usuario">
            {isLoggedIn ? (
              <>
                {/* Avatar dropdown */}
                <div ref={profileRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((o) => !o)}
                    aria-expanded={profileOpen}
                    aria-haspopup="true"
                    aria-label="Menú de perfil"
                    className="flex items-center rounded-full ring-2 ring-transparent hover:ring-[#2563EB]/40 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2"
                  >
                    {profile ? (
                      <MiniAvatar color={profile.avatarColor} emoji={profile.avatarEmoji} avatarUrl={profile.avatarUrl} name={profile.name} size={34} />
                    ) : (
                      <span className="w-[34px] h-[34px] rounded-full bg-[#E2E8F0] animate-pulse" />
                    )}
                  </button>

                  {profileOpen && (
                    <div
                      className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl z-50 overflow-hidden"
                      role="menu"
                    >
                      {/* User info */}
                      {profile && (
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F1F5F9]">
                          <MiniAvatar color={profile.avatarColor} emoji={profile.avatarEmoji} avatarUrl={profile.avatarUrl} name={profile.name} size={36} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-[#0F172A] truncate">{profile.name}</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="py-1.5">
                        <Link
                          href="/dashboard"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                          </svg>
                          Mi Panel
                        </Link>
                        <Link
                          href="/perfil"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#374151] hover:bg-[#F8FAFC] transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="8" r="4"/><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                          </svg>
                          Ver perfil
                        </Link>
                      </div>

                      <div className="border-t border-[#F1F5F9] px-4 py-4">
                        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-3 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EFF6FF] via-white to-[#EEF2FF] border border-[#E5E7EB] flex items-center justify-center text-[#2563EB]">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0-4-4m4 4H9" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 20v-1a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
                              </svg>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setProfileOpen(false);
                                setConfirmLogoutOpen(true);
                              }}
                              className="h-10 px-4 rounded-xl text-[12px] font-bold text-white shadow-md hover:shadow-lg transition-all"
                              style={{ backgroundImage: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                            >
                              Cerrar sesión
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm px-4 py-2 rounded-lg font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="text-sm px-5 py-2 rounded-full font-semibold text-white transition-all hover:opacity-90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                  style={{ backgroundImage: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
                >
                  Registrarse
                </Link>
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-[#F1F5F9] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú de navegación"}
          >
            <span className={`block w-5 h-0.5 bg-[#0F172A] transition-all duration-200 ${mobileOpen ? "translate-y-[5px] rotate-45" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[#0F172A] mt-1.5 transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[#0F172A] mt-1.5 transition-all duration-200 ${mobileOpen ? "-translate-y-[11px] -rotate-45" : ""}`} />
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <>
          <div
            className="sm:hidden fixed inset-0 top-16 z-30 bg-black/20"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-menu"
            className="sm:hidden fixed left-0 right-0 top-16 z-40 bg-white border-t border-[#E2E8F0] shadow-xl overflow-y-auto max-h-[calc(100vh-4rem)]"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <nav className="p-4 space-y-1">
              {MOBILE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                >
                  <span className="text-lg" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              ))}

              <div className="border-t border-[#E2E8F0] pt-4 mt-4 space-y-2">
                {isLoggedIn ? (
                  <>
                    {profile && (
                      <div className="flex items-center gap-3 px-4 py-2 mb-1">
                        <MiniAvatar color={profile.avatarColor} emoji={profile.avatarEmoji} avatarUrl={profile.avatarUrl} name={profile.name} size={36} />
                        <p className="text-[14px] font-bold text-[#0F172A]">{profile.name}</p>
                      </div>
                    )}
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                    >
                      <span className="text-lg" aria-hidden="true">📊</span>
                      Mi Panel
                    </Link>
                    <Link
                      href="/perfil"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9] transition-colors"
                    >
                      <span className="text-lg" aria-hidden="true">👤</span>
                      Ver perfil
                    </Link>
                    <div className="px-4">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          setConfirmLogoutOpen(true);
                        }}
                        className="w-full py-3 rounded-2xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#7C3AED]"
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
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9] transition-colors"
                    >
                      <span className="text-lg" aria-hidden="true">👤</span>
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold text-white"
                      style={{ backgroundImage: "linear-gradient(135deg, #2563EB, #7C3AED)" }}
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

      {/* Logout confirmation modal */}
      {confirmLogoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-md"
            onClick={() => setConfirmLogoutOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-[0_24px_80px_-32px_rgba(15,23,42,0.7)] border border-white/10 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#2563EB] text-white">
            <div className="absolute -top-20 -right-16 w-48 h-48 bg-white/10 blur-3xl pointer-events-none" />
            <div className="p-6 relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0-4-4m4 4H9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 20v-1a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[#93C5FD] font-semibold">Cerrar sesión</p>
                  <h3 className="text-xl font-bold leading-tight">¿Seguro que quieres salir?</h3>
                </div>
              </div>
              <p className="text-sm text-white/80 leading-relaxed mb-6">
                Esto cerrará tu sesión en esta ventana. Podrás volver a entrar cuando quieras con tu email y contraseña.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmLogoutOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-white/25 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
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
                  className="flex-1 h-11 rounded-xl text-sm font-bold text-[#0F172A] bg-white hover:shadow-lg transition-all"
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
