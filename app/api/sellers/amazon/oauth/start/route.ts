import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { buildAuthUrl } from "@/lib/amazon/lwa";
import { getBaseUrl, getOauthRedirectUri } from "@/lib/url";

export const OAUTH_STATE_COOKIE = "sp_oauth_state";
const STATE_TTL_SECONDS = 600; // 10 min

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    const target = encodeURIComponent("/dashboard/repricer");
    return NextResponse.redirect(new URL(`/login?next=${target}`, req.url));
  }

  // Asegura que TODO el flujo OAuth ocurre en el dominio CANÓNICO
  // (NEXT_PUBLIC_BASE_URL). El redirect_uri se deriva del canónico (lib/url),
  // pero la cookie de estado se setea en el host de ESTA petición. Si el
  // usuario navega por otro host (apex vs www), la cookie quedaría en un
  // dominio y el callback llegaría a otro → error_state_mismatch. Reenviamos al
  // canónico primero para que cookie y callback compartan dominio.
  const canonicalBase = getBaseUrl(); // sin req → NEXT_PUBLIC_BASE_URL
  try {
    const canonicalHost = new URL(canonicalBase).host;
    const reqHost = new URL(req.url).host;
    if (canonicalHost && reqHost && canonicalHost !== reqHost) {
      return NextResponse.redirect(
        new URL("/api/sellers/amazon/oauth/start", canonicalBase),
      );
    }
  } catch {
    /* URL malformada: seguimos con el flujo normal */
  }

  const state = randomBytes(32).toString("hex");
  const redirectUri = getOauthRedirectUri(req);
  // version=beta = self-authorization: funciona con apps en BORRADOR pero
  // SOLO para la cuenta de vendedor del propio developer. version=stable =
  // consentimiento público (Appstore): requiere la app PUBLICADA, si no →
  // MD1000. Por defecto beta; pon SP_API_APP_PUBLISHED=true en Vercel
  // cuando Amazon publique la app para abrirlo a clientes externos.
  const published = process.env.SP_API_APP_PUBLISHED === "true";
  const url = buildAuthUrl({
    state,
    redirectUri,
    version: published ? "stable" : "beta",
  });

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
