import "server-only";
import { prisma } from "@/lib/prisma";
import type { NormalizedListing } from "@/lib/amazon/listings";
import { normalizeTags, addTag, removeTag } from "@/lib/tags";
import { normalizeAsin } from "@/lib/variations";

export async function listListingsByAccount(sellerAccountId: string) {
  return prisma.sellerListing.findMany({
    where: { sellerAccountId },
    orderBy: [{ repricingEnabled: "desc" }, { title: "asc" }],
  });
}

export async function getListingForUser(params: { listingId: string; userId: string }) {
  return prisma.sellerListing.findFirst({
    where: { id: params.listingId, sellerAccount: { userId: params.userId } },
  });
}

export async function upsertListingsBatch(params: {
  sellerAccountId: string;
  items: NormalizedListing[];
}): Promise<{ inserted: number; updated: number; deleted: number }> {
  let inserted = 0;
  let updated = 0;
  for (const item of params.items) {
    const result = await prisma.sellerListing.upsert({
      where: {
        sellerAccountId_sku: {
          sellerAccountId: params.sellerAccountId,
          sku: item.sku,
        },
      },
      create: {
        sellerAccountId: params.sellerAccountId,
        asin: item.asin,
        sku: item.sku,
        title: item.title,
        imageUrl: item.imageUrl ?? undefined,
        productType: item.productType ?? undefined,
        priceCurrent: item.priceCurrent,
        currency: item.currency,
      },
      update: {
        asin: item.asin,
        title: item.title,
        imageUrl: item.imageUrl ?? undefined,
        productType: item.productType ?? undefined,
        priceCurrent: item.priceCurrent,
        currency: item.currency,
      },
      select: { createdAt: true, updatedAt: true },
    });
    // Cheap heuristic to count inserted vs updated
    if (result.createdAt.getTime() === result.updatedAt.getTime()) inserted += 1;
    else updated += 1;
  }

  // Amazon es la fuente de verdad: borra listings que ya no están en el
  // catálogo del seller (p.ej. restos del modo demo al pasar a producción,
  // o productos retirados de Amazon). Si el fetch vino vacío, limpia todo.
  const keepSkus = params.items.map((i) => i.sku);
  const deleted = await prisma.sellerListing.deleteMany({
    where: {
      sellerAccountId: params.sellerAccountId,
      sku: { notIn: keepSkus.length > 0 ? keepSkus : ["__none__"] },
    },
  });

  return { inserted, updated, deleted: deleted.count };
}

export async function setListingRange(params: {
  listingId: string;
  userId: string;
  priceMin: number | null;
  priceMax: number | null;
}) {
  // Ownership check
  const existing = await getListingForUser({
    listingId: params.listingId,
    userId: params.userId,
  });
  if (!existing) throw new Error("listing_not_found_or_not_owned");

  const repricingEnabled = params.priceMin != null && params.priceMax != null;

  return prisma.sellerListing.update({
    where: { id: params.listingId },
    data: {
      priceMin: params.priceMin,
      priceMax: params.priceMax,
      repricingEnabled,
    },
  });
}

export async function setListingCompetition(params: {
  listingId: string;
  userId: string;
  useAccountDefaults: boolean;
  ignoreAmazon: boolean;
  fulfillmentFilter: "ANY" | "FBA" | "FBM";
  minSellerRating: number | null;
  excludeSellers: string;
  onlySellers: string;
}) {
  const existing = await getListingForUser({
    listingId: params.listingId,
    userId: params.userId,
  });
  if (!existing) throw new Error("listing_not_found_or_not_owned");
  if (
    params.minSellerRating != null &&
    (params.minSellerRating < 0 || params.minSellerRating > 5)
  ) {
    throw new Error("invalid_rating");
  }
  return prisma.sellerListing.update({
    where: { id: params.listingId },
    data: {
      useAccountDefaults: params.useAccountDefaults,
      ignoreAmazon: params.ignoreAmazon,
      fulfillmentFilter: params.fulfillmentFilter,
      minSellerRating: params.minSellerRating,
      excludeSellers: normalizeTags(params.excludeSellers),
      onlySellers: normalizeTags(params.onlySellers),
    },
  });
}

