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
    const target = encodeURIComponent("/sellers/dashboard");
    return NextResponse.redirect(new URL(`/login?next=${target}`, req.url));
  }

  const state = randomBytes(32).toString("hex");
  const redirectUri = getOauthRedirectUri(req);
  const url = buildAuthUrl({ state, redirectUri });

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
