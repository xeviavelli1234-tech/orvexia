import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FooterGate } from "@/components/FooterGate";
import { SavedProvider } from "@/components/SavedProvider";
import { ProfileProvider } from "@/components/ProfileProvider";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { CookieConsentScripts } from "@/components/CookieConsentScripts";
import { PublicAssistant } from "@/components/PublicAssistant";
import { COOKIE_CONSENT_COOKIE, parseCookieConsent } from "@/lib/cookie-consent";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialConsent = parseCookieConsent(cookieStore.get(COOKIE_CONSENT_COOKIE)?.value);
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);
  // Diseño futurista: dark por defecto. Cookie "light" lo cambia a claro.
  const isLight = theme === "light";

  return (
    <html
      lang="es"
      className={geist.variable}
      style={{ colorScheme: isLight ? "light" : "dark" }}
      {...(isLight ? {} : { "data-theme": "dark" })}
    >
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
          <FooterGate>
            <Footer />
          </FooterGate>
        </ProfileProvider>
        <PublicAssistant />
        <CookieConsentScripts initialConsent={initialConsent} />
        <CookieConsentBanner initialConsent={initialConsent} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
