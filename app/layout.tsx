import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SavedProvider } from "@/components/SavedProvider";
import { ProfileProvider } from "@/components/ProfileProvider";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { CookieConsentScripts } from "@/components/CookieConsentScripts";
import { COOKIE_CONSENT_COOKIE, parseCookieConsent } from "@/lib/cookie-consent";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Orvexia – Compara precios de electrodomésticos y ahorra en cada compra",
    template: "%s · Orvexia",
  },
  description:
    "Orvexia es tu comparador de precios de electrodomésticos. Encuentra las mejores ofertas en Amazon, PcComponentes, Fnac, El Corte Inglés y más tiendas de España.",
  verification: {
    google: "lcqCpEPYpqIvoa08jEh06pLKma2vc0e5DUuT4J4hneg",
  },
};

// Inline script — set theme before paint to avoid flash
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefers = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var theme = stored || prefers;
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialConsent = parseCookieConsent(cookieStore.get(COOKIE_CONSENT_COOKIE)?.value);

  return (
    <html lang="es" className={geist.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased bg-bg text-fg">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>
        <ProfileProvider>
          <Header />
          <SavedProvider>
            <div id="main-content">{children}</div>
          </SavedProvider>
          <Footer />
        </ProfileProvider>
        <CookieConsentScripts initialConsent={initialConsent} />
        <CookieConsentBanner initialConsent={initialConsent} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
