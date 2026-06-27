"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getSellerAccountByUserId } from "@/lib/db/sellerAccount";
import { isSellerIpDenied } from "@/lib/security/seller-access";
import { recordAudit } from "@/lib/db/audit";
import { auditReimbursementsForAccount } from "@/lib/reimbursements/audit";
import { updateClaimStatus, type ClaimAction } from "@/lib/reimbursements/data";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Lanza una auditoría de reembolsos para la cuenta del usuario actual. */
export async function runAuditAction(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (await isSellerIpDenied(session.userId)) return { ok: false, error: "ip_not_allowed" };

  const account = await getSellerAccountByUserId(session.userId);
  if (!account || !account.active || account.mode !== "amazon") {
    return { ok: false, error: "no_amazon_account" };
  }

  try {
    const result = await auditReimbursementsForAccount(account.id);
    if (result.errors.length > 0) {
      return { ok: false, error: result.errors[0] };
    }
    await recordAudit(
      session.userId,
      "reimbursements.audit",
      `Auditoría: ${result.candidates} candidatas, ${result.created} nuevas`,
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "audit_failed" };
  }
  revalidatePath("/sellers/reembolsos");
  return { ok: true };
}

const VALID_ACTIONS: ClaimAction[] = [
  "mark_ready",
  "mark_filed",
  "mark_recovered",
  "mark_rejected",
];

/** Cambia el estado de una reclamación (revisada / presentada / recuperada / rechazada). */
export async function claimStatusAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (await isSellerIpDenied(session.userId)) return { ok: false, error: "ip_not_allowed" };

  const claimId = String(formData.get("claimId") ?? "");
  const action = String(formData.get("action") ?? "") as ClaimAction;
  if (!claimId || !VALID_ACTIONS.includes(action)) {
    return { ok: false, error: "bad_request" };
  }

  const rawAmount = formData.get("recoveredAmount");
  const recoveredAmount =
    rawAmount != null && String(rawAmount).trim() !== ""
      ? Number(String(rawAmount).replace(",", "."))
      : null;

  const res = await updateClaimStatus({
    userId: session.userId,
    claimId,
    action,
    recoveredAmount,
  });
  if (!res.ok) return res;

  await recordAudit(session.userId, "reimbursements.status", `${action} · ${claimId}`);
  revalidatePath("/sellers/reembolsos");
  return { ok: true };
}
