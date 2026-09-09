import { cookies } from "next/headers";

/** Guest cart cookie. Set by cart actions (Phase 4); read anywhere on the server. */
export const CART_COOKIE = "cartToken";

export async function getCartToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(CART_COOKIE)?.value;
  return value && value.length <= 128 ? value : null;
}
