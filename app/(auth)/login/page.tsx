import { LoginForm } from "@/components/auth/LoginForm";
import { Playfair_Display, Inter } from "next/font/google";

export const metadata = {
  title: "Iniciar sesión",
};

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-14 relative overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(0deg, rgba(37,99,235,0.22), rgba(37,99,235,0.22)), url("/appliances-bg.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#E5F0FF",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.22),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(37,99,235,0.2),transparent_38%)]" />

      <div className="relative w-full max-w-[640px] px-4">
        <div className="relative overflow-visible rounded-[16px] border border-[#E2E8F0]/70 bg-white/70 backdrop-blur-2xl shadow-[0_16px_56px_-24px_rgba(15,23,42,0.32)]">
          <div className={`relative w-full px-12 py-12 space-y-4 md:px-14 ${inter.className}`}>
            <div className="space-y-1 text-center">
              <h1 className={`${playfair.className} text-3xl text-[#0F172A]`}>Welcome Back</h1>
              <p className="text-sm text-[#64748B]">Inicia sesión en tu cuenta</p>
            </div>

            <LoginForm oauthError={error} />
          </div>
        </div>
      </div>
    </div>
  );
}
