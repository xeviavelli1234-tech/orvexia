"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/session";
import {
  setListingEnabled,
  setListingRange,
  setListingStrategy,
  setListingCompetition,
  pauseAllForUser,
  bulkSetEnabled,
  bulkSetUseDefaults,
  setListingTags,
  bulkApplyTag,
  importListingConfig,
  type ImportRow,
} from "@/lib/db/sellerListing";
import {
  setAccountSettings,
  exportSellerData,
  deleteSellerAccount,
} from "@/lib/db/sellerAccount";

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
  shippingCost: z.number().min(0).max(99999).nullable(),
  fbaFee: z.number().min(0).max(99999).nullable(),
  vatRate: z.number().min(0).max(100).nullable(),
  feePercent: z.number().min(0).max(100).nullable(),
  targetMargin: z.number().min(0).max(95).nullable(),
  noCompetition: z.enum(["MAX", "HOLD", "STEP_UP"]),
  stepUpType: z.enum(["AMOUNT", "PERCENT"]),
  stepUpValue: z.number().min(0).max(99999),
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
    shippingCost: num("shippingCost"),
    fbaFee: num("fbaFee"),
    vatRate: num("vatRate"),
    feePercent: num("feePercent"),
    targetMargin: num("targetMargin"),
    noCompetition: String(formData.get("noCompetition") ?? "MAX"),
    stepUpType: String(formData.get("stepUpType") ?? "AMOUNT"),
    stepUpValue: num("stepUpValue") ?? 0.05,
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
  excludeSellers: z.string().max(600),
  onlySellers: z.string().max(600),
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
    excludeSellers: String(formData.get("excludeSellers") ?? ""),
    onlySellers: String(formData.get("onlySellers") ?? ""),
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
  autoSyncHours: z.number().int().min(0).max(168),
  defaultStrategy: z.enum(["BUYBOX", "MATCH", "FIXED", "MARGIN"]),
  defaultUndercutType: z.enum(["AMOUNT", "PERCENT"]),
  defaultUndercutValue: z.number().min(0).max(99999),
  defaultNoCompetition: z.enum(["MAX", "HOLD", "STEP_UP"]),
  defaultStepUpType: z.enum(["AMOUNT", "PERCENT"]),
  defaultStepUpValue: z.number().min(0).max(99999),
  alertsEnabled: z.boolean(),
  alertEmail: z.string().max(200).nullable(),
  alertOnBuyBoxLost: z.boolean(),
  alertOnPriceFloor: z.boolean(),
  alertOnError: z.boolean(),
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
    autoSyncHours: numI("autoSyncHours", 0),
    defaultStrategy: String(formData.get("defaultStrategy") ?? "BUYBOX"),
    defaultUndercutType: String(formData.get("defaultUndercutType") ?? "AMOUNT"),
    defaultUndercutValue: numF("defaultUndercutValue", 0.01),
    defaultNoCompetition: String(formData.get("defaultNoCompetition") ?? "MAX"),
    defaultStepUpType: String(formData.get("defaultStepUpType") ?? "AMOUNT"),
    defaultStepUpValue: numF("defaultStepUpValue", 0.05),
    alertsEnabled: formData.get("alertsEnabled") === "true",
    alertEmail: ((): string | null => {
      const v = formData.get("alertEmail");
      const s = v == null ? "" : String(v).trim();
      return s === "" ? null : s;
    })(),
    alertOnBuyBoxLost: formData.get("alertOnBuyBoxLost") === "true",
    alertOnPriceFloor: formData.get("alertOnPriceFloor") === "true",
    alertOnError: formData.get("alertOnError") === "true",
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

export async function pauseAllAction(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  try {
    await pauseAllForUser(session.userId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }
  revalidatePath("/sellers/productos");
  return { ok: true };
}

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(2000),
  action: z.enum(["enable", "disable", "defaultsOn", "defaultsOff"]),
});

export async function bulkListingsAction(
  ids: string[],
  action: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const parsed = bulkSchema.safeParse({ ids, action });
  if (!parsed.success) return { ok: false, error: "validation_failed" };
  try {
    if (parsed.data.action === "enable")
      await bulkSetEnabled(session.userId, parsed.data.ids, true);
    else if (parsed.data.action === "disable")
      await bulkSetEnabled(session.userId, parsed.data.ids, false);
    else if (parsed.data.action === "defaultsOn")
      await bulkSetUseDefaults(session.userId, parsed.data.ids, true);
    else await bulkSetUseDefaults(session.userId, parsed.data.ids, false);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }
  revalidatePath("/sellers/productos");
  return { ok: true };
}

const tagsSchema = z.object({
  listingId: z.string().min(1),
  tags: z.string().max(600),
});

