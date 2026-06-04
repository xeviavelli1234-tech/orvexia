import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/session";
import { getSessionSecret } from "@/lib/auth-secret";

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    // getSessionSecret() aborta en producción si falta AUTH_SECRET. Aquí lo
    // tratamos como "no autenticado" (fail-closed) en lugar de tumbar el sitio:
    // las rutas protegidas redirigen a login y la home pública sigue viva. Lo
    // que NO hacemos es verificar contra un secreto público de fallback, que
    // permitiría forjar sesiones.
    await jwtVerify(token, getSessionSecret());
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authenticated = await isAuthenticated(request);

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isProtectedRoute = pathname.startsWith("/dashboard");

  if (isProtectedRoute && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthRoute && authenticated) {
    // Respeta ?next= (relativo y seguro) para no perder el destino
    // (p.ej. venir de la landing del repricer). Evita open-redirect.
    const nextParam = request.nextUrl.searchParams.get("next");
    const safeNext =
      nextParam &&
      nextParam.startsWith("/") &&
      !nextParam.startsWith("//") &&
      !nextParam.startsWith("/\\")
        ? nextParam
        : "/dashboard";
    return NextResponse.redirect(new URL(safeNext, request.url));
  }

  return NextResponse.next();
}

// La home ("/") ya no necesita middleware: el antiguo disparador de limpieza
// de cuentas se movió a un cron (/api/cron/cleanup-accounts). Solo
// interceptamos las rutas que de verdad dependen del estado de sesión.
export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*"],
};
