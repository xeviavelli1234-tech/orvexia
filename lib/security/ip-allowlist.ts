/**
 * IP allowlist por cuenta. Acepta:
 *  - IPs exactas (1.2.3.4 o 2001:db8::1)
 *  - Prefijos CIDR (1.2.3.0/24, 2001:db8::/32)
 *
 * Vacío = sin restricción (la cuenta accesible desde cualquier sitio).
 */

export function parseAllowlist(raw: string): string[] {
  return raw
    .split(/[,\n\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeAllowlist(items: string[]): string {
  return items.map((s) => s.trim()).filter(Boolean).join(",");
}

/**
 * ¿La IP está permitida por la allowlist? Si la allowlist está vacía,
 * todo está permitido (sin restricción).
 */
export function isIpAllowed(ip: string | null, allowlist: string): boolean {
  const rules = parseAllowlist(allowlist);
  if (rules.length === 0) return true;
  if (!ip) return false; // si exigimos allowlist y no sabemos la IP → bloqueamos
  return rules.some((rule) => matchRule(ip, rule));
}

function matchRule(ip: string, rule: string): boolean {
  if (!rule.includes("/")) return ip === rule;
  const [base, bitsRaw] = rule.split("/");
  const bits = Number(bitsRaw);
  if (!Number.isFinite(bits) || bits < 0) return false;

  if (ip.includes(":") || base.includes(":")) {
    // IPv6 — comparación por nibbles (4 bits cada uno)
    if (!ip.includes(":") || !base.includes(":")) return false;
    return matchIpv6(ip, base, bits);
  }
  // IPv4
  return matchIpv4(ip, base, bits);
}

function matchIpv4(ip: string, base: string, bits: number): boolean {
  const ipNum = ipv4ToInt(ip);
  const baseNum = ipv4ToInt(base);
  if (ipNum === null || baseNum === null) return false;
  if (bits > 32) return false;
  if (bits === 0) return true;
  const mask = bits === 32 ? 0xffffffff : ((0xffffffff << (32 - bits)) >>> 0);
  return (ipNum & mask) === (baseNum & mask);
}

function ipv4ToInt(ip: string): number | null {
  const p = ip.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const part of p) {
    const v = Number(part);
    if (!Number.isFinite(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

function matchIpv6(ip: string, base: string, bits: number): boolean {
  const ipExpanded = expandIpv6(ip);
  const baseExpanded = expandIpv6(base);
  if (!ipExpanded || !baseExpanded) return false;
  if (bits > 128) return false;
  if (bits === 0) return true;
  const nibbles = Math.floor(bits / 4);
  const rest = bits % 4;
  if (ipExpanded.slice(0, nibbles) !== baseExpanded.slice(0, nibbles)) return false;
  if (rest === 0) return true;
  const ipNib = parseInt(ipExpanded[nibbles], 16);
  const baseNib = parseInt(baseExpanded[nibbles], 16);
  const mask = (0xf << (4 - rest)) & 0xf;
  return (ipNib & mask) === (baseNib & mask);
}

function expandIpv6(ip: string): string | null {
  // Soporta abreviaciones "::". Devuelve 32 dígitos hex en minúsculas.
  let head: string[] = [];
  let tail: string[] = [];
  if (ip.includes("::")) {
    const [h, t] = ip.split("::");
    head = h ? h.split(":") : [];
    tail = t ? t.split(":") : [];
  } else {
    head = ip.split(":");
  }
  if (head.length + tail.length > 8) return null;
  const zeros = Array(8 - head.length - tail.length).fill("0");
  const groups = [...head, ...zeros, ...tail];
  if (groups.length !== 8) return null;
  return groups
    .map((g) => g.padStart(4, "0").toLowerCase())
    .join("");
}
