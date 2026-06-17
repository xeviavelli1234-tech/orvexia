/**
 * Validación de URLs de canales de notificación (anti-SSRF). PURO (sin
 * server-only ni I/O) → testeable en Node. Lo usan notify-external (dispatch) y
 * la server-action de añadir canal.
 */

const ALLOWED_HOSTS: Record<string, string[]> = {
  slack: ["hooks.slack.com", "slack.com"],
  discord: ["discord.com", "discordapp.com"],
  telegram: ["api.telegram.org"],
};

export function isPrivateHost(host: string): boolean {
  // URL.hostname devuelve los IPv6 ENTRE CORCHETES ("[::1]"): los quitamos antes
  // de comprobar, o los checks IPv6 serían código muerto.
  const h = host.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // Cualquier literal IPv6 se bloquea: un webhook legítimo usa un dominio, no un
  // literal IPv6; y ::1 / fc00::/7 / fe80::/10 / ::ffff:IPv4-interna son justo
  // el objetivo SSRF a cerrar. En un IPv6 el hostname siempre contiene ':'.
  if (h.includes(":")) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata cloud
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }
  return false;
}

/** ¿Es seguro hacer fetch a esta URL de canal desde el servidor? */
export function isSafeChannelUrl(kind: string, raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const host = u.hostname.toLowerCase();
  const allow = ALLOWED_HOSTS[kind];
  if (allow) {
    return allow.some((hh) => host === hh || host.endsWith("." + hh));
  }
  // webhook genérico: exigir https y bloquear destinos internos.
  return u.protocol === "https:" && !isPrivateHost(host);
}
