import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";
import { safeNext } from "@/lib/safe-next";

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  const response = NextResponse.redirect(getGoogleAuthUrl(state, baseUrl));

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 10, // 10 minutos
    path: "/",
  };
  response.cookies.set("oauth_state", state, cookieOpts);
  // Guardamos el destino validado para recuperarlo en el callback (Google no
  // nos deja pasar parámetros propios de forma fiable salvo el state).
  if (next) response.cookies.set("oauth_next", next, cookieOpts);

  return response;
}
