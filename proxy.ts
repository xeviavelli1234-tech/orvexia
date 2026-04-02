import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/session";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "fallback-secret-change-in-production"
);

async function triggerCleanup(request: NextRequest) {
  // Evita bucle al llamar al propio endpoint
  if (request.nextUrl.pathname.startsWith("/api/auth/cleanup")) return;

  const origin =
    process.env.NEXTAUTH_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  try {
    await fetch(`${origin}/api/auth/cleanup`, {
      method: "POST",
      headers: { "x-cleanup-trigger": "proxy" },
    });
  } catch {
    // Silenciamos errores para no bloquear la navegación.
  }
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Lanza limpieza en segundo plano sin bloquear la navegación
  triggerCleanup(request);

  const authenticated = await isAuthenticated(request);

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isProtectedRoute = pathname.startsWith("/dashboard");

  if (isProtectedRoute && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthRoute && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/dashboard/:path*"],
};
