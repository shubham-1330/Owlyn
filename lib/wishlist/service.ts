import { revalidateTag } from "next/cache";

import { cached, wishlistTag } from "@/lib/cache";
import { db } from "@/lib/db";
import {
  activeProductWhere,
  productCardSelect,
  toProductCard,
  type ProductCardData,
} from "@/lib/queries/products";

export type WishlistEntry = { productId: string; variantId: string | null };

/** Ids only, cheap and cached per user. Feeds the header count and heart states. */
export function getWishlistEntries(userId: string): Promise<WishlistEntry[]> {
  return cached(
    async (id: string) =>
      db.wishlistItem.findMany({
        where: { userId: id, product: activeProductWhere },
        orderBy: { createdAt: "desc" },
        select: { productId: true, variantId: true },
      }),
    ["wishlist:entries"],
    [wishlistTag(userId)],
    120,
  )(userId);
}

export type WishlistProduct = {
  entry: WishlistEntry;
  card: ProductCardData;
  variant: { id: string; size: string; colorName: string; stock: number } | null;
  addedAt: string;
};

export async function getWishlistProducts(userId: string): Promise<WishlistProduct[]> {
  const rows = await db.wishlistItem.findMany({
    where: { userId, product: activeProductWhere },
    orderBy: { createdAt: "desc" },
    select: {
      productId: true,
      variantId: true,
      createdAt: true,
      product: { select: productCardSelect },
      variant: { select: { id: true, size: true, colorName: true, stock: true, isActive: true } },
    },
  });
  return rows.map((row) => ({
    entry: { productId: row.productId, variantId: row.variantId },
    card: toProductCard(row.product),
    variant:
      row.variant && row.variant.isActive
        ? {
            id: row.variant.id,
            size: row.variant.size,
            colorName: row.variant.colorName,
            stock: row.variant.stock,
          }
        : null,
    addedAt: row.createdAt.toISOString(),
  }));
}

/** Adds when absent, removes when present. Returns the new state. */
export async function toggleWishlist(
  userId: string,
  productId: string,
  variantId: string | null,
): Promise<{ saved: boolean }> {
  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    revalidateTag(wishlistTag(userId));
    return { saved: false };
  }
  const product = await db.product.findFirst({
    where: { id: productId, ...activeProductWhere },
    select: { id: true },
  });
  if (!product) return { saved: false };
  await db.wishlistItem.create({ data: { userId, productId, variantId } });
  revalidateTag(wishlistTag(userId));
  return { saved: true };
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await db.wishlistItem.deleteMany({ where: { userId, productId } });
  revalidateTag(wishlistTag(userId));
}

/** Guest wishlist from localStorage folded into the account on login. Existing rows win. */
export async function mergeWishlist(userId: string, entries: WishlistEntry[]): Promise<number> {
  if (entries.length === 0) return 0;
  const ids = Array.from(new Set(entries.map((e) => e.productId))).slice(0, 100);
  const valid = await db.product.findMany({
    where: { id: { in: ids }, ...activeProductWhere },
    select: { id: true },
  });
  const validIds = new Set(valid.map((p) => p.id));
  const rows = entries
    .filter((e) => validIds.has(e.productId))
    .map((e) => ({ userId, productId: e.productId, variantId: e.variantId }));
  const result = await db.wishlistItem.createMany({ data: rows, skipDuplicates: true });
  revalidateTag(wishlistTag(userId));
  return result.count;
}

/** Product cards for a guest wishlist held in the browser. */
export async function getProductCardsByIds(ids: string[]): Promise<ProductCardData[]> {
  const unique = Array.from(new Set(ids)).slice(0, 100);
  if (unique.length === 0) return [];
  const rows = await db.product.findMany({
    where: { id: { in: unique }, ...activeProductWhere },
    select: productCardSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, toProductCard(r)]));
  return unique.map((id) => byId.get(id)).filter((c): c is ProductCardData => Boolean(c));
}
