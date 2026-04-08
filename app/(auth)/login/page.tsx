import { LoginForm } from "@/components/auth/LoginForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { Inter } from "next/font/google";

export const metadata = {
  title: "Iniciar sesión",
};

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell accent="orange">
      <div className={`space-y-1 text-center mb-6 ${inter.className}`}>
        <p className="text-xs font-semibold text-[#F97316] uppercase tracking-widest mb-2">
          Bienvenido de vuelta
        </p>
        <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
          Inicia sesión
        </h1>
        <p className="text-sm text-[#64748B]">
          Accede a tu cuenta para ver tus ofertas guardadas
        </p>
      </div>
      <LoginForm oauthError={error} />
    </AuthShell>
  );
}
