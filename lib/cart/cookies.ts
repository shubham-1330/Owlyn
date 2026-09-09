import { cookies } from "next/headers";

/**
 * Two visitor cookies, both httpOnly. `cartToken` names a guest cart;
 * `visitorToken` keys recently-viewed rows for guests. Only server actions
 * and route handlers may set them.
 */
export const CART_COOKIE = "cartToken";
export const VISITOR_COOKIE = "visitorToken";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

const options = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: THIRTY_DAYS,
};

function valid(value: string | undefined): string | null {
  return value && /^[A-Za-z0-9-]{16,128}$/.test(value) ? value : null;
}

export async function getCartToken(): Promise<string | null> {
  const store = await cookies();
  return valid(store.get(CART_COOKIE)?.value);
}

export async function setCartToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, token, options);
}

export async function clearCartToken(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}

export async function getVisitorToken(): Promise<string | null> {
  const store = await cookies();
  return valid(store.get(VISITOR_COOKIE)?.value);
}

export async function setVisitorToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(VISITOR_COOKIE, token, { ...options, maxAge: THIRTY_DAYS * 6 });
}

export function newToken(): string {
  return crypto.randomUUID();
}
