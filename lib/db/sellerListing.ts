import "server-only";
import { prisma } from "@/lib/prisma";
import type { NormalizedListing } from "@/lib/amazon/listings";

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
}): Promise<{ inserted: number; updated: number }> {
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
  return { inserted, updated };
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

  return prisma.sellerListing.update({
    where: { id: params.listingId },
    data: { repricingEnabled: params.enabled },
  });
}
