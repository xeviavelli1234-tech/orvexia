import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "auth-session";

// AUTH_SECRET firma los JWT de sesión. En producción es OBLIGATORIO: sin él,
// un fallback público permitiría a cualquiera forjar sesiones con userId
// arbitrario y suplantar usuarios. Por eso abortamos si falta en prod.
// En dev/test permitimos un valor fijo para no bloquear el desarrollo local.
//
// La validación es LAZY (se evalúa al firmar/verificar, no al importar el
// módulo) para que `next build` —que recolecta módulos en NODE_ENV=production—
// no falle si la var solo está disponible en runtime. Cacheamos el resultado.
let cachedSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET no está configurado en producción. Aborta: firmar JWT con un secreto por defecto es inseguro.",
    );
  }
  cachedSecret = new TextEncoder().encode(
    s ?? "dev-only-insecure-secret-do-not-use-in-production",
  );
  return cachedSecret;
}

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
    .sign(getSecret());

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
    const { payload } = await jwtVerify(token, getSecret());
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
    .sign(getSecret());
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
    const { payload } = await jwtVerify(token, getSecret());
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