export async function setListingStrategy(params: {
  listingId: string;
  userId: string;
  strategy: "BUYBOX" | "MATCH" | "FIXED" | "MARGIN";
  undercutType: "AMOUNT" | "PERCENT";
  undercutValue: number;
  fixedPrice: number | null;
  cost: number | null;
  shippingCost: number | null;
  fbaFee: number | null;
  vatRate: number | null;
  feePercent: number | null;
  targetMargin: number | null;
  noCompetition: "MAX" | "HOLD" | "STEP_UP";
  stepUpType: "AMOUNT" | "PERCENT";
  stepUpValue: number;
}) {
  const existing = await getListingForUser({
    listingId: params.listingId,
    userId: params.userId,
  });
  if (!existing) throw new Error("listing_not_found_or_not_owned");

  if (params.strategy === "FIXED" && !(params.fixedPrice && params.fixedPrice > 0)) {
    throw new Error("fixed_price_required");
  }
  if (params.strategy === "MARGIN" && !(params.cost && params.cost > 0)) {
    throw new Error("cost_required");
  }
  if (!(params.undercutValue >= 0)) throw new Error("invalid_undercut");

  return prisma.sellerListing.update({
    where: { id: params.listingId },
    data: {
      strategy: params.strategy,
      undercutType: params.undercutType,
      undercutValue: params.undercutValue,
      fixedPrice: params.fixedPrice,
      cost: params.cost,
      shippingCost: params.shippingCost,
      fbaFee: params.fbaFee,
      vatRate: params.vatRate,
      feePercent: params.feePercent,
      targetMargin: params.targetMargin,
      noCompetition: params.noCompetition,
      stepUpType: params.stepUpType,
      stepUpValue: Math.max(0, params.stepUpValue),
    },
  });
}

export async function setListingEnabled(params: {
  listingId: string;
  userId: string;
  enabled: boolean;
}) {
  const existing = await getListingForUser({
    listingId: params.listingId,
    userId: params.userId,
  });
  if (!existing) throw new Error("listing_not_found_or_not_owned");

  // Cannot enable without min/max
  if (params.enabled && (existing.priceMin == null || existing.priceMax == null)) {
    throw new Error("missing_price_range");
  }

  // Cannot enable a listing with no current price or no ASIN: el motor no
  // podría calcular ni pedir precio de competencia. Se ve en la lista pero
  // no se reprecia hasta que tenga oferta válida en Amazon.
  if (params.enabled && (existing.priceCurrent <= 0 || !existing.asin)) {
    throw new Error("listing_not_repriceable");
  }

  return prisma.sellerListing.update({
    where: { id: params.listingId },
    data: { repricingEnabled: params.enabled },
  });
}

// ── Operativa de catálogo (acciones masivas / import) ──

export async function pauseAllForUser(userId: string) {
  return prisma.sellerListing.updateMany({
    where: { sellerAccount: { userId }, repricingEnabled: true },
    data: { repricingEnabled: false },
  });
}

export async function bulkSetEnabled(
  userId: string,
  ids: string[],
  enabled: boolean,
) {
  if (ids.length === 0) return { count: 0 };
  if (!enabled) {
    return prisma.sellerListing.updateMany({
      where: { id: { in: ids }, sellerAccount: { userId } },
      data: { repricingEnabled: false },
    });
  }
  // Solo se activan los que tienen rango, precio y ASIN válidos.
  return prisma.sellerListing.updateMany({
    where: {
      id: { in: ids },
      sellerAccount: { userId },
      priceMin: { not: null },
      priceMax: { not: null },
      priceCurrent: { gt: 0 },
      asin: { not: "" },
    },
    data: { repricingEnabled: true },
  });
}

export async function bulkSetUseDefaults(
  userId: string,
  ids: string[],
  value: boolean,
) {
  if (ids.length === 0) return { count: 0 };
  return prisma.sellerListing.updateMany({
    where: { id: { in: ids }, sellerAccount: { userId } },
    data: { useAccountDefaults: value },
  });
}

/** Reemplaza las etiquetas de un producto (normalizadas). */
export async function setListingTags(params: {
  listingId: string;
  userId: string;
  tags: string;
}) {
  const existing = await getListingForUser({
    listingId: params.listingId,
    userId: params.userId,
  });
  if (!existing) throw new Error("listing_not_found_or_not_owned");
  return prisma.sellerListing.update({
    where: { id: params.listingId },
    data: { tags: normalizeTags(params.tags) },
  });
}

/** Asigna el ASIN padre (variación) de un producto. */
export async function setListingParent(params: {
  listingId: string;
  userId: string;
  parentAsin: string;
}) {
  const existing = await getListingForUser({
    listingId: params.listingId,
    userId: params.userId,
  });
  if (!existing) throw new Error("listing_not_found_or_not_owned");
  return prisma.sellerListing.update({
    where: { id: params.listingId },
    data: { parentAsin: normalizeAsin(params.parentAsin).slice(0, 20) },
  });
}

