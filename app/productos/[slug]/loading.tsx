/** Loading mientras se cargan la ficha + ofertas + historial del producto. */
export default function ProductoLoading() {
  return (
    <main className="max-w-6xl mx-auto px-5 py-10">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-8">
        <div className="aspect-square rounded-2xl border border-fg/10 bg-fg/[0.03] animate-pulse" />
        <div className="space-y-4">
          <div className="h-4 w-24 bg-fg/5 rounded animate-pulse" />
          <div className="h-8 w-3/4 bg-fg/10 rounded animate-pulse" />
          <div className="h-5 w-1/3 bg-fg/5 rounded animate-pulse" />
          <div className="mt-6 h-32 rounded-xl border border-fg/10 bg-fg/[0.03] animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 rounded-lg border border-fg/10 bg-fg/[0.03] animate-pulse" />
            <div className="h-20 rounded-lg border border-fg/10 bg-fg/[0.03] animate-pulse" />
          </div>
        </div>
      </div>
      <div className="mt-12 h-64 rounded-2xl border border-fg/10 bg-fg/[0.03] animate-pulse" />
    </main>
  );
}