export async function updateListingTagsAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const parsed = tagsSchema.safeParse({
    listingId: String(formData.get("listingId") ?? ""),
    tags: String(formData.get("tags") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "validation_failed" };
  try {
    await setListingTags({ userId: session.userId, ...parsed.data });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }
  revalidatePath("/sellers/productos");
  return { ok: true };
}

const bulkTagSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(2000),
  tag: z.string().min(1).max(24),
  mode: z.enum(["add", "remove"]),
});

export async function bulkTagAction(
  ids: string[],
  tag: string,
  mode: string,
): Promise<ActionResult & { count?: number }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  const parsed = bulkTagSchema.safeParse({ ids, tag: tag.trim(), mode });
  if (!parsed.success) return { ok: false, error: "validation_failed" };
  try {
    const r = await bulkApplyTag(
      session.userId,
      parsed.data.ids,
      parsed.data.tag,
      parsed.data.mode,
    );
    revalidatePath("/sellers/productos");
    return { ok: true, count: r.count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }
}

/** Importa configuración desde el texto de un CSV (cabecera + filas). */
export async function importConfigAction(
  csv: string,
): Promise<ActionResult & { updated?: number; skipped?: number }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };

  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { ok: false, error: "csv_vacio" };

  const parseLine = (l: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (q) {
        if (c === '"' && l[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const skuI = idx("sku");
  if (skuI < 0) return { ok: false, error: "falta_columna_sku" };

  const num = (s: string | undefined): number | null | undefined => {
    if (s === undefined) return undefined;
    if (s === "") return null;
    const n = Number.parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  };
  const bool = (s: string | undefined): boolean | undefined => {
    if (s === undefined || s === "") return undefined;
    return s === "1" || s.toLowerCase() === "true" || s.toLowerCase() === "sí";
  };
  const enumOf = <T extends string>(s: string | undefined, allowed: T[]): T | undefined =>
    s && (allowed as string[]).includes(s) ? (s as T) : undefined;

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseLine(lines[i]);
    const sku = c[skuI];
    if (!sku) continue;
    const get = (n: string) => (idx(n) >= 0 ? c[idx(n)] : undefined);
    rows.push({
      sku,
      tags: get("tags"),
      priceMin: num(get("pricemin")),
      priceMax: num(get("pricemax")),
      strategy: enumOf(get("strategy"), ["BUYBOX", "MATCH", "FIXED", "MARGIN"]),
      undercutType: enumOf(get("undercuttype"), ["AMOUNT", "PERCENT"]),
      undercutValue: num(get("undercutvalue")) ?? undefined,
      fixedPrice: num(get("fixedprice")),
      cost: num(get("cost")),
      shippingCost: num(get("shippingcost")),
      fbaFee: num(get("fbafee")),
      vatRate: num(get("vatrate")),
      feePercent: num(get("feepercent")),
      targetMargin: num(get("targetmargin")),
      noCompetition: enumOf(get("nocompetition"), ["MAX", "HOLD", "STEP_UP"]),
      stepUpType: enumOf(get("stepuptype"), ["AMOUNT", "PERCENT"]),
      stepUpValue: num(get("stepupvalue")) ?? undefined,
      ignoreAmazon: bool(get("ignoreamazon")),
      fulfillmentFilter: enumOf(get("fulfillmentfilter"), ["ANY", "FBA", "FBM"]),
      minSellerRating: num(get("minsellerrating")),
      excludeSellers: get("excludesellers"),
      onlySellers: get("onlysellers"),
      useAccountDefaults: bool(get("useaccountdefaults")),
    });
  }
  if (rows.length === 0) return { ok: false, error: "sin_filas" };

  try {
    const r = await importListingConfig(session.userId, rows);
    revalidatePath("/sellers/productos");
    return { ok: true, updated: r.updated, skipped: r.skipped };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }
}

/** RGPD — exporta los datos del repricer del usuario (JSON string). */
export async function exportMyDataAction(): Promise<
  (ActionResult & { json?: string }) 
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  try {
    const data = await exportSellerData(session.userId);
    if (!data) return { ok: false, error: "no_account" };
    return { ok: true, json: JSON.stringify(data, null, 2) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }
}

/** RGPD — borrado total de la cuenta de repricer y sus datos. */
export async function deleteMyAccountAction(
  confirm: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "unauthorized" };
  if (confirm !== "ELIMINAR") return { ok: false, error: "confirm_required" };
  try {
    await deleteSellerAccount(session.userId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "db_failed" };
  }
  revalidatePath("/sellers/productos");
  revalidatePath("/dashboard");
  return { ok: true };
}
