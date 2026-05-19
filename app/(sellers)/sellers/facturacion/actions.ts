"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { setBillingProfile } from "@/lib/db/sellerAccount";
import { recordAudit } from "@/lib/db/audit";

export type BillingResult = { ok: true } | { ok: false; error: string };

export async function updateBillingProfileAction(
  formData: FormData,
): Promise<BillingResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  try {
    await setBillingProfile({
      userId: session.userId,
      billingName: String(formData.get("billingName") ?? ""),
      billingTaxId: String(formData.get("billingTaxId") ?? ""),
      billingAddress: String(formData.get("billingAddress") ?? ""),
      billingCountry: String(formData.get("billingCountry") ?? "ES"),
    });
    await recordAudit(
      session.userId,
      "account.billing",
      "Datos de facturación actualizados",
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }
  revalidatePath("/sellers/facturacion");
  revalidatePath("/sellers/facturacion/factura");
  return { ok: true };
}
