/** Loading mientras se carga la pantalla de facturación (Stripe + tramos). */
export default function FacturacionLoading() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-12">
      <div className="h-9 w-44 bg-fg/5 rounded animate-pulse mb-3" />
      <div className="h-4 w-72 bg-fg/5 rounded animate-pulse mb-8" />
      <div className="space-y-3">
        <div className="h-24 rounded-xl border border-fg/10 bg-fg/[0.03] animate-pulse" />
        <div className="h-32 rounded-xl border border-fg/10 bg-fg/[0.03] animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-fg/10 bg-fg/[0.03] animate-pulse"
            />
          ))}
        </div>
        <div className="h-44 rounded-xl border border-fg/10 bg-fg/[0.03] animate-pulse" />
      </div>
    </main>
  );
}
