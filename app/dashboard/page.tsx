import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/db/user";
import { DashboardClient } from "./DashboardClient";
import { RepricerSection } from "./RepricerSection";

export const metadata = { title: "Mi Panel · Orvexia" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  const user = await getUserById(session.userId);
  if (!user) redirect("/login?next=/dashboard");

  const { status } = await searchParams;

  return (
    <>
      <DashboardClient user={{ name: user.name, email: user.email }} />
      <RepricerSection userId={session.userId} status={status} />
    </>
  );
}
