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
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <AuthShell accent="blue">
      <div className={`space-y-1 text-center mb-7 ${inter.className}`}>
        <p className="text-[10px] font-bold text-brand-600 uppercase tracking-[0.2em] mb-2.5">
          Bienvenido de vuelta
        </p>
        <h1 className="text-2xl font-extrabold text-fg tracking-tight">
          Inicia sesión
        </h1>
        <p className="text-sm text-fg-muted mt-1.5">
          Accede para ver tus alertas y favoritos
        </p>
      </div>
      <LoginForm oauthError={error} next={next} />
    </AuthShell>
  );
}
