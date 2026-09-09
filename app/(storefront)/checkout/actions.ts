"use server";

import { headers } from "next/headers";

import { getSessionUser } from "@/lib/auth/guards";
import { resolveReadableCart } from "@/lib/cart/service";
import { db } from "@/lib/db";
import { capturePayment } from "@/lib/orders/capture";
import { placeOrder, type PlaceOrderResult } from "@/lib/orders/create";
import { quoteCheckout, type CheckoutQuote } from "@/lib/orders/quote";
import { OrderError } from "@/lib/orders/types";
import { fetchRazorpayPayment, verifyCheckoutSignature } from "@/lib/payments/razorpay";
import { lookupPincode } from "@/lib/queries/shipping";
import { createRateLimiter } from "@/lib/rate-limit";
import { placeOrderSchema, razorpayCallbackSchema } from "@/lib/validations/checkout";

/**
 * Checkout server actions. The client sends addresses, a rate id and a
 * payment method; every rupee is recomputed from the server-side bag.
 */

export type ActionFailure = { ok: false; message: string; code?: string; field?: string };

export type PincodeLookupResult =
  { ok: true; city: string; state: string; serviceable: boolean } | { ok: false };

const quoteLimiter = createRateLimiter({ name: "checkout-quote", limit: 60, windowSeconds: 60 });
const placeLimiter = createRateLimiter({ name: "checkout-place", limit: 10, windowSeconds: 60 });

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function lookupPincodeAction(pincode: string): Promise<PincodeLookupResult> {
  const pin = await lookupPincode(String(pincode).trim());
  if (!pin) return { ok: false };
  return { ok: true, city: pin.city, state: pin.state, serviceable: pin.isServiceable };
}

export async function quoteShippingAction(pincode: string): Promise<CheckoutQuote | ActionFailure> {
  const limited = await quoteLimiter.limit(await clientIp());
  if (!limited.success) return { ok: false, message: "Too many attempts. Give it a minute." };
  const resolved = await resolveReadableCart();
  if (!resolved) return { status: "empty" };
  return quoteCheckout(resolved.cartId, resolved.userId, String(pincode).trim());
}

export async function placeOrderAction(
  raw: unknown,
): Promise<{ ok: true; order: PlaceOrderResult } | ActionFailure> {
  const limited = await placeLimiter.limit(await clientIp());
  if (!limited.success) return { ok: false, message: "Too many attempts. Give it a minute." };

  const parsed = placeOrderSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      message: issue?.message ?? "Check the form.",
      field: issue?.path.join("."),
    };
  }
  const resolved = await resolveReadableCart();
  if (!resolved) return { ok: false, message: "Your bag is empty.", code: "EMPTY" };

  try {
    const order = await placeOrder(parsed.data, {
      userId: resolved.userId,
      cartId: resolved.cartId,
    });
    return { ok: true, order };
  } catch (error) {
    if (error instanceof OrderError) return { ok: false, message: error.message, code: error.code };
    console.error("placeOrder failed", error);
    return { ok: false, message: "Something went wrong placing the order. Nothing was charged." };
  }
}

/**
 * Razorpay Checkout success handler. Verifies the signature over
 * order_id|payment_id and runs the same idempotent capture the webhook uses,
 * so whichever arrives first wins and the other is a no-op. A bad signature
 * is rejected and the order stays PENDING for the webhook to decide.
 */
export async function confirmRazorpayPaymentAction(
  raw: unknown,
): Promise<{ ok: true; status: string } | ActionFailure> {
  const parsed = razorpayCallbackSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Invalid payment response." };
  const input = parsed.data;

  const user = await getSessionUser();
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      userId: true,
      cartId: true,
      grandTotal: true,
      payments: { where: { provider: "RAZORPAY" }, select: { providerOrderId: true } },
    },
  });
  if (!order) return { ok: false, message: "Order not found." };
  const resolved = await resolveReadableCart();
  const owns =
    (user && order.userId === user.id) ||
    (order.cartId !== null && resolved?.cartId === order.cartId);
  if (!owns) return { ok: false, message: "Order not found." };
  if (!order.payments.some((p) => p.providerOrderId === input.razorpayOrderId)) {
    return { ok: false, message: "Payment does not belong to this order." };
  }
  if (
    !verifyCheckoutSignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    })
  ) {
    return {
      ok: false,
      message:
        "Payment signature did not verify. If you were charged, the confirmation will follow by email.",
    };
  }

  // The signature proves the browser is not lying about the ids. The amount
  // and the capture status come from Razorpay itself, never from the client.
  let payment: Awaited<ReturnType<typeof fetchRazorpayPayment>>;
  try {
    payment = await fetchRazorpayPayment(input.razorpayPaymentId);
  } catch (error) {
    console.error("Razorpay payment fetch failed", error);
    return { ok: true, status: "pending" };
  }
  if (payment.orderId !== input.razorpayOrderId)
    return { ok: false, message: "Payment does not belong to this order." };
  if (payment.status !== "captured") return { ok: true, status: "pending" };

  const result = await capturePayment({
    providerOrderId: input.razorpayOrderId,
    providerPaymentId: input.razorpayPaymentId,
    amount: Number(payment.amount),
    method: payment.method ?? null,
    signature: input.razorpaySignature,
    raw: payment,
    source: "callback",
  });
  return { ok: true, status: result.status };
}
