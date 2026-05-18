"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/session";
import {
  setListingEnabled,
  setListingRange,
  setListingStrategy,
  setListingCompetition,
} from "@/lib/db/sellerListing";
import { setAccountSettings } from "@/lib/db/sellerAccount";

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

const strategySchema = z.object({
  listingId: z.string().min(1),
  strategy: z.enum(["BUYBOX", "MATCH", "FIXED", "MARGIN"]),
  undercutType: z.enum(["AMOUNT", "PERCENT"]),
  undercutValue: z.number().min(0).max(99999),
  fixedPrice: z.number().positive().max(99999).nullable(),
  cost: z.number().positive().max(99999).nullable(),
  feePercent: z.number().min(0).max(100).nullable(),
  targetMargin: z.number().min(0).max(95).nullable(),
  noCompetition: z.enum(["MAX", "HOLD"]),
});

export async function updateListingStrategyAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const num = (k: string) => {
    const v = formData.get(k);
    if (v == null) return null;
    const s = String(v).trim().replace(",", ".");
    if (s === "") return null;
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  };

  const parsed = strategySchema.safeParse({
    listingId: String(formData.get("listingId") ?? ""),
    strategy: String(formData.get("strategy") ?? "BUYBOX"),
    undercutType: String(formData.get("undercutType") ?? "AMOUNT"),
    undercutValue: num("undercutValue") ?? 0.01,
    fixedPrice: num("fixedPrice"),
    cost: num("cost"),
    feePercent: num("feePercent"),
    targetMargin: num("targetMargin"),
    noCompetition: String(formData.get("noCompetition") ?? "MAX"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "validation_failed" };
  }

  try {
    await setListingStrategy({ userId: session.userId, ...parsed.data });
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

const competitionSchema = z.object({
  listingId: z.string().min(1),
  useAccountDefaults: z.boolean(),
  ignoreAmazon: z.boolean(),
  fulfillmentFilter: z.enum(["ANY", "FBA", "FBM"]),
  minSellerRating: z.number().min(0).max(5).nullable(),
});

export async function updateListingCompetitionAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const ratingRaw = formData.get("minSellerRating");
  const ratingStr = ratingRaw == null ? "" : String(ratingRaw).trim().replace(",", ".");
  const minSellerRating = ratingStr === "" ? null : Number.parseFloat(ratingStr);

  const parsed = competitionSchema.safeParse({
    listingId: String(formData.get("listingId") ?? ""),
    useAccountDefaults: formData.get("useAccountDefaults") === "true",
    ignoreAmazon: formData.get("ignoreAmazon") === "true",
    fulfillmentFilter: String(formData.get("fulfillmentFilter") ?? "ANY"),
    minSellerRating: minSellerRating != null && Number.isFinite(minSellerRating)
      ? minSellerRating
      : null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "validation_failed" };
  }

  try {
    await setListingCompetition({ userId: session.userId, ...parsed.data });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }
  revalidatePath("/sellers/productos");
  return { ok: true };
}

const settingsSchema = z.object({
  scheduleEnabled: z.boolean(),
  scheduleStartHour: z.number().int().min(0).max(23),
  scheduleEndHour: z.number().int().min(1).max(24),
  dryRun: z.boolean(),
  patchDelayMs: z.number().int().min(0).max(10000),
  defaultStrategy: z.enum(["BUYBOX", "MATCH", "FIXED", "MARGIN"]),
  defaultUndercutType: z.enum(["AMOUNT", "PERCENT"]),
  defaultUndercutValue: z.number().min(0).max(99999),
  defaultNoCompetition: z.enum(["MAX", "HOLD"]),
});

export async function updateAccountSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const numI = (k: string, d: number) => {
    const v = formData.get(k);
    const n = v == null ? d : parseInt(String(v), 10);
    return Number.isFinite(n) ? n : d;
  };
  const numF = (k: string, d: number) => {
    const v = formData.get(k);
    const n = v == null ? d : Number.parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : d;
  };

  const parsed = settingsSchema.safeParse({
    scheduleEnabled: formData.get("scheduleEnabled") === "true",
    scheduleStartHour: numI("scheduleStartHour", 0),
    scheduleEndHour: numI("scheduleEndHour", 24),
    dryRun: formData.get("dryRun") === "true",
    patchDelayMs: numI("patchDelayMs", 0),
    defaultStrategy: String(formData.get("defaultStrategy") ?? "BUYBOX"),
    defaultUndercutType: String(formData.get("defaultUndercutType") ?? "AMOUNT"),
    defaultUndercutValue: numF("defaultUndercutValue", 0.01),
    defaultNoCompetition: String(formData.get("defaultNoCompetition") ?? "MAX"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "validation_failed" };
  }

  try {
    await setAccountSettings({ userId: session.userId, ...parsed.data });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }
  revalidatePath("/sellers/productos");
  return { ok: true };
}
