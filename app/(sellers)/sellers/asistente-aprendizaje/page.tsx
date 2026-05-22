import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import {
  learningStats,
  listCandidates,
  listInteractionsForCluster,
} from "@/lib/assistant/store";
import {
  approveCandidateAction,
  rejectCandidateAction,
  unapproveCandidateAction,
  runCycleAction,
  createManualTopicAction,
} from "./actions";

export const metadata = { title: "IA · Aprendizaje · Orvexia" };
export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export default async function AsistenteAprendizajePage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/sellers/asistente-aprendizaje");
  const admin = await isAdminUser(session.userId);
  if (!admin) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-white">403 · No autorizado</h1>
        <p className="mt-3 text-white/60">
          Esta zona es solo para administradores de Orvexia.
        </p>
        <Link href="/sellers/productos" className="mt-6 inline-block text-cyan-300 hover:underline">
          ← Volver al panel
        </Link>
      </main>
    );
  }

  const [stats, pending, approved] = await Promise.all([
    learningStats(),
    listCandidates(false, 30),
    listCandidates(true, 50),
  ]);

  // Cargamos preguntas-muestra de los candidatos en paralelo
  const samplesByCluster = new Map<string, Array<{ id: string; question: string; helpful: boolean | null; createdAt: Date }>>();
  await Promise.all(
    pending.map(async (c) => {
      const rows = await listInteractionsForCluster(c.id, 5);
      samplesByCluster.set(c.id, rows);
    }),
  );

  return (
    <main className="max-w-6xl mx-auto px-5 py-12">
      <header className="mb-8">
        <p className="font-mono-ui text-[10px] uppercase tracking-wider text-cyan-300 mb-2">
          ▸ /admin · learning loop
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Aprendizaje del <span className="text-gradient-aurora">asistente</span>
        </h1>
        <p className="mt-2 text-sm text-white/55 max-w-2xl">
          La IA registra cada pregunta y respuesta. Un cron diario agrupa lo que
          no supo responder o lo que recibió 👎 y te lo trae aquí para revisar.
          Lo que apruebes pasa a la base de conocimiento y se refuerza por uso.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <Kpi label="Interacciones" value={stats.total} />
        <Kpi label="Útiles 👍" value={stats.helpful} tone="ok" />
        <Kpi label="No útiles 👎" value={stats.unhelpful} tone="err" />
        <Kpi label="Sin match" value={stats.noMatch} tone="warn" />
        <Kpi label="Aprendidos" value={stats.approved} tone="ok" />
        <Kpi label="Pendientes" value={stats.pending} tone="warn" />
      </section>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <form action={runCycleAction}>
          <button
            type="submit"
            className="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors"
          >
            ⚙ Ejecutar ciclo de aprendizaje ahora
          </button>
        </form>
        <p className="text-xs text-white/40">
          También se ejecuta automáticamente cuando llamas a <code className="text-cyan-300">/api/cron/assistant-learn</code>.
        </p>
      </div>

      {/* Pendientes */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-white mb-3">
          Candidatos por aprobar <span className="text-white/40 text-sm">· {pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-white/45">
            Nada pendiente 🎉 — vuelve cuando el cron acumule más interacciones.
          </p>
        ) : (
          <div className="space-y-4">
            {pending.map((c) => {
              const samples = samplesByCluster.get(c.id) ?? [];
              return (
                <article
                  key={c.id}
                  className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-4"
                >
                  <header className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-amber-200/80">
                        <span className="rounded bg-amber-400/15 px-1.5 py-0.5">cluster</span>
                        <span>· {c.occurrences} preguntas · creado {fmt(c.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-white/90 font-medium">
                        “{c.sampleQuestion}”
                      </p>
                    </div>
                  </header>

                  {samples.length > 0 && (
                    <details className="mb-3">
                      <summary className="cursor-pointer text-xs text-white/40 hover:text-white/70">
                        Ver {samples.length} preguntas del cluster
                      </summary>
                      <ul className="mt-1.5 ml-4 list-disc space-y-1 text-xs text-white/55">
                        {samples.map((s) => (
                          <li key={s.id}>
                            {s.question}
                            {s.helpful === false && (
                              <span className="ml-2 text-rose-300">· 👎</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <form action={approveCandidateAction} className="space-y-2">
                    <input type="hidden" name="id" value={c.id} />
                    <label className="block text-[11px] uppercase tracking-wider text-white/40">
                      Palabras clave (separadas por coma)
                    </label>
                    <input
                      name="keywords"
                      defaultValue={c.keywords}
                      className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                    <label className="block text-[11px] uppercase tracking-wider text-white/40 pt-1">
                      Respuesta
                    </label>
                    <textarea
                      name="answer"
                      defaultValue={c.answer || ""}
                      rows={4}
                      placeholder="Redacta la respuesta canónica…"
                      className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                      required
                    />
                    <label className="block text-[11px] uppercase tracking-wider text-white/40 pt-1">
                      Preguntas sugeridas (separadas por <code className="text-cyan-300">|</code>)
                    </label>
                    <input
                      name="followUps"
                      defaultValue={c.followUps}
                      placeholder="¿Y luego?|¿Cómo se activa?"
                      className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors"
                      >
                        ✓ Aprobar
                      </button>
                      <button
                        type="submit"
                        formAction={rejectCandidateAction}
                        className="rounded-lg border border-rose-400/40 text-rose-300 px-3 py-1.5 text-sm hover:bg-rose-500/10 transition-colors"
                      >
                        ✕ Descartar
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Crear topic manual */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-white mb-3">Crear topic manual</h2>
        <form
          action={createManualTopicAction}
          className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.04] p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/40">
                Palabras clave
              </label>
              <input
                name="keywords"
                required
                placeholder="rango,minimo,maximo"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white mt-1"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/40">
                Pregunta ejemplo
              </label>
              <input
                name="sampleQuestion"
                placeholder="¿Cómo configuro el rango mínimo y máximo?"
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white mt-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40">
              Respuesta
            </label>
            <textarea
              name="answer"
              required
              rows={4}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/40">
              Preguntas sugeridas (opcional, separadas por <code className="text-cyan-300">|</code>)
            </label>
            <input
              name="followUps"
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white mt-1"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors"
          >
            + Añadir topic aprobado
          </button>
        </form>
      </section>

      {/* Aprobados */}
      <section>
        <h2 className="text-xl font-bold text-white mb-3">
          Topics aprobados <span className="text-white/40 text-sm">· {approved.length}</span>
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-white/45">Aún no has aprobado nada.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/45">
                <tr>
                  <th className="px-3 py-2 text-left">Pregunta tipo</th>
                  <th className="px-3 py-2 text-left">Keywords</th>
                  <th className="px-3 py-2 text-right">Uso</th>
                  <th className="px-3 py-2 text-right">👍</th>
                  <th className="px-3 py-2 text-right">👎</th>
                  <th className="px-3 py-2 text-left">Aprobado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {approved.map((t) => (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="px-3 py-2 text-white/85">
                      <div className="line-clamp-2 max-w-md">{t.sampleQuestion}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-white/55">
                      <code className="break-all">{t.keywords}</code>
                    </td>
                    <td className="px-3 py-2 text-right text-white/70">{t.usageCount}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{t.helpfulCount}</td>
                    <td className="px-3 py-2 text-right text-rose-300">{t.unhelpfulCount}</td>
                    <td className="px-3 py-2 text-xs text-white/50">
                      {t.approvedAt ? fmt(t.approvedAt) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <form action={unapproveCandidateAction} className="inline-block mr-2">
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          className="text-xs text-amber-300 hover:underline"
                          title="Mover a pendientes"
                        >
                          revisar
                        </button>
                      </form>
                      <form action={rejectCandidateAction} className="inline-block">
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          className="text-xs text-rose-300 hover:underline"
                          title="Eliminar"
                        >
                          borrar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-12 text-xs text-white/40">
        💡 Cuando una pregunta no recibe match, queda como “sin match”. El cron
        las agrupa por similitud (Jaccard de tokens) y crea candidatos cuando
        hay ≥ 2 preguntas parecidas. Una vez aprobado, el asistente usa el
        topic en menos de 5 min (caché). El feedback 👍/👎 reordena la
        prioridad automáticamente.
      </p>
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
  tone?: "ok" | "warn" | "err" | "neutral";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "err"
          ? "text-rose-300"
          : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mt-0.5 text-2xl font-bold ${color}`}>{value.toLocaleString("es-ES")}</div>
    </div>
  );
}
