import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSessionSecret } from "./auth-secret";

export const SESSION_COOKIE = "auth-session";

// El secreto de firma/verificación de los JWT vive en lib/auth-secret.ts, en
// su propio módulo para poder compartirlo con el middleware (proxy.ts).

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
}

export async function createSession(
  payload: SessionPayload,
  rememberMe = false
): Promise<void> {
  const token = await new SignJWT({
    userId: payload.userId,
    name: payload.name,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Si el usuario marcó "Recuérdame", la cookie persiste 7 días.
    // En caso contrario es de sesión: desaparece al cerrar el navegador.
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {}),
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return {
      userId: payload.userId as string,
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ── Reto 2FA pendiente entre paso 1 (contraseña) y paso 2 (código) ──
const PENDING_2FA_COOKIE = "auth-2fa";

export interface Pending2fa {
  userId: string;
  rememberMe: boolean;
  next: string | null;
}

export async function createPending2fa(p: Pending2fa): Promise<void> {
  const token = await new SignJWT({
    userId: p.userId,
    rememberMe: p.rememberMe,
    next: p.next ?? "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSessionSecret());
  const cookieStore = await cookies();
  cookieStore.set(PENDING_2FA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function getPending2fa(): Promise<Pending2fa | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_2FA_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return {
      userId: payload.userId as string,
      rememberMe: !!payload.rememberMe,
      next: (payload.next as string) || null,
    };
  } catch {
    return null;
  }
}

export async function clearPending2fa(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_2FA_COOKIE);
}
