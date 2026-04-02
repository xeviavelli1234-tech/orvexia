import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DealTracker – Tu web para descubrir ofertas, ahorrar dinero y no perder ninguna bajada de precio",
    template: "%s | DealTracker",
  },
  description: "Tu web para descubrir ofertas, ahorrar dinero y no perder ninguna bajada de precio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={geist.variable}>
      <body className="font-sans antialiased">
          <Header />
          {children}
        </body>
    </html>
  );
}
