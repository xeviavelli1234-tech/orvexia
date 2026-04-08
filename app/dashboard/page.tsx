import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/db/user";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "Mi Panel · Orvexia" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user) redirect("/login");

  return <DashboardClient user={{ name: user.name, email: user.email }} />;
}
