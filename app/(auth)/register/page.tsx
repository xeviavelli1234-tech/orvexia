import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { Inter } from "next/font/google";

export const metadata = {
  title: "Crear cuenta",
};

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function RegisterPage() {
  return (
    <AuthShell accent="orange">
      <div className={`space-y-1 text-center mb-6 ${inter.className}`}>
        <p className="text-xs font-semibold text-[#F97316] uppercase tracking-widest mb-2">
          Empieza gratis
        </p>
        <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
          Crea tu cuenta
        </h1>
        <p className="text-sm text-[#64748B]">
          Guarda productos y recibe alertas de bajadas de precio
        </p>
      </div>
      <RegisterForm />
    </AuthShell>
  );
}
