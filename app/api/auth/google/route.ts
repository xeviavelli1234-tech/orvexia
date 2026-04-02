import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;

  const response = NextResponse.redirect(getGoogleAuthUrl(state, baseUrl));

  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutos
    path: "/",
  });

  return response;
}
