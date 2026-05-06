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
      <div className={`space-y-1 text-center mb-7 ${inter.className}`}>
        <p className="text-[10px] font-bold text-accent-600 uppercase tracking-[0.2em] mb-2.5">
          Empieza gratis
        </p>
        <h1 className="text-2xl font-extrabold text-fg tracking-tight">
          Crea tu cuenta
        </h1>
        <p className="text-sm text-fg-muted mt-1.5">
          Guarda productos y recibe alertas de bajadas de precio
        </p>
      </div>
      <RegisterForm />
    </AuthShell>
  );
}
