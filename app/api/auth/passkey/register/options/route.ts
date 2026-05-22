import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rpConfig, saveChallenge } from "@/lib/security/webauthn";

/**
 * POST /api/auth/passkey/register/options
 * Genera las opciones que el navegador pasa a navigator.credentials.create().
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const existing = await prisma.passkey.findMany({
    where: { userId: session.userId },
    select: { credentialId: true, transports: true },
  });

  const { rpName, rpID } = rpConfig();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: session.email,
    userDisplayName: session.name,
    // userID identifica al usuario de forma estable para WebAuthn.
    userID: new TextEncoder().encode(session.userId),
    timeout: 60_000,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports
        ? (c.transports.split(",").filter(Boolean) as AuthenticatorTransport[])
        : undefined,
    })),
  });

  await saveChallenge(options.challenge, "registration", session.userId);
  return NextResponse.json(options);
}

// Tipos prestados de la spec; los importamos sólo en la firma de excludeCredentials.
type AuthenticatorTransport = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb";
