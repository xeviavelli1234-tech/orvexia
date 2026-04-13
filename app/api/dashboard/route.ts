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

  // Score bayesiano: rating * log(reviewCount + 1)
  // Premia productos bien valorados Y con muchas reseñas
  function bayesianScore(rating: number | null, reviewCount: number | null): number {
    return (rating ?? 0) * Math.log((reviewCount ?? 0) + 1);
  }

  // Traemos un pool amplio y luego ordenamos por popularidad en memoria
  const poolSize = 40;

  const [primaryPool, secondaryPool, fallbackPool] = await Promise.all([
    primaryCat ? prisma.product.findMany({
      where: {
        category: primaryCat as never,
        id: { notIn: [...savedIds] },
        offers: { some: { discountPercent: { gt: 0 }, priceOld: { not: null } } },
      },
      include: { offers: { orderBy: { discountPercent: "desc" } } },
      take: poolSize,
    }) : Promise.resolve([]),

    secondaryCats.length > 0 ? prisma.product.findMany({
      where: {
        category: { in: secondaryCats as never[] } as never,
        id: { notIn: [...savedIds] },
        offers: { some: { discountPercent: { gt: 0 }, priceOld: { not: null } } },
      },
      include: { offers: { orderBy: { discountPercent: "desc" } } },
      take: poolSize,
    }) : Promise.resolve([]),

    prisma.product.findMany({
      where: {
        id: { notIn: [...savedIds] },
        offers: { some: { discountPercent: { gt: 0 }, priceOld: { not: null } } },
      },
      include: { offers: { orderBy: { discountPercent: "desc" } } },
      take: poolSize,
    }),
  ]);

  // Ordenar cada pool por score bayesiano descendente
  const sortByPopularity = <T extends { rating: number | null; reviewCount: number | null }>(items: T[]) =>
    [...items].sort((a, b) => bayesianScore(b.rating, b.reviewCount) - bayesianScore(a.rating, a.reviewCount));

  type ProductWithOffers = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & { offers: { store: string; priceCurrent: number; priceOld: number | null; discountPercent: number | null; externalUrl: string }[] };
  const recommended: ProductWithOffers[] = [];
  const seenIds = new Set<string>();

  const pushUnique = (items: ProductWithOffers[]) => {
    for (const p of items) {
      if (!seenIds.has(p.id) && recommended.length < 6) {
        seenIds.add(p.id);
        recommended.push(p);
      }
    }
  };

  pushUnique(sortByPopularity(primaryPool));
  pushUnique(sortByPopularity(secondaryPool));
  pushUnique(sortByPopularity(fallbackPool));

  // Productos sin descuento — aleatorios en cada request (skip random)
  const totalNoDiscount = await prisma.product.count({
    where: { offers: { some: { discountPercent: null, priceOld: null } } },
  });
  const skipNoDiscount = Math.max(0, Math.floor(Math.random() * Math.max(1, totalNoDiscount - 6)));
  const noDiscountProducts = await prisma.product.findMany({
    where: { offers: { some: { discountPercent: null, priceOld: null } } },
    include: { offers: { orderBy: { priceCurrent: "asc" } } },
    take: 6,
    skip: skipNoDiscount,
  });

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
      notifyOnDiscount: sp.notifyOnDiscount,
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
    noDiscount: noDiscountProducts.map((p) => ({
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
      discountPercent: null,
      store: p.offers[0]?.store ?? null,
      externalUrl: p.offers[0]?.externalUrl ?? null,
    })),
  });
}
