import "server-only";
import { prisma } from "@/lib/prisma";
import type { GroupedProduct } from "./csv-import";
import type { Category } from "@/app/generated/prisma/client";

export interface ApplyResult {
  productsCreated: number;
  productsUpdated: number;
  offersCreated: number;
  offersUpdated: number;
  priceHistoryEntries: number;
  errors: string[];
}

/**
 * Aplica un lote de productos agrupados al catálogo:
 *  - upsert Product por slug (clave única ya existente).
 *  - upsert Offer por (productId, store).
 *  - Si el precio de una oferta CAMBIA respecto al actual, registra
 *    una entrada en PriceHistory para alimentar gráficos / mínimo histórico.
 *  - Calcula discountPercent a partir de price_old.
 */
export async function applyCsvProducts(
  products: GroupedProduct[],
): Promise<ApplyResult> {
  const result: ApplyResult = {
    productsCreated: 0,
    productsUpdated: 0,
    offersCreated: 0,
    offersUpdated: 0,
    priceHistoryEntries: 0,
    errors: [],
  };

  for (const p of products) {
    try {
      // 1) Upsert Product
      const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
      const productData = {
        slug: p.slug,
        name: p.name,
        category: p.category as Category,
        brand: p.brand,
        model: p.model,
        image: p.imageUrl,
        description: p.description,
      };
      let productId: string;
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: productData.name,
            category: productData.category,
            brand: productData.brand,
            model: productData.model,
            // No machacar la imagen si la fila no trae una nueva
            ...(productData.image ? { image: productData.image } : {}),
            ...(productData.description ? { description: productData.description } : {}),
          },
        });
        productId = existing.id;
        result.productsUpdated++;
      } else {
        const created = await prisma.product.create({
          data: {
            ...productData,
            images: [],
          },
          select: { id: true },
        });
        productId = created.id;
        result.productsCreated++;
      }

      // 2) Upsert ofertas (una por tienda). Si la fila es "solo producto",
      // p.offers viene vacío y este bucle no hace nada.
      for (const o of p.offers) {
        const discount =
          o.priceOld && o.priceOld > o.price
            ? Math.round(((o.priceOld - o.price) / o.priceOld) * 100)
            : null;

        const existingOffer = await prisma.offer.findUnique({
          where: {
            productId_store: { productId, store: o.store },
          },
        });

        if (existingOffer) {
          const priceChanged = existingOffer.priceCurrent !== o.price;
          await prisma.offer.update({
            where: { id: existingOffer.id },
            data: {
              priceCurrent: o.price,
              priceOld: o.priceOld,
              discountPercent: discount,
              externalUrl: o.externalUrl,
              inStock: o.inStock,
            },
          });
          result.offersUpdated++;
          if (priceChanged) {
            await prisma.priceHistory.create({
              data: { productId, store: o.store, price: o.price },
            });
            result.priceHistoryEntries++;
          }
        } else {
          await prisma.offer.create({
            data: {
              productId,
              store: o.store,
              priceCurrent: o.price,
              priceOld: o.priceOld,
              discountPercent: discount,
              externalUrl: o.externalUrl,
              inStock: o.inStock,
            },
          });
          // Snapshot inicial al crear la oferta
          await prisma.priceHistory.create({
            data: { productId, store: o.store, price: o.price },
          });
          result.offersCreated++;
          result.priceHistoryEntries++;
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`[${p.slug}] ${msg}`);
    }
  }

  return result;
}
