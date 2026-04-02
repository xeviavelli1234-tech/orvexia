import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { ExploreDropdown } from "@/components/ExploreDropdown";

function DealTrackerLogo() {
  return (
    <span className="flex items-baseline gap-0 text-[1.25rem] tracking-tight leading-none select-none">
      <span className="font-normal" style={{ color: "#0F172A" }}>Deal</span>
      <span
        className="font-bold"
        style={{
          background: "linear-gradient(90deg, #2563EB, #16a34a)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Tracker
      </span>
    </span>
  );
}

export async function Header() {
  const session = await getSession();

  return (
    <header style={{ borderBottom: "1px solid #D6E8FF", backgroundColor: "#EAF3FF" }}>
      <div className="w-full px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center px-2 py-1 rounded-md transition-all duration-150 hover:bg-[#E0EDFF]"
          >
            <DealTrackerLogo />
          </Link>
          <ExploreDropdown />
        </div>

        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm px-4 py-2 rounded-lg transition-colors font-medium hover:bg-[#EFF6FF]"
                style={{ color: "#2563EB" }}
              >
                Dashboard
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-sm px-4 py-2 rounded-full font-medium transition-colors"
                  style={{ backgroundColor: "#0F172A", color: "#ffffff" }}
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm px-4 py-2 rounded-lg font-bold transition-colors hover:bg-[#E0EDFF]"
                style={{ color: "#0F172A" }}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="text-sm px-4 py-2 rounded-full font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: "#F97316", color: "#ffffff" }}
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
