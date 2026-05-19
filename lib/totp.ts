import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * TOTP (RFC 6238) sin dependencias. SHA-1, 6 dígitos, periodo 30 s.
 */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Secreto nuevo (160 bits) en base32. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(key: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  // counter de 64 bits (en la práctica cabe en 53; usamos hi/lo de 32).
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 10 ** digits).toString().padStart(digits, "0");
}

export function totp(
  secretBase32: string,
  opts: { time?: number; step?: number; digits?: number } = {},
): string {
  const step = opts.step ?? 30;
  const time = opts.time ?? Date.now();
  const counter = Math.floor(time / 1000 / step);
  return hotp(base32Decode(secretBase32), counter, opts.digits ?? 6);
}

/** Verifica el token aceptando ±window pasos (deriva de reloj). */
export function verifyTotp(
  secretBase32: string,
  token: string,
  window = 1,
  time: number = Date.now(),
): boolean {
  const t = (token || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(t)) return false;
  const key = base32Decode(secretBase32);
  const base = Math.floor(time / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    const code = hotp(key, base + w, 6);
    const a = Buffer.from(code);
    const b = Buffer.from(t);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function otpauthUrl(params: {
  secret: string;
  label: string;
  issuer: string;
}): string {
  const issuer = encodeURIComponent(params.issuer);
  const label = encodeURIComponent(`${params.issuer}:${params.label}`);
  return (
    `otpauth://totp/${label}?secret=${params.secret}` +
    `&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
  );
}

/** Códigos de recuperación: N códigos legibles tipo XXXX-XXXX. */
export function generateRecoveryCodes(n = 8): string[] {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = () => {
    let s = "";
    const r = randomBytes(8);
    for (let i = 0; i < 8; i++) s += alpha[r[i] % alpha.length];
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  };
  return Array.from({ length: n }, code);
}
