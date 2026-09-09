"use server";

import { z } from "zod";

import { getSessionUser } from "@/lib/auth/guards";
import {
  addItem,
  applyCouponCode,
  CartError,
  getCurrentCart,
  removeCouponCode,
  removeItem,
  setItemQty,
} from "@/lib/cart/service";
import type { CartData } from "@/lib/cart/types";
import { db } from "@/lib/db";
import { toggleWishlist } from "@/lib/wishlist/service";

export type CartActionResult =
  | { ok: true; cart: CartData; notice: string | null }
  | { ok: false; error: string; cart: CartData | null };

const id = z.string().trim().min(10).max(40);
const qty = z.number().int().min(0).max(99);

async function run(
  fn: () => Promise<{ cart: CartData; notice: string | null }>,
): Promise<CartActionResult> {
  try {
    const result = await fn();
    return { ok: true, cart: result.cart, notice: result.notice };
  } catch (error) {
    if (error instanceof CartError) {
      return { ok: false, error: error.message, cart: await getCurrentCart().catch(() => null) };
    }
    throw error;
  }
}

export async function addToCartAction(input: {
  variantId: string;
  qty?: number;
}): Promise<CartActionResult> {
  const parsed = z.object({ variantId: id, qty: qty.optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "That item could not be added.", cart: null };
  return run(async () => {
    const result = await addItem(parsed.data.variantId, parsed.data.qty ?? 1);
    return { cart: result.cart, notice: result.notice };
  });
}

export async function updateCartItemAction(input: {
  itemId: string;
  qty: number;
}): Promise<CartActionResult> {
  const parsed = z.object({ itemId: id, qty }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "That change could not be saved.", cart: null };
  return run(() => setItemQty(parsed.data.itemId, parsed.data.qty));
}

export async function removeCartItemAction(input: { itemId: string }): Promise<CartActionResult> {
  const parsed = z.object({ itemId: id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "That line could not be removed.", cart: null };
  return run(async () => ({ cart: await removeItem(parsed.data.itemId), notice: null }));
}

export async function applyCouponAction(input: { code: string }): Promise<CartActionResult> {
  const parsed = z.object({ code: z.string().trim().min(2).max(32) }).safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Enter a code.", cart: await getCurrentCart().catch(() => null) };
  return run(async () => ({ cart: await applyCouponCode(parsed.data.code), notice: null }));
}

export async function removeCouponAction(): Promise<CartActionResult> {
  return run(async () => ({ cart: await removeCouponCode(), notice: null }));
}

export type MoveToWishlistResult = CartActionResult & {
  entry?: { productId: string; variantId: string | null };
};

/** Signed in: saves to the account wishlist. Guest: returns the entry for the browser to keep. */
export async function moveToWishlistAction(input: {
  itemId: string;
}): Promise<MoveToWishlistResult> {
  const parsed = z.object({ itemId: id }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "That line could not be moved.", cart: null };
  const item = await db.cartItem.findUnique({
    where: { id: parsed.data.itemId },
    select: { variantId: true, variant: { select: { productId: true } } },
  });
  if (!item)
    return {
      ok: false,
      error: "That line is not in your bag any more.",
      cart: await getCurrentCart().catch(() => null),
    };

  const user = await getSessionUser();
  if (user) await toggleWishlistIfAbsent(user.id, item.variant.productId, item.variantId);
  const result = await run(async () => ({
    cart: await removeItem(parsed.data.itemId),
    notice: null,
  }));
  return { ...result, entry: { productId: item.variant.productId, variantId: item.variantId } };
}

async function toggleWishlistIfAbsent(userId: string, productId: string, variantId: string) {
  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  if (!existing) await toggleWishlist(userId, productId, variantId);
}

/** Fresh cart for a tab that regained focus or wants to reconcile after another tab changed it. */
export async function refreshCartAction(): Promise<CartData | null> {
  return getCurrentCart();
}
