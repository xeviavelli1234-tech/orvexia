import { redirect } from "next/navigation";
import { getPending2fa } from "@/lib/session";
import { TwoFactorForm } from "@/components/auth/TwoFactorForm";

export const metadata = { title: "Verificación en dos pasos · Orvexia" };
export const dynamic = "force-dynamic";

/**
 * Pantalla del segundo factor para los flujos que llegan por redirección
 * (enlace mágico, Google OAuth). Si no hay reto 2FA pendiente (cookie
 * `pending-2fa`), no hay nada que verificar → vuelta al login.
 */
export default async function TwoFactorPage() {
  const pending = await getPending2fa();
  if (!pending) redirect("/login");

  return (
    <main className="max-w-md mx-auto px-5 py-20">
      <TwoFactorForm />
    </main>
  );
}
