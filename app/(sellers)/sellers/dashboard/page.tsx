import { redirect } from "next/navigation";

export const metadata = { title: "Panel · Orvexia" };

/**
 * Dashboard unificado: el repricer vive como sección dentro de /dashboard.
 * Esta ruta se mantiene por compatibilidad (OAuth callback, demo connect,
 * enlaces antiguos) y redirige conservando el ?status.
 */
export default async function SellerDashboardRedirect({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  redirect(status ? `/dashboard?status=${encodeURIComponent(status)}` : "/dashboard");
}