/** Añade o quita una etiqueta a un conjunto de productos del usuario. */
export async function bulkApplyTag(
  userId: string,
  ids: string[],
  tag: string,
  mode: "add" | "remove",
): Promise<{ count: number }> {
  if (ids.length === 0 || !tag.trim()) return { count: 0 };
  const listings = await prisma.sellerListing.findMany({
    where: { id: { in: ids }, sellerAccount: { userId } },
    select: { id: true, tags: true },
  });
  let count = 0;
  for (const l of listings) {
    const next =
      mode === "add" ? addTag(l.tags, tag) : removeTag(l.tags, tag);
    if (next !== normalizeTags(l.tags)) {
      await prisma.sellerListing.update({
        where: { id: l.id },
        data: { tags: next },
      });
      count += 1;
    }
  }
  return { count };
}

export interface ImportRow {
  sku: string;
  tags?: string;
  parentAsin?: string;
  priceMin?: number | null;
  priceMax?: number | null;
  strategy?: "BUYBOX" | "MATCH" | "FIXED" | "MARGIN";
  undercutType?: "AMOUNT" | "PERCENT";
  undercutValue?: number;
  fixedPrice?: number | null;
  cost?: number | null;
  shippingCost?: number | null;
  fbaFee?: number | null;
  vatRate?: number | null;
  feePercent?: number | null;
  targetMargin?: number | null;
  noCompetition?: "MAX" | "HOLD" | "STEP_UP";
  stepUpType?: "AMOUNT" | "PERCENT";
  stepUpValue?: number;
  ignoreAmazon?: boolean;
  fulfillmentFilter?: "ANY" | "FBA" | "FBM";
  minSellerRating?: number | null;
  excludeSellers?: string;
  onlySellers?: string;
  useAccountDefaults?: boolean;
}

/** Actualiza configuración por SKU (solo del propio usuario). Tolerante. */
export async function importListingConfig(
  userId: string,
  rows: ImportRow[],
): Promise<{ updated: number; skipped: number }> {
  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!row.sku) {
      skipped += 1;
      continue;
    }
    const data: Record<string, unknown> = {};
    if (row.priceMin !== undefined) data.priceMin = row.priceMin;
    if (row.priceMax !== undefined) data.priceMax = row.priceMax;
    if (row.strategy) data.strategy = row.strategy;
    if (row.undercutType) data.undercutType = row.undercutType;
    if (row.undercutValue !== undefined) data.undercutValue = row.undercutValue;
    if (row.fixedPrice !== undefined) data.fixedPrice = row.fixedPrice;
    if (row.cost !== undefined) data.cost = row.cost;
    if (row.shippingCost !== undefined) data.shippingCost = row.shippingCost;
    if (row.fbaFee !== undefined) data.fbaFee = row.fbaFee;
    if (row.vatRate !== undefined) data.vatRate = row.vatRate;
    if (row.feePercent !== undefined) data.feePercent = row.feePercent;
    if (row.targetMargin !== undefined) data.targetMargin = row.targetMargin;
    if (row.tags !== undefined) data.tags = normalizeTags(row.tags);
    if (row.parentAsin !== undefined)
      data.parentAsin = normalizeAsin(row.parentAsin).slice(0, 20);
    if (row.noCompetition) data.noCompetition = row.noCompetition;
    if (row.stepUpType) data.stepUpType = row.stepUpType;
    if (row.stepUpValue !== undefined) data.stepUpValue = row.stepUpValue;
    if (row.ignoreAmazon !== undefined) data.ignoreAmazon = row.ignoreAmazon;
    if (row.fulfillmentFilter) data.fulfillmentFilter = row.fulfillmentFilter;
    if (row.minSellerRating !== undefined) data.minSellerRating = row.minSellerRating;
    if (row.excludeSellers !== undefined)
      data.excludeSellers = normalizeTags(row.excludeSellers);
    if (row.onlySellers !== undefined)
      data.onlySellers = normalizeTags(row.onlySellers);
    if (row.useAccountDefaults !== undefined)
      data.useAccountDefaults = row.useAccountDefaults;
    if (Object.keys(data).length === 0) {
      skipped += 1;
      continue;
    }
    const res = await prisma.sellerListing.updateMany({
      where: { sku: row.sku, sellerAccount: { userId } },
      data,
    });
    if (res.count > 0) updated += 1;
    else skipped += 1;
  }
  return { updated, skipped };
}
