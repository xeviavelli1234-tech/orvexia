import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getGoogleUser } from "@/lib/google";
import { findOrCreateGoogleUser } from "@/lib/db/user";
import { createSession, createPending2fa } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";

function redirectWithStateCleanup(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.delete("oauth_state");
  response.cookies.delete("oauth_next");
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;

  // Verificar state para prevenir CSRF
  if (!code || !state || state !== savedState) {
    return redirectWithStateCleanup(new URL("/login?error=oauth", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code, baseUrl);
    if (!tokens.access_token) {
      return redirectWithStateCleanup(new URL("/login?error=oauth", request.url));
    }

    const googleUser = await getGoogleUser(tokens.access_token);
    const emailVerified =
      googleUser.email_verified === true || googleUser.email_verified === "true";
    if (!emailVerified) {
      return redirectWithStateCleanup(
        new URL("/login?error=unverified", request.url)
      );
    }

    const user = await findOrCreateGoogleUser({
      googleId: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
    });

    // Recupera el destino guardado antes de ir a Google; si no hay, dashboard.
    const dest = safeNext(cookieStore.get("oauth_next")?.value) ?? "/dashboard";

    // 2FA activado: Google es el PRIMER factor; exigimos también el TOTP. No
    // creamos sesión completa todavía → diferimos a /login/2fa. Sin esto, el
    // login con Google eludía el segundo factor que el usuario activó.
    if (user.totpEnabled) {
      await createPending2fa({ userId: user.id, rememberMe: false, next: dest });
      return redirectWithStateCleanup(new URL("/login/2fa", request.url));
    }

    await createSession({ userId: user.id, name: user.name, email: user.email });
    return redirectWithStateCleanup(new URL(dest, request.url));
  } catch {
    return redirectWithStateCleanup(new URL("/login?error=oauth", request.url));
  }
}
