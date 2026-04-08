import { redirect } from "next/navigation";

export const runtime = "nodejs";

export const metadata = {
  title: "Comunidad (en desarrollo)",
  description: "La comunidad no está disponible por el momento.",
};

export default function ComunidadPage() {
  // Bloqueamos el acceso mientras se termina el desarrollo.
  redirect("/");
}
