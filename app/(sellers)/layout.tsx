import Link from "next/link";
import { headers } from "next/headers";
import { REPRICER_ENABLED, REPRICER_PUBLIC } from "@/lib/featureFlags";
import RepricerComingSoon from "@/components/RepricerComingSoon";
import SellersHeader from "./SellersHeader";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { readRequestMeta } from "@/lib/security/request";
import { isIpAllowed } from "@/lib/security/ip-allowlist";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata = {
  title: "Orvexia Repricer · Reprecio automático para Amazon ES",
  description:
    "Reprecia tus productos en Amazon España automáticamente. Define precio mínimo y máximo por producto y nuestro motor reprecia cada 5 minutos.",
  // Pre-lanzamiento: no indexar hasta que sea público.
  robots: REPRICER_PUBLIC ? undefined : { index: false, follow: false },
};

export default async function SellersLayout({ children }: { children: React.ReactNode }) {
  if (!REPRICER_ENABLED) return <RepricerComingSoon />;

  // ── Comprobación de allowlist de IP por cuenta (si la hay) ────────────
  const session = await getSession();
  if (session) {
    const acc = await prisma.sellerAccount.findUnique({
      where: { userId: session.userId },
      select: { ipAllowlist: true },
    }).catch(() => null);
    if (acc?.ipAllowlist && acc.ipAllowlist.trim().length > 0) {
      const h = await headers();
      const meta = readRequestMeta(new Request("http://x", { headers: h }));
      if (!isIpAllowed(meta.ip, acc.ipAllowlist)) {
        return (
          <div className="min-h-screen flex flex-col bg-bg text-fg">
            <SellersHeader />
            <main className="flex-1 grid place-items-center px-5 py-20">
              <div className="max-w-md text-center rounded-2xl border border-rose-400/30 bg-rose-500/[0.06] p-8">
                <p className="font-mono-ui text-[10px] uppercase tracking-wider text-rose-300">
                  ▸ acceso restringido
                </p>
                <h1 className="mt-2 text-2xl font-extrabold text-white">
                  IP no autorizada
                </h1>
                <p className="mt-3 text-sm text-white/70">
                  Tu IP <code className="text-rose-200">{meta.ip ?? "desconocida"}</code>{" "}
                  no está en la allowlist configurada para tu cuenta del repricer.
                </p>
                <p className="mt-3 text-xs text-white/55">
                  Si has cambiado de red, edita la allowlist desde el perfil o pídele a tu
                  administrador que la actualice.
                </p>
                <div className="mt-5 flex gap-2 justify-center">
                  <Link
                    href="/perfil"
                    className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Editar allowlist
                  </Link>
                  <Link
                    href="/"
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
                  >
                    Salir
                  </Link>
                </div>
              </div>
            </main>
          </div>
        );
      }
    }
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-bg text-fg">
        <SellersHeader />

        <main className="flex-1">{children}</main>

        <footer className="border-t border-black/5 dark:border-white/10 mt-20">
          <div className="max-w-6xl mx-auto px-5 py-10 text-sm text-fg/60 flex flex-wrap items-center justify-between gap-4">
            <div>© {new Date().getFullYear()} Orvexia. Todos los derechos reservados.</div>
            <div className="flex gap-5">
              <Link href="/aviso-legal" className="hover:text-fg">
                Aviso legal
              </Link>
              <Link href="/politica-privacidad" className="hover:text-fg">
                Privacidad
              </Link>
              <Link href="/" className="hover:text-fg">
                Comparador
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
