export const COOKIE_CONSENT_KEY = "orvexia_cookie_consent_v1";
export const COOKIE_CONSENT_COOKIE = "orvexia_cookie_consent";
export const COOKIE_CONSENT_EVENT = "orvexia-cookie-consent-change";
export const COOKIE_SETTINGS_EVENT = "orvexia-open-cookie-settings";

export type CookieConsent = {
  version: 1;
  necessary: true;
  analytics: boolean;
  advertising: boolean;
  updatedAt: string;
};

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (
      parsed.version !== 1 ||
      parsed.necessary !== true ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.advertising !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }
    return parsed as CookieConsent;
  } catch {
    return null;
  }
}

export function parseCookieConsent(raw: string | null | undefined): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CookieConsent>;
    if (
      parsed.version !== 1 ||
      parsed.necessary !== true ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.advertising !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }
    return parsed as CookieConsent;
  } catch {
    return null;
  }
}

export function saveCookieConsent(consent: CookieConsent): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(consent);
  window.localStorage.setItem(COOKIE_CONSENT_KEY, serialized);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_CONSENT_COOKIE}=${encodeURIComponent(
    serialized
  )}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;

  purgeDisallowedOptionalCookies(consent);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
}

export function createCookieConsent(options: {
  analytics: boolean;
  advertising: boolean;
}): CookieConsent {
  return {
    version: 1,
    necessary: true,
    analytics: options.analytics,
    advertising: options.advertising,
    updatedAt: new Date().toISOString(),
  };
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function deleteCookiesByPrefixes(prefixes: string[]): void {
  const names = document.cookie
    .split(";")
    .map((item) => item.trim().split("=")[0])
    .filter(Boolean);
  for (const name of names) {
    if (prefixes.some((prefix) => name.startsWith(prefix))) {
      deleteCookie(name);
    }
  }
}

export function purgeDisallowedOptionalCookies(consent: CookieConsent): void {
  if (typeof document === "undefined") return;

  if (!consent.analytics) {
    deleteCookie("_ga");
    deleteCookie("_gid");
    deleteCookie("_gat");
    deleteCookie("_gcl_au");
    deleteCookiesByPrefixes(["_ga_"]);
  }

  if (!consent.advertising) {
    deleteCookie("_fbp");
    deleteCookie("_fbc");
    deleteCookie("fr");
    deleteCookie("IDE");
    deleteCookie("ANID");
    deleteCookie("test_cookie");
  }
}
