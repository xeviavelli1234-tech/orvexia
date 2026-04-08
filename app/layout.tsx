import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SavedProvider } from "@/components/SavedProvider";
import { ProfileProvider } from "@/components/ProfileProvider";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Orvexia – Compara precios de electrodomésticos y ahorra en cada compra",
    template: "%s · Orvexia",
  },
  description:
    "Orvexia es tu comparador de precios de electrodomésticos. Encuentra las mejores ofertas en Amazon, MediaMarkt y más tiendas de España.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={geist.variable}>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#2563EB] focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
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
      </body>
    </html>
  );
}
