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
        <p className="font-mono-ui text-[10px] font-bold text-lime-300 uppercase tracking-[0.2em] mb-3">
          ▸ /auth · register · free
        </p>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
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
