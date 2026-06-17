import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { readRequestMeta } from "@/lib/security/request";
import { isIpAllowed } from "@/lib/security/ip-allowlist";

/**
 * Enforce la allowlist de IP por cuenta en superficies que el layout de
 * `(sellers)` NO cubre: route handlers de `/api/sellers/*` y server actions.
 *
 * El layout solo envuelve el render de páginas RSC; un POST directo a un
 * endpoint o la invocación de una server action lo eluden por completo, así que
 * la allowlist (un control que el vendedor configura para restringir quién
 * opera su cuenta) no protegía las superficies que de verdad importan (PATCH de
 * precios, sync, facturación, settings). Este guard cierra ese hueco.
 *
 * Devuelve `true` si la cuenta tiene allowlist configurada y la IP de la
 * petición NO pasa. No-op (`false`) si no hay allowlist (feature opt-in) o si
 * no se puede resolver la cuenta. La IP se deriva de `readRequestMeta`, que ya
 * prioriza la cabecera de plataforma (Vercel) sobre las falsificables.
 */
export async function isSellerIpDenied(userId: string): Promise<boolean> {
  const acc = await prisma.sellerAccount
    .findUnique({ where: { userId }, select: { ipAllowlist: true } })
    .catch(() => null);
  if (!acc?.ipAllowlist || acc.ipAllowlist.trim().length === 0) return false;
  const h = await headers();
  const meta = readRequestMeta(new Request("http://x", { headers: h }));
  return !isIpAllowed(meta.ip, acc.ipAllowlist);
}
