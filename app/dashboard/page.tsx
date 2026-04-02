import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/db/user";
import { logoutAction } from "@/app/actions/auth";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 py-16 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Bienvenido de vuelta</p>
        </div>

        {/* Tarjeta de usuario */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white font-semibold text-lg shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-zinc-900">{user.name}</p>
              <p className="text-sm text-zinc-500">{user.email}</p>
            </div>
          </div>

          <dl className="bg-zinc-50 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500 shrink-0">ID</dt>
              <dd className="font-mono text-xs text-zinc-700 text-right break-all">
                {user.id}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500 shrink-0">Cuenta creada</dt>
              <dd className="text-zinc-700 text-right">
                {new Intl.DateTimeFormat("es", {
                  dateStyle: "long",
                }).format(user.createdAt)}
              </dd>
            </div>
          </dl>

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full border border-zinc-200 text-zinc-700 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
