import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin · Usuarios · Orvexia" };
export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fmtDateTime(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export default async function UsuariosAdmin() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/usuarios");
  const admin = await isAdminUser(session.userId);
  if (!admin) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-white">403 · No autorizado</h1>
        <p className="mt-3 text-white/60">Esta zona es solo para administradores.</p>
        <Link href="/" className="mt-6 inline-block text-cyan-300 hover:underline">
          ← Volver al inicio
        </Link>
      </main>
    );
  }

  // Usuarios registrados (los más recientes primero)
  const users = await prisma.user.findMany({
    select: {
      name: true,
      email: true,
      emailVerified: true,
      googleId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Logins con éxito agrupados por email: nº de logins + último login
  const loginGroups = await prisma.loginAttempt.groupBy({
    by: ["email"],
    where: { success: true },
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
  });

  const verificados = users.filter((u) => u.emailVerified).length;
  const conGoogle = users.filter((u) => u.googleId).length;
  const personasLogueadas = loginGroups.filter((g) => g.email).length;

  return (
    <main className="max-w-5xl mx-auto px-5 py-12">
      <header className="mb-8">
        <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">
          ▸ /admin · usuarios
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Usuarios de <span className="text-gradient-aurora">la web</span>
        </h1>
        <p className="mt-2 text-sm text-white/55 max-w-2xl">
          Gente registrada y quién ha iniciado sesión con éxito. Datos en vivo desde la
          base de datos.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Kpi label="Registrados" value={users.length} />
        <Kpi label="Verificados" value={verificados} tone="ok" />
        <Kpi label="Con Google" value={conGoogle} />
        <Kpi label="Han logueado" value={personasLogueadas} tone="ok" />
      </section>

      {/* Registrados */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-white mb-3">
          Registrados <span className="text-white/40">({users.length})</span>
        </h2>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm text-left">
            <thead className="text-white/50 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Verificado</th>
                <th className="px-4 py-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-white/40">
                    Todavía no hay usuarios registrados.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.email} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-white/90">{u.name}</td>
                  <td className="px-4 py-3 text-white/70">
                    {u.email}
                    {u.googleId && (
                      <span className="ml-2 text-[10px] text-cyan-300">Google</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.emailVerified ? (
                      <span className="text-emerald-300">sí</span>
                    ) : (
                      <span className="text-white/40">no</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/60">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Logins con éxito */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">
          Han iniciado sesión{" "}
          <span className="text-white/40">({personasLogueadas})</span>
        </h2>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm text-left">
            <thead className="text-white/50 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Logins</th>
                <th className="px-4 py-3 font-medium">Último login</th>
              </tr>
            </thead>
            <tbody>
              {personasLogueadas === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-white/40">
                    Todavía no hay inicios de sesión registrados.
                  </td>
                </tr>
              )}
              {loginGroups
                .filter((g) => g.email)
                .map((g) => (
                  <tr key={g.email} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-white/90">{g.email}</td>
                    <td className="px-4 py-3 text-white/70">{g._count._all}</td>
                    <td className="px-4 py-3 text-white/60">
                      {g._max.createdAt ? fmtDateTime(g._max.createdAt) : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "ok" | "neutral";
}) {
  const color = tone === "ok" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-wider text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
