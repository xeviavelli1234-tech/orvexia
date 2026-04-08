import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ProfileClient } from "./ProfileClient";

export const metadata = { title: "Mi perfil · Orvexia" };

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ProfileClient />;
}
