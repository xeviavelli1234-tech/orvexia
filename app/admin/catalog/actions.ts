"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");
  const admin = await isAdminUser(session.userId);
  if (!admin) throw new Error("forbidden");
  return session;
}

/** Borra un producto y, en cascada, sus ofertas, historial, etc. */
export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await prisma.product.delete({ where: { id } });
  } catch (e) {
    console.warn("[catalog] delete product failed:", e);
  }
  revalidatePath("/admin/catalog/products");
  revalidatePath("/admin/catalog");
  revalidatePath("/categorias");
  revalidatePath("/ofertas-destacadas");
  revalidatePath("/bajadas-recientes");
}

/** Borra una oferta concreta (una tienda). El producto sigue existiendo. */
export async function deleteOfferAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await prisma.offer.delete({ where: { id } });
  } catch (e) {
    console.warn("[catalog] delete offer failed:", e);
  }
  revalidatePath("/admin/catalog/products");
  revalidatePath("/admin/catalog");
}

/** Actualiza precio actual (y opcionalmente priceOld) de una oferta. Crea entrada en PriceHistory si cambia. */
export async function updateOfferPriceAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const priceStr = String(formData.get("price") ?? "").trim();
  const priceOldStr = String(formData.get("priceOld") ?? "").trim();
  if (!id || !priceStr) return;
  const price = Number(priceStr.replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) return;
  const priceOld = priceOldStr ? Number(priceOldStr.replace(",", ".")) : null;
  const discount =
    priceOld && priceOld > price
      ? Math.round(((priceOld - price) / priceOld) * 100)
      : null;

  const current = await prisma.offer.findUnique({ where: { id }, select: { productId: true, store: true, priceCurrent: true } });
  if (!current) return;

  await prisma.offer.update({
    where: { id },
    data: {
      priceCurrent: price,
      priceOld: priceOld && Number.isFinite(priceOld) && priceOld > price ? priceOld : null,
      discountPercent: discount,
    },
  });
  if (current.priceCurrent !== price) {
    await prisma.priceHistory.create({
      data: { productId: current.productId, store: current.store, price },
    });
  }
  revalidatePath("/admin/catalog/products");
}

/** Cambia la URL de la imagen principal de un producto. */
export async function updateProductImageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const image = String(formData.get("image") ?? "").trim();
  if (!id) return;
  await prisma.product.update({
    where: { id },
    data: { image: image || null },
  });
  revalidatePath("/admin/catalog/products");
}

/** Reset duro del catálogo (¡cuidado!): borra TODOS los productos. */
export async function purgeCatalogAction(): Promise<void> {
  await requireAdmin();
  // Las ofertas, historial, etc. caen en cascada gracias a onDelete: Cascade.
  await prisma.product.deleteMany({});
  revalidatePath("/admin/catalog/products");
  revalidatePath("/admin/catalog");
  redirect("/admin/catalog");
}
