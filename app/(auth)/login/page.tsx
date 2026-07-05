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
      <div className={`reveal space-y-1 text-center mb-7 ${inter.className}`}>
        <div className="mb-4 flex justify-center">
          <span className="inline-flex h-6 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-200">
            Bienvenido de nuevo
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight" style={{ letterSpacing: "-0.03em", textWrap: "balance" }}>
          Inicia sesión
        </h1>
        <p className="text-sm text-white/55 mt-1.5">
          Accede para ver tus alertas y favoritos
        </p>
      </div>
      <LoginForm oauthError={error} next={next} />
    </AuthShell>
  );
}
