import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, expiring access tokens for guest order pages. The token proves
 * the holder placed the order in this browser session; a raw order id
 * never grants access on its own.
 */

const DEFAULT_TTL_DAYS = 30;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required to sign order access tokens");
  return value;
}

function sign(orderId: string, expires: number): string {
  return createHmac("sha256", secret()).update(`${orderId}.${expires}`).digest("base64url");
}

export function signOrderAccess(
  orderId: string,
  ttlDays = DEFAULT_TTL_DAYS,
  now = Date.now(),
): string {
  const expires = Math.floor(now / 1000) + ttlDays * 86_400;
  return `${expires}.${sign(orderId, expires)}`;
}

export function verifyOrderAccess(
  token: string | null | undefined,
  orderId: string,
  now = Date.now(),
): boolean {
  if (!token) return false;
  const [expiresRaw, signature] = token.split(".");
  const expires = Number(expiresRaw);
  if (!Number.isInteger(expires) || !signature) return false;
  if (expires * 1000 < now) return false;
  const expected = sign(orderId, expires);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
