"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { setListingEnabled, setListingRange } from "@/lib/db/sellerListing";

const rangeSchema = z
  .object({
    listingId: z.string().min(1),
    priceMin: z.number().positive().max(99999).nullable(),
    priceMax: z.number().positive().max(99999).nullable(),
  })
  .refine(
    (v) => v.priceMin == null || v.priceMax == null || v.priceMax >= v.priceMin,
    { message: "price_max_must_be_greater_or_equal_to_min" },
  );

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function toNullableFloat(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export async function updateListingRangeAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const parsed = rangeSchema.safeParse({
    listingId: String(formData.get("listingId") ?? ""),
    priceMin: toNullableFloat(formData.get("priceMin")),
    priceMax: toNullableFloat(formData.get("priceMax")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "validation_failed" };
  }

  try {
    await setListingRange({
      listingId: parsed.data.listingId,
      userId: session.userId,
      priceMin: parsed.data.priceMin,
      priceMax: parsed.data.priceMax,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }

  revalidatePath("/sellers/productos");
  return { ok: true };
}

const toggleSchema = z.object({
  listingId: z.string().min(1),
  enabled: z.boolean(),
});

export async function toggleListingAction(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const parsed = toggleSchema.safeParse({
    listingId: String(formData.get("listingId") ?? ""),
    enabled: formData.get("enabled") === "true",
  });
  if (!parsed.success) {
    return { ok: false, error: "validation_failed" };
  }

  try {
    await setListingEnabled({
      listingId: parsed.data.listingId,
      userId: session.userId,
      enabled: parsed.data.enabled,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }

  revalidatePath("/sellers/productos");
  return { ok: true };
}
