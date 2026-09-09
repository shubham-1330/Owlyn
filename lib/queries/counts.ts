import { db } from "@/lib/db";

export type HeaderCounts = { bag: number; wishlist: number };

/** Bag and wishlist counts for the header. Never cached: they are per visitor. */
export async function getHeaderCounts(
  userId: string | null,
  cartToken: string | null,
): Promise<HeaderCounts> {
  const cartWhere = userId ? { userId } : cartToken ? { token: cartToken } : null;
  const [cart, wishlist] = await Promise.all([
    cartWhere
      ? db.cart.findFirst({ where: cartWhere, select: { items: { select: { qty: true } } } })
      : Promise.resolve(null),
    userId ? db.wishlistItem.count({ where: { userId } }) : Promise.resolve(0),
  ]);
  return {
    bag: cart?.items.reduce((total, item) => total + item.qty, 0) ?? 0,
    wishlist,
  };
}
