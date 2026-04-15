"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  COOKIE_SETTINGS_EVENT,
  type CookieConsent,
  createCookieConsent,
  saveCookieConsent,
} from "@/lib/cookie-consent";

type CookieConsentBannerProps = {
  initialConsent: CookieConsent | null;
};

export function CookieConsentBanner({ initialConsent }: CookieConsentBannerProps) {
  const [showBanner, setShowBanner] = useState(initialConsent === null);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(initialConsent?.analytics ?? false);
  const [advertising, setAdvertising] = useState(initialConsent?.advertising ?? false);

  useEffect(() => {
    const onOpenSettings = () => setShowSettings(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, onOpenSettings);
    return () => {
      window.removeEventListener(COOKIE_SETTINGS_EVENT, onOpenSettings);
    };
  }, []);

  const acceptAll = () => {
    saveCookieConsent(createCookieConsent({ analytics: true, advertising: true }));
    setAnalytics(true);
    setAdvertising(true);
    setShowBanner(false);
    setShowSettings(false);
  };

  const rejectOptional = () => {
    saveCookieConsent(createCookieConsent({ analytics: false, advertising: false }));
    setAnalytics(false);
    setAdvertising(false);
    setShowBanner(false);
    setShowSettings(false);
  };

  const saveSettings = () => {
    saveCookieConsent(createCookieConsent({ analytics, advertising }));
    setShowBanner(false);
    setShowSettings(false);
  };

  return (
    <>
      {showBanner ? (
        <section
          aria-live="polite"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-4xl rounded-2xl border border-[#CBD5E1] bg-white p-5 shadow-2xl sm:inset-x-6 sm:p-6"
        >
          <p className="text-base font-semibold text-[#0F172A]">Tu privacidad, bajo control</p>
          <p className="mt-2 text-sm leading-relaxed text-[#334155]">
            Usamos cookies tecnicas para el funcionamiento del sitio y, si aceptas, cookies de
            analitica y publicidad para mejorar contenidos y medir resultados.
          </p>
          <p className="mt-2 text-xs text-[#475569]">
            Mas informacion en la{" "}
            <Link href="/politica-cookies" className="font-semibold text-[#2563EB] hover:underline">
              politica de cookies
            </Link>
            .
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={acceptAll}
              className="inline-flex items-center justify-center rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E40AF]"
            >
              Aceptar todas
            </button>
            <button
              type="button"
              onClick={rejectOptional}
              className="inline-flex items-center justify-center rounded-xl border border-[#CBD5E1] px-4 py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              Rechazar opcionales
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#F1F5F9]"
            >
              Configurar
            </button>
          </div>
        </section>
      ) : null}

      {showSettings ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/40 p-3 sm:items-center sm:justify-center sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Configuracion de cookies"
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-[#0F172A]">Configurar cookies</h2>
            <p className="mt-2 text-sm text-[#334155]">
              Puedes aceptar o rechazar cookies no necesarias en cualquier momento.
            </p>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-[#E2E8F0] p-4">
                <p className="text-sm font-semibold text-[#0F172A]">Tecnicas (necesarias)</p>
                <p className="mt-1 text-xs text-[#475569]">
                  Imprescindibles para seguridad, sesion y funciones basicas.
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
                  Siempre activas
                </p>
              </div>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#E2E8F0] p-4">
                <span>
                  <span className="block text-sm font-semibold text-[#0F172A]">Analitica</span>
                  <span className="mt-1 block text-xs text-[#475569]">
                    Mide el uso para mejorar busquedas, categorias y rendimiento.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#2563EB]"
                />
              </label>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#E2E8F0] p-4">
                <span>
                  <span className="block text-sm font-semibold text-[#0F172A]">Publicidad</span>
                  <span className="mt-1 block text-xs text-[#475569]">
                    Personaliza anuncios y mide conversiones en plataformas externas.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={advertising}
                  onChange={(event) => setAdvertising(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#2563EB]"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={saveSettings}
                className="inline-flex items-center justify-center rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E40AF]"
              >
                Guardar configuracion
              </button>
              <button
                type="button"
                onClick={rejectOptional}
                className="inline-flex items-center justify-center rounded-xl border border-[#CBD5E1] px-4 py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                Rechazar opcionales
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="inline-flex items-center justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#F1F5F9]"
              >
                Cerrar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
