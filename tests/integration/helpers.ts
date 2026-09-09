import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { signWebhookBody } from "@/lib/payments/razorpay";
import { getShippingZones } from "@/lib/queries/shipping";
import { findZoneForPincode } from "@/lib/shipping";
import type { PlaceOrderInput } from "@/lib/validations/checkout";

export const TEST_EMAIL_PREFIX = "it-";

export type TestVariant = { id: string; productId: string; price: number; stock: number };

/** Active variants from different products with plenty of stock. */
export async function pickVariants(count: number): Promise<TestVariant[]> {
  const rows = await db.productVariant.findMany({
    where: { isActive: true, stock: { gte: 10 }, product: { status: "ACTIVE", deletedAt: null } },
    orderBy: { sku: "asc" },
    select: {
      id: true,
      productId: true,
      price: true,
      stock: true,
      product: { select: { basePrice: true } },
    },
    take: 50,
  });
  const seen = new Set<string>();
  const out: TestVariant[] = [];
  for (const r of rows) {
    if (seen.has(r.productId)) continue;
    seen.add(r.productId);
    out.push({
      id: r.id,
      productId: r.productId,
      price: r.price ?? r.product.basePrice,
      stock: r.stock,
    });
    if (out.length === count) break;
  }
  if (out.length < count) throw new Error("Seed the database first: not enough stocked variants.");
  return out;
}

export async function makeGuestCart(
  items: Array<{ variant: TestVariant; qty: number }>,
  couponCode?: string,
): Promise<string> {
  const cart = await db.cart.create({
    data: {
      token: `it-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 3_600_000),
      couponCode: couponCode ?? null,
      items: {
        create: items.map((i) => ({
          variantId: i.variant.id,
          qty: i.qty,
          priceAtAdd: i.variant.price,
        })),
      },
    },
    select: { id: true },
  });
  return cart.id;
}

export async function rateFor(pincode: string): Promise<string> {
  const zones = await getShippingZones();
  const zone = findZoneForPincode(pincode, zones);
  if (!zone?.rates[0]) throw new Error(`No rate for ${pincode}`);
  return zone.rates[0].id;
}

export function testEmail(): string {
  return `${TEST_EMAIL_PREFIX}${randomUUID().slice(0, 8)}@example.com`;
}

export async function orderInput(
  overrides: Partial<PlaceOrderInput> & { pincode?: string; state?: string; city?: string } = {},
): Promise<PlaceOrderInput> {
  const pincode = overrides.pincode ?? "560034";
  const state = overrides.state ?? "Karnataka";
  const city = overrides.city ?? "Bengaluru";
  const address = {
    fullName: "Integration Buyer",
    phone: "9876543210",
    line1: "1 Test Lane",
    line2: undefined,
    landmark: undefined,
    city,
    state,
    pincode,
    country: "IN" as const,
    type: "HOME" as const,
  };
  return {
    paymentMethod: "RAZORPAY",
    contact: { email: testEmail(), phone: "9876543210" },
    shippingAddress: address,
    billingSameAsShipping: true,
    shippingRateId: await rateFor(pincode),
    saveAddress: false,
    customerNote: undefined,
    ...overrides,
  };
}

export function capturedWebhook(input: {
  razorpayOrderId: string;
  paymentId: string;
  amount: number;
  eventId: string;
  event?: string;
}) {
  const rawBody = JSON.stringify({
    entity: "event",
    event: input.event ?? "payment.captured",
    payload: {
      payment: {
        entity: {
          id: input.paymentId,
          order_id: input.razorpayOrderId,
          amount: input.amount,
          currency: "INR",
          status: "captured",
          method: "upi",
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  });
  return {
    rawBody,
    signature: signWebhookBody(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET!),
    eventId: input.eventId,
  };
}

export async function stockOf(variantId: string): Promise<number> {
  const v = await db.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { stock: true },
  });
  return v.stock;
}

/** Removes everything the integration run created and puts stock back. */
export async function cleanupTestData(variants: TestVariant[]): Promise<void> {
  const orders = await db.order.findMany({
    where: { email: { startsWith: TEST_EMAIL_PREFIX } },
    select: { id: true },
  });
  const ids = orders.map((o) => o.id);
  if (ids.length > 0) {
    await db.inventoryLog.deleteMany({ where: { refId: { in: ids } } });
    await db.webhookEvent.deleteMany({ where: { provider: "razorpay" } });
    await db.order.deleteMany({ where: { id: { in: ids } } });
  }
  await db.cart.deleteMany({ where: { token: { startsWith: "it-" } } });
  await db.coupon.deleteMany({ where: { code: { startsWith: "IT-" } } });
  for (const v of variants) {
    await db.productVariant.update({ where: { id: v.id }, data: { stock: v.stock } });
  }
}
