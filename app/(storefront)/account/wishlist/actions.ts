"use server";

import { z } from "zod";

import { getSessionUser } from "@/lib/auth/guards";
import type { ProductCardData } from "@/lib/queries/products";
import {
  getProductCardsByIds,
  mergeWishlist,
  removeFromWishlist,
  toggleWishlist,
  type WishlistEntry,
} from "@/lib/wishlist/service";

const entrySchema = z.object({
  productId: z.string().trim().min(10).max(40),
  variantId: z.string().trim().min(10).max(40).nullable(),
});

export async function toggleWishlistAction(
  input: WishlistEntry,
): Promise<{ ok: boolean; saved: boolean }> {
  const parsed = entrySchema.safeParse(input);
  const user = await getSessionUser();
  if (!parsed.success || !user) return { ok: false, saved: false };
  const result = await toggleWishlist(user.id, parsed.data.productId, parsed.data.variantId);
  return { ok: true, saved: result.saved };
}

export async function removeWishlistAction(input: { productId: string }): Promise<{ ok: boolean }> {
  const parsed = z.object({ productId: z.string().trim().min(10).max(40) }).safeParse(input);
  const user = await getSessionUser();
  if (!parsed.success || !user) return { ok: false };
  await removeFromWishlist(user.id, parsed.data.productId);
  return { ok: true };
}

/** Guest entries from localStorage, folded into the account after sign-in. */
export async function mergeWishlistAction(
  input: WishlistEntry[],
): Promise<{ ok: boolean; merged: number }> {
  const parsed = z.array(entrySchema).max(100).safeParse(input);
  const user = await getSessionUser();
  if (!parsed.success || !user) return { ok: false, merged: 0 };
  const merged = await mergeWishlist(user.id, parsed.data);
  return { ok: true, merged };
}

export async function wishlistCardsAction(input: {
  productIds: string[];
}): Promise<ProductCardData[]> {
  const parsed = z
    .object({ productIds: z.array(z.string().trim().min(10).max(40)).max(100) })
    .safeParse(input);
  if (!parsed.success) return [];
  return getProductCardsByIds(parsed.data.productIds);
}
