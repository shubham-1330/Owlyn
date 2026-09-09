import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

/**
 * Razorpay client and signature checks. Signature verification is pure so it
 * can be unit tested; the API calls need the key pair in the environment.
 */

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

let client: Razorpay | null = null;

function sdk(): Razorpay {
  if (!isRazorpayConfigured()) throw new Error("Razorpay is not configured");
  client ??= new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
  return client;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
};

/** Amount is paise; Razorpay expects the smallest currency unit too, so it passes through unchanged. */
export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const order = await sdk().orders.create({
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt,
    notes: input.notes,
    payment_capture: true,
  });
  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    receipt: order.receipt ?? null,
  };
}

export type RazorpayPayment = {
  id: string;
  orderId: string | null;
  amount: number;
  status: string;
  method: string | null;
};

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const p = await sdk().payments.fetch(paymentId);
  return {
    id: p.id,
    orderId: p.order_id ?? null,
    amount: Number(p.amount),
    status: p.status,
    method: p.method ?? null,
  };
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Checkout callback: HMAC-SHA256 of `${order_id}|${payment_id}` with the key secret. */
export function verifyCheckoutSignature(
  input: { orderId: string; paymentId: string; signature: string },
  keySecret = process.env.RAZORPAY_KEY_SECRET ?? "",
): boolean {
  if (!keySecret || !input.signature) return false;
  const expected = createHmac("sha256", keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  return safeEqual(expected, input.signature);
}

/** Webhook: HMAC-SHA256 of the raw request body with the webhook secret. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
): boolean {
  if (!webhookSecret || !signature) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

/** Helper for tests and local replay: produce the signature Razorpay would send. */
export function signWebhookBody(rawBody: string, webhookSecret: string): string {
  return createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
}

export function signCheckout(orderId: string, paymentId: string, keySecret: string): string {
  return createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
}
