import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getGoogleUser } from "@/lib/google";
import { findOrCreateGoogleUser } from "@/lib/db/user";
import { createSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;

  // Verificar state para prevenir CSRF
  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code, baseUrl);
    if (!tokens.access_token) {
      return NextResponse.redirect(new URL("/login?error=oauth", request.url));
    }

    const googleUser = await getGoogleUser(tokens.access_token);
    const emailVerified =
      googleUser.email_verified === true || googleUser.email_verified === "true";
    if (!emailVerified) {
      return NextResponse.redirect(
        new URL("/login?error=unverified", request.url)
      );
    }

    const user = await findOrCreateGoogleUser({
      googleId: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
    });

    await createSession({ userId: user.id, name: user.name, email: user.email });
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }
}
