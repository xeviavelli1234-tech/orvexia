import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = session.userId;

  const [saved, alerts] = await Promise.all([
    prisma.savedProduct.findMany({
      where: { userId },
      include: {
        product: {
          include: { offers: { orderBy: { priceCurrent: "asc" } } },
        },
      },
      orderBy: { savedAt: "desc" },
    }),
    prisma.priceAlert.findMany({
      where: { userId, active: true },
      include: {
        product: {
          include: { offers: { orderBy: { priceCurrent: "asc" } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Calcular ahorro potencial
  const potentialSavings = saved.reduce((sum, sp) => {
    const offer = sp.product.offers[0];
    if (offer?.priceOld && offer.priceCurrent < offer.priceOld) {
      return sum + (offer.priceOld - offer.priceCurrent);
    }
    return sum;
  }, 0);

  // Detectar bajadas recientes (productos guardados cuyo precio bajó)
  const recentDrops = saved
    .filter((sp) => {
      const offer = sp.product.offers[0];
      return offer?.priceOld && offer.priceCurrent < offer.priceOld;
    })
    .map((sp) => {
      const offer = sp.product.offers[0]!;
      const drop = offer.priceOld! - offer.priceCurrent;
      const dropPercent = Math.round((drop / offer.priceOld!) * 100);
      return {
        productId: sp.product.id,
        slug: sp.product.slug,
        name: sp.product.name,
        brand: sp.product.brand,
        category: sp.product.category,
        description: sp.product.description,
        image: sp.product.image,
        images: sp.product.images,
        rating: sp.product.rating,
        reviewCount: sp.product.reviewCount,
        offers: sp.product.offers.map((o) => ({
          store: o.store,
          priceCurrent: o.priceCurrent,
          priceOld: o.priceOld,
          discountPercent: o.discountPercent,
          externalUrl: o.externalUrl,
        })),
        priceCurrent: offer.priceCurrent,
        priceOld: offer.priceOld,
        drop,
        dropPercent,
        store: offer.store,
        externalUrl: offer.externalUrl,
      };
    })
    .sort((a, b) => b.dropPercent - a.dropPercent)
    .slice(0, 5);

  // Alertas disparadas (precio actual <= objetivo)
  const triggeredAlerts = alerts.filter((a) => {
    const offer = a.product.offers[0];
    return offer && offer.priceCurrent < a.targetPrice;
  });

  // Recomendados ponderados por lo que has guardado (más del top de categorías, pero variedad)
  const savedIds = new Set(saved.map((s) => s.productId));
  const categoryCounts = saved.reduce<Record<string, number>>((acc, sp) => {
    acc[sp.product.category] = (acc[sp.product.category] ?? 0) + 1;
    return acc;
  }, {});
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  const primaryCat = sortedCategories[0];
  const secondaryCats = sortedCategories.slice(1);

  const recommended: typeof prisma.product.$inferSelect[] = [];

  // Helper para evitar duplicados
  const pushUnique = (items: typeof recommended) => {
    for (const p of items) {
      if (!recommended.find((r) => r.id === p.id)) {
        recommended.push(p);
      }
    }
  };

  if (primaryCat) {
    const primaryBatch = await prisma.product.findMany({
      where: {
        category: primaryCat as never,
        id: { notIn: [...savedIds] },
        offers: { some: { discountPercent: { gt: 0 }, priceOld: { not: null } } },
      },
      include: { offers: { orderBy: { discountPercent: "desc" } } },
      take: 4,
      orderBy: { createdAt: "desc" },
    });
    pushUnique(primaryBatch);
  }

  if (recommended.length < 6) {
    const secondaryBatch = await prisma.product.findMany({
      where: {
        category: secondaryCats.length > 0 ? ({ in: secondaryCats as never[] } as never) : undefined,
        id: { notIn: [...savedIds, ...recommended.map((r) => r.id)] },
        offers: { some: { discountPercent: { gt: 0 }, priceOld: { not: null } } },
      },
      include: { offers: { orderBy: { discountPercent: "desc" } } },
      take: 6 - recommended.length,
      orderBy: { createdAt: "desc" },
    });
    pushUnique(secondaryBatch);
  }

  // Fallback si no hay suficientes (o no había guardados)
  if (recommended.length < 6) {
    const fallback = await prisma.product.findMany({
      where: {
        id: { notIn: [...savedIds, ...recommended.map((r) => r.id)] },
        offers: { some: { discountPercent: { gt: 0 }, priceOld: { not: null } } },
      },
      include: { offers: { orderBy: { discountPercent: "desc" } } },
      take: 6 - recommended.length,
      orderBy: { createdAt: "desc" },
    });
    pushUnique(fallback);
  }

  return NextResponse.json({
    stats: {
      savedCount: saved.length,
      alertsActive: alerts.length,
      alertsTriggered: triggeredAlerts.length,
      potentialSavings: Math.round(potentialSavings * 100) / 100,
    },
    savedProducts: saved.map((sp) => ({
      id: sp.id,
      productId: sp.product.id,
      slug: sp.product.slug,
      name: sp.product.name,
      brand: sp.product.brand,
      category: sp.product.category,
      description: sp.product.description,
      image: sp.product.image,
      images: sp.product.images,
      rating: sp.product.rating,
      reviewCount: sp.product.reviewCount,
      offers: sp.product.offers.map((o) => ({
        store: o.store,
        priceCurrent: o.priceCurrent,
        priceOld: o.priceOld,
        discountPercent: o.discountPercent,
        externalUrl: o.externalUrl,
      })),
      priceCurrent: sp.product.offers[0]?.priceCurrent ?? null,
      priceOld: sp.product.offers[0]?.priceOld ?? null,
      discountPercent: sp.product.offers[0]?.discountPercent ?? null,
      store: sp.product.offers[0]?.store ?? null,
      externalUrl: sp.product.offers[0]?.externalUrl ?? null,
      savedAt: sp.savedAt,
    })),
    recentDrops,
    alerts: alerts.map((a) => {
      const offer = a.product.offers[0];
      const current = offer?.priceCurrent ?? null;
      return {
        id: a.id,
        productId: a.product.id,
        slug: a.product.slug,
        productName: a.product.name,
        productImage: a.product.image,
        brand: a.product.brand,
        category: a.product.category,
        description: a.product.description,
        images: a.product.images,
        rating: a.product.rating,
        reviewCount: a.product.reviewCount,
        offers: a.product.offers.map((o) => ({
          store: o.store,
          priceCurrent: o.priceCurrent,
          priceOld: o.priceOld,
          discountPercent: o.discountPercent,
          externalUrl: o.externalUrl,
        })),
        store: a.store,
        targetPrice: a.targetPrice,
        currentPrice: current,
        difference: current !== null ? current - a.targetPrice : null,
        triggered: current !== null && current < a.targetPrice,
        active: a.active,
        createdAt: a.createdAt,
      };
    }),
    recommended: recommended.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      image: p.image,
      images: p.images,
      rating: p.rating,
      reviewCount: p.reviewCount,
      offers: p.offers.map((o) => ({
        store: o.store,
        priceCurrent: o.priceCurrent,
        priceOld: o.priceOld,
        discountPercent: o.discountPercent,
        externalUrl: o.externalUrl,
      })),
      priceCurrent: p.offers[0]?.priceCurrent ?? null,
      priceOld: p.offers[0]?.priceOld ?? null,
      discountPercent: p.offers[0]?.discountPercent ?? null,
      store: p.offers[0]?.store ?? null,
      externalUrl: p.offers[0]?.externalUrl ?? null,
    })),
  });
}
