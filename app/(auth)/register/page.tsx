import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { Inter } from "next/font/google";

export const metadata = {
  title: "Crear cuenta",
};

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function RegisterPage() {
  return (
    <AuthShell accent="green">
      <div className={`reveal space-y-1 text-center mb-7 ${inter.className}`}>
        <div className="mb-4 flex justify-center">
          <span className="inline-flex h-6 items-center rounded-full border border-brand-400/25 bg-brand-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-200">
            Cuenta gratis · sin tarjeta
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight" style={{ letterSpacing: "-0.03em", textWrap: "balance" }}>
          Crea tu cuenta
        </h1>
        <p className="text-sm text-white/55 mt-1.5">
          Guarda productos y recibe alertas de bajadas de precio
        </p>
      </div>
      <RegisterForm />
    </AuthShell>
  );
}
