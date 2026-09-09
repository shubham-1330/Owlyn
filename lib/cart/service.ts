import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { getSessionUser } from "@/lib/auth/guards";
import { cartTag } from "@/lib/cache";
import { getCartToken, newToken, setCartToken } from "@/lib/cart/cookies";
import { loadCartById } from "@/lib/cart/load";
import type { CartData } from "@/lib/cart/types";
import { db } from "@/lib/db";
import { getStoreConfig } from "@/lib/queries/settings";

/**
 * Cart mutations. Every write re-reads price and stock from the database and
 * ignores anything the client says about prices. Errors are thrown as
 * CartError with a message safe to show.
 */

export class CartError extends Error {}

type Resolved = { cartId: string; userId: string | null };

async function findGuestCart(token: string) {
  return db.cart.findUnique({ where: { token }, select: { id: true, userId: true } });
}

/** The cart to read: the user's, or the guest cookie's. Merges a leftover guest cart first. */
export async function resolveReadableCart(): Promise<Resolved | null> {
  const [user, token] = await Promise.all([getSessionUser(), getCartToken()]);
  if (user) {
    if (token) {
      const guest = await findGuestCart(token);
      if (guest && guest.userId !== user.id) await mergeGuestCartIntoUser(user.id, token);
    }
    const cart = await db.cart.findUnique({ where: { userId: user.id }, select: { id: true } });
    return cart ? { cartId: cart.id, userId: user.id } : null;
  }
  if (!token) return null;
  const cart = await findGuestCart(token);
  return cart ? { cartId: cart.id, userId: null } : null;
}

/** The cart to write to, creating it (and the guest cookie) when absent. */
export async function resolveWritableCart(): Promise<Resolved> {
  const existing = await resolveReadableCart();
  if (existing) return existing;
  const user = await getSessionUser();
  if (user) {
    const cart = await db.cart.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
      select: { id: true },
    });
    return { cartId: cart.id, userId: user.id };
  }
  const token = (await getCartToken()) ?? newToken();
  const cart = await db.cart.upsert({
    where: { token },
    update: {},
    create: { token, expiresAt: new Date(Date.now() + 30 * 86_400_000) },
    select: { id: true },
  });
  await setCartToken(token);
  return { cartId: cart.id, userId: null };
}

export async function getCurrentCart(): Promise<CartData | null> {
  const resolved = await resolveReadableCart();
  return resolved ? loadCartById(resolved.cartId) : null;
}

async function reload(cartId: string): Promise<CartData> {
  revalidateTag(cartTag(cartId));
  await db.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
  const cart = await loadCartById(cartId);
  if (!cart) throw new CartError("Your bag could not be loaded.");
  return cart;
}

async function readVariant(variantId: string) {
  const variant = await db.productVariant.findFirst({
    where: { id: variantId, isActive: true, product: { status: "ACTIVE", deletedAt: null } },
    select: {
      id: true,
      stock: true,
      price: true,
      size: true,
      colorName: true,
      product: { select: { name: true, basePrice: true } },
    },
  });
  if (!variant) throw new CartError("That item is no longer available.");
  return { ...variant, unitPrice: variant.price ?? variant.product.basePrice };
}

export type AddResult = { cart: CartData; notice: string | null; itemId: string };

export async function addItem(variantId: string, qty: number): Promise<AddResult> {
  const [{ cartId }, variant, config] = await Promise.all([
    resolveWritableCart(),
    readVariant(variantId),
    getStoreConfig(),
  ]);
  if (variant.stock <= 0)
    throw new CartError(
      `${variant.product.name} in ${variant.colorName}, ${variant.size} is sold out.`,
    );

  const existing = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId } },
    select: { id: true, qty: true },
  });
  const requested = (existing?.qty ?? 0) + qty;
  const cap = Math.min(variant.stock, config.maxQtyPerLine);
  const finalQty = Math.max(1, Math.min(requested, cap));
  let notice: string | null = null;
  if (finalQty < requested) {
    notice =
      variant.stock < config.maxQtyPerLine
        ? `Only ${variant.stock} of ${variant.product.name} (${variant.size}) available; your bag has ${finalQty}.`
        : `You can add up to ${config.maxQtyPerLine} of one item; your bag has ${finalQty}.`;
  }

  const item = existing
    ? await db.cartItem.update({
        where: { id: existing.id },
        data: { qty: finalQty },
        select: { id: true },
      })
    : await db.cartItem.create({
        data: { cartId, variantId, qty: finalQty, priceAtAdd: variant.unitPrice },
        select: { id: true },
      });

  return { cart: await reload(cartId), notice, itemId: item.id };
}

