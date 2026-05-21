import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { rpConfig, saveChallenge } from "@/lib/security/webauthn";

/**
 * POST /api/auth/passkey/login/options
 * Body: { email?: string }
 *
 * Si pasan email se restringen los allowCredentials al usuario; si no, se
 * ofrece "passkey discoverable" (usernameless) y el navegador elegirá.
 */
export async function POST(req: Request) {
  let email: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.email === "string") email = body.email.trim().toLowerCase();
  } catch {
    /* sin body es válido */
  }

  let allowCredentials:
    | { id: string; transports?: AuthenticatorTransport[] }[]
    | undefined;
  let userId: string | null = null;
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { passkeys: { select: { credentialId: true, transports: true } } },
    });
    // Devolvemos respuesta igualmente para no revelar la existencia del email.
    if (user && user.passkeys.length > 0) {
      userId = user.id;
      allowCredentials = user.passkeys.map((c) => ({
        id: c.credentialId,
        transports: c.transports
          ? (c.transports.split(",").filter(Boolean) as AuthenticatorTransport[])
          : undefined,
      }));
    }
  }

  const { rpID } = rpConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    timeout: 60_000,
    userVerification: "preferred",
    allowCredentials,
  });

  await saveChallenge(options.challenge, "authentication", userId);
  return NextResponse.json(options);
}

type AuthenticatorTransport = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb";
