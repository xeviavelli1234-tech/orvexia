import { getSession } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { HeaderClient } from "@/components/HeaderClient";

export async function Header() {
  const session = await getSession();
  return <HeaderClient isLoggedIn={!!session} logoutAction={logoutAction} />;
}
