"use client";

import { COOKIE_SETTINGS_EVENT } from "@/lib/cookie-consent";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_EVENT))}
      className="text-xs text-[#64748B] hover:text-white transition-colors"
    >
      Gestionar cookies
    </button>
  );
}