async function ownedItem(cartId: string, itemId: string) {
  const item = await db.cartItem.findFirst({
    where: { id: itemId, cartId },
    select: { id: true, variantId: true, qty: true },
  });
  if (!item) throw new CartError("That line is not in your bag any more.");
  return item;
}

export async function setItemQty(
  itemId: string,
  qty: number,
): Promise<{ cart: CartData; notice: string | null }> {
  const { cartId } = await resolveWritableCart();
  const item = await ownedItem(cartId, itemId);
  if (qty <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return { cart: await reload(cartId), notice: null };
  }
  const [variant, config] = await Promise.all([readVariant(item.variantId), getStoreConfig()]);
  const cap = Math.min(variant.stock, config.maxQtyPerLine);
  const finalQty = Math.max(1, Math.min(qty, cap));
  const notice =
    finalQty < qty
      ? variant.stock < config.maxQtyPerLine
        ? `Only ${variant.stock} available; quantity set to ${finalQty}.`
        : `Up to ${config.maxQtyPerLine} of one item; quantity set to ${finalQty}.`
      : null;
  // Changing the quantity acknowledges the live price, so the "price updated" notice clears.
  await db.cartItem.update({
    where: { id: item.id },
    data: { qty: finalQty, priceAtAdd: variant.unitPrice },
  });
  return { cart: await reload(cartId), notice };
}

export async function removeItem(itemId: string): Promise<CartData> {
  const { cartId } = await resolveWritableCart();
  const item = await ownedItem(cartId, itemId);
  await db.cartItem.delete({ where: { id: item.id } });
  return reload(cartId);
}

export async function applyCouponCode(code: string): Promise<CartData> {
  const { cartId } = await resolveWritableCart();
  const normalised = code.trim().toUpperCase();
  const coupon = await db.coupon.findUnique({
    where: { code: normalised },
    select: { code: true },
  });
  if (!coupon) throw new CartError("That code does not exist.");
  await db.cart.update({ where: { id: cartId }, data: { couponCode: coupon.code } });
  const cart = await reload(cartId);
  if (!cart.coupon) {
    // Store nothing that does not apply; surface the engine's reason instead.
    await db.cart.update({ where: { id: cartId }, data: { couponCode: null } });
    const message = cart.couponError ?? `${normalised} cannot be applied to this bag.`;
    revalidateTag(cartTag(cartId));
    throw new CartError(message);
  }
  return cart;
}

export async function removeCouponCode(): Promise<CartData> {
  const { cartId } = await resolveWritableCart();
  await db.cart.update({ where: { id: cartId }, data: { couponCode: null } });
  return reload(cartId);
}

/**
 * Folds a guest cart into the user's cart: same variant keeps the larger
 * quantity, the guest coupon fills an empty slot, then the guest cart is
 * deleted. Serializable and retried, so two sign-in callbacks racing each
 * other produce one merge and the second sees nothing to do.
 */
export async function mergeGuestCartIntoUser(userId: string, token: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const touched = await db.$transaction(
        async (tx) => {
          const guest = await tx.cart.findUnique({ where: { token }, include: { items: true } });
          if (!guest || guest.userId === userId) return null;
          const mine = await tx.cart.upsert({
            where: { userId },
            update: {},
            create: { userId },
            include: { items: true },
          });
          for (const item of guest.items) {
            const existing = mine.items.find((i) => i.variantId === item.variantId);
            if (!existing) {
              await tx.cartItem.create({
                data: {
                  cartId: mine.id,
                  variantId: item.variantId,
                  qty: item.qty,
                  priceAtAdd: item.priceAtAdd,
                },
              });
            } else if (item.qty > existing.qty) {
              await tx.cartItem.update({ where: { id: existing.id }, data: { qty: item.qty } });
            }
          }
          if (!mine.couponCode && guest.couponCode) {
            await tx.cart.update({
              where: { id: mine.id },
              data: { couponCode: guest.couponCode },
            });
          }
          await tx.cart.delete({ where: { id: guest.id } });
          return mine.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (touched) revalidateTag(cartTag(touched));
      return;
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");
      if (!retryable || attempt === 2) throw error;
    }
  }
}
