/**
 * Loading del perfil mientras se cargan posts/comentarios/passkeys/locations.
 */
export default function PerfilLoading() {
  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <div className="h-7 w-40 bg-fg/5 rounded animate-pulse mb-6" />
        <div className="h-32 rounded-2xl border border-fg/10 bg-fg/[0.03] animate-pulse" />
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6 space-y-4">
        <div className="h-40 rounded-2xl border border-fg/10 bg-fg/[0.03] animate-pulse" />
        <div className="h-48 rounded-2xl border border-fg/10 bg-fg/[0.03] animate-pulse" />
        <div className="h-36 rounded-2xl border border-fg/10 bg-fg/[0.03] animate-pulse" />
      </div>
    </>
  );
}
