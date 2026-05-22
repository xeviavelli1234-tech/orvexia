/** Loading mientras se cargan las categorías + sus productos destacados. */
export default function CategoriasLoading() {
  return (
    <main className="max-w-6xl mx-auto px-5 py-12">
      <div className="h-9 w-56 bg-fg/5 rounded animate-pulse mb-3" />
      <div className="h-4 w-80 bg-fg/5 rounded animate-pulse mb-10" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] rounded-xl border border-fg/5 bg-fg/[0.03] animate-pulse"
          />
        ))}
      </div>
    </main>
  );
}
