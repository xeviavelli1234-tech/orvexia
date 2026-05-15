import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { buildAuthUrl } from "@/lib/amazon/lwa";
import { getOauthRedirectUri } from "@/lib/url";

export const OAUTH_STATE_COOKIE = "sp_oauth_state";
const STATE_TTL_SECONDS = 600; // 10 min

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    const target = encodeURIComponent("/dashboard/repricer");
    return NextResponse.redirect(new URL(`/login?next=${target}`, req.url));
  }

  const state = randomBytes(32).toString("hex");
  const redirectUri = getOauthRedirectUri(req);
  // version=beta = self-authorization para apps Sandbox / draft.
  // El developer autoriza la app contra su propio seller account sin pasar por
  // el listado público de marketplace (que es donde MD1000 falla porque las
  // apps Sandbox no están publicadas).
  const isDraft = process.env.SP_API_ENV !== "production";
  const url = buildAuthUrl({ state, redirectUri, version: isDraft ? "beta" : "stable" });

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });

  return NextResponse.redirect(url);
}
