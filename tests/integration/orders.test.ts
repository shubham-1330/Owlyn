import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/invoices/render";
import { buildInvoiceData } from "@/lib/invoices/service";
import { capturePayment } from "@/lib/orders/capture";
import { abandonUnpaidOrder, runOrderCleanup } from "@/lib/orders/cleanup";
import { placeOrder } from "@/lib/orders/create";
import { ORDER_NUMBER_PATTERN, nextOrderNumber } from "@/lib/orders/order-number";
import { OrderError } from "@/lib/orders/types";
import { handleRazorpayWebhook } from "@/lib/payments/webhook";

import {
  capturedWebhook,
  cleanupTestData,
  makeGuestCart,
  orderInput,
  pickVariants,
  stockOf,
  type TestVariant,
} from "./helpers";

let variants: TestVariant[];

beforeAll(async () => {
  variants = await pickVariants(3);
  await cleanupTestData(variants);
});

afterAll(async () => {
  await cleanupTestData(variants);
  await db.$disconnect();
});

async function razorpayOrderIdFor(orderId: string): Promise<string> {
  const p = await db.payment.findFirstOrThrow({
    where: { orderId, provider: "RAZORPAY" },
    select: { providerOrderId: true },
  });
  return p.providerOrderId!;
}

describe("order numbers", () => {
  it("are unique and gap-free under concurrency", async () => {
    const numbers = await Promise.all(Array.from({ length: 30 }, () => nextOrderNumber(db)));
    expect(new Set(numbers).size).toBe(30);
    for (const n of numbers) expect(n).toMatch(ORDER_NUMBER_PATTERN);
    const seqs = numbers.map((n) => Number(n.slice(-6))).sort((a, b) => a - b);
    expect(seqs[seqs.length - 1]! - seqs[0]!).toBe(29);
  });
});

describe("prepaid order lifecycle", () => {
  it("reserves stock at placement, captures once via webhook, and treats a replay as a no-op", async () => {
    const [a, b] = variants;
    const before = await stockOf(a!.id);
    const cartId = await makeGuestCart([
      { variant: a!, qty: 2 },
      { variant: b!, qty: 1 },
    ]);
    const input = await orderInput();
    const placed = await placeOrder(input, { userId: null, cartId });
    expect(placed.paymentMethod).toBe("RAZORPAY");
    expect(placed.razorpay?.amount).toBe(placed.grandTotal);

    // Stock is reserved, not decremented, while PENDING.
    expect(await stockOf(a!.id)).toBe(before);
    const reservations = await db.stockReservation.findMany({
      where: { orderId: placed.orderId, releasedAt: null },
    });
    expect(reservations.map((r) => r.qty).sort()).toEqual([1, 2]);
    const pending = await db.order.findUniqueOrThrow({ where: { id: placed.orderId } });
    expect(pending.status).toBe("PENDING");
    expect(pending.expiresAt).not.toBeNull();
    expect(pending.expiresAt!.getTime() - pending.placedAt!.getTime()).toBe(20 * 60_000);

    const rzpOrderId = await razorpayOrderIdFor(placed.orderId);
    const hook = capturedWebhook({
      razorpayOrderId: rzpOrderId,
      paymentId: `pay_${placed.orderNumber}`,
      amount: placed.grandTotal,
      eventId: `evt_${placed.orderNumber}_1`,
    });

    const first = await handleRazorpayWebhook(hook);
    expect(first).toEqual({
      status: 200,
      body: { ok: true, result: "payment.captured: captured" },
    });

    const paid = await db.order.findUniqueOrThrow({
      where: { id: placed.orderId },
      include: { payments: true, items: true },
    });
    expect(paid.status).toBe("CONFIRMED");
    expect(paid.paymentStatus).toBe("PAID");
    expect(
      paid.payments.find((p) => p.providerPaymentId === `pay_${placed.orderNumber}`)?.status,
    ).toBe("CAPTURED");
    expect(await stockOf(a!.id)).toBe(before - 2);
    expect(
      await db.stockReservation.count({ where: { orderId: placed.orderId, releasedAt: null } }),
    ).toBe(0);
    expect(await db.inventoryLog.count({ where: { refId: placed.orderId, reason: "SALE" } })).toBe(
      2,
    );
    expect(await db.cartItem.count({ where: { cartId } })).toBe(0);

    // Same payload again: deduped on the event id, nothing changes.
    const replay = await handleRazorpayWebhook(hook);
    expect(replay).toEqual({ status: 200, body: { ok: true, result: "duplicate" } });
    expect(await stockOf(a!.id)).toBe(before - 2);

    // Same payment under a new event id: capture is idempotent on providerPaymentId.
    const again = await handleRazorpayWebhook({ ...hook, eventId: `evt_${placed.orderNumber}_2` });
    expect(again.body.result).toBe("payment.captured: already_captured");
    expect(await stockOf(a!.id)).toBe(before - 2);
    expect(await db.inventoryLog.count({ where: { refId: placed.orderId, reason: "SALE" } })).toBe(
      2,
    );

    // Invoice arithmetic from the stored order rows.
    const invoice = await buildInvoiceData(placed.orderId, "OWL-INV-TEST");
    const lineTax = invoice.lines.reduce((s, l) => s + l.cgst + l.sgst + l.igst, 0);
    expect(lineTax).toBe(paid.taxTotal);
    expect(invoice.isInterState).toBe(false);
    expect(paid.cgstTotal + paid.sgstTotal).toBe(paid.taxTotal);
    expect(paid.igstTotal).toBe(0);
    expect(invoice.lines.reduce((s, l) => s + l.lineTotal, 0) + invoice.shippingTotal).toBe(
      paid.grandTotal,
    );
    const pdf = await renderInvoicePdf(invoice);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("rejects unsigned and tampered webhook deliveries without recording them", async () => {
    const before = await db.webhookEvent.count();
    const hook = capturedWebhook({
      razorpayOrderId: "order_nope",
      paymentId: "pay_nope",
      amount: 100,
      eventId: "evt_unsigned",
    });
    expect((await handleRazorpayWebhook({ ...hook, signature: null })).status).toBe(400);
    expect(
      (
        await handleRazorpayWebhook({
          ...hook,
          rawBody: hook.rawBody.replace('"amount":100', '"amount":1'),
        })
      ).status,
    ).toBe(400);
    expect((await handleRazorpayWebhook({ ...hook, signature: "deadbeef" })).status).toBe(400);
    expect(await db.webhookEvent.count()).toBe(before);
  });

  it("uses IGST for an out-of-state delivery", async () => {
    const [a] = variants;
    const cartId = await makeGuestCart([{ variant: a!, qty: 1 }]);
    const placed = await placeOrder(
      await orderInput({ pincode: "400001", state: "Maharashtra", city: "Mumbai" }),
      { userId: null, cartId },
    );
    const order = await db.order.findUniqueOrThrow({ where: { id: placed.orderId } });
    expect(order.isInterState).toBe(true);
    expect(order.placeOfSupply).toBe("Maharashtra");
    expect(order.igstTotal).toBe(order.taxTotal);
    expect(order.cgstTotal + order.sgstTotal).toBe(0);
    await abandonUnpaidOrder(placed.orderId, "test teardown");
  });

  it("lets only one of two competing orders take the last units", async () => {
    const v = variants[2]!;
    await db.productVariant.update({ where: { id: v.id }, data: { stock: 8 } });
    const [cartA, cartB] = await Promise.all([
      makeGuestCart([{ variant: v, qty: 5 }]),
      makeGuestCart([{ variant: v, qty: 5 }]),
    ]);
    const [inputA, inputB] = await Promise.all([orderInput(), orderInput()]);
    const results = await Promise.allSettled([
      placeOrder(inputA, { userId: null, cartId: cartA }),
      placeOrder(inputB, { userId: null, cartId: cartB }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.reason).toBeInstanceOf(OrderError);
    expect((failed[0]!.reason as OrderError).code).toBe("STOCK");
    expect(
      await db.stockReservation.aggregate({
        where: { variantId: v.id, releasedAt: null },
        _sum: { qty: true },
      }),
    ).toMatchObject({ _sum: { qty: 5 } });
    if (ok[0]?.status === "fulfilled")
      await abandonUnpaidOrder(ok[0].value.orderId, "test teardown");
  });

  it("expires unpaid orders: reservations released, coupon use returned, and a late capture is parked for review", async () => {
    const [a] = variants;
    const coupon = await db.coupon.create({
      data: {
        code: `IT-${Date.now().toString(36).toUpperCase()}`,
        type: "PERCENT",
        value: 10,
        usageLimit: 1,
        isActive: true,
      },
    });
    const cartId = await makeGuestCart([{ variant: a!, qty: 1 }], coupon.code);
    const placed = await placeOrder(await orderInput(), { userId: null, cartId });
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(1);
    expect(await db.couponRedemption.count({ where: { orderId: placed.orderId } })).toBe(1);

    // A second bag with the same single-use coupon is refused at redemption.
    const cart2 = await makeGuestCart([{ variant: a!, qty: 1 }], coupon.code);
    await expect(
      placeOrder(await orderInput(), { userId: null, cartId: cart2 }),
    ).rejects.toMatchObject({ code: "COUPON" });

    // Time passes: the reservation TTL lapses and the cleanup job runs.
    await db.order.update({
      where: { id: placed.orderId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await db.stockReservation.updateMany({
      where: { orderId: placed.orderId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const result = await runOrderCleanup();
    expect(result.cancelledOrders).toBeGreaterThanOrEqual(1);

    const cancelled = await db.order.findUniqueOrThrow({ where: { id: placed.orderId } });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.paymentStatus).toBe("FAILED");
    expect(
      await db.stockReservation.count({ where: { orderId: placed.orderId, releasedAt: null } }),
    ).toBe(0);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(0);
    expect(await db.couponRedemption.count({ where: { orderId: placed.orderId } })).toBe(0);

    // The coupon is usable again now.
    const retry = await placeOrder(await orderInput(), { userId: null, cartId: cart2 });
    await abandonUnpaidOrder(retry.orderId, "test teardown");

    // The bank confirms after the window closed: money is held, stock is not touched, refund is queued.
    const before = await stockOf(a!.id);
    const rzpOrderId = await razorpayOrderIdFor(placed.orderId);
    const late = await capturePayment({
      providerOrderId: rzpOrderId,
      providerPaymentId: `pay_late_${placed.orderNumber}`,
      amount: placed.grandTotal,
      method: "card",
      raw: {},
      source: "webhook",
    });
    expect(late.status).toBe("needs_review");
    const reviewed = await db.order.findUniqueOrThrow({
      where: { id: placed.orderId },
      include: { refunds: true },
    });
    expect(reviewed.needsReview).toBe(true);
    expect(reviewed.paymentStatus).toBe("PAID");
    expect(reviewed.refunds).toHaveLength(1);
    expect(reviewed.refunds[0]).toMatchObject({ status: "PENDING", amount: placed.grandTotal });
    expect(await stockOf(a!.id)).toBe(before);
  });

  it("parks a capture whose amount does not match the order", async () => {
    const [a] = variants;
    const cartId = await makeGuestCart([{ variant: a!, qty: 1 }]);
    const placed = await placeOrder(await orderInput(), { userId: null, cartId });
    const rzpOrderId = await razorpayOrderIdFor(placed.orderId);
    const result = await capturePayment({
      providerOrderId: rzpOrderId,
      providerPaymentId: `pay_short_${placed.orderNumber}`,
      amount: placed.grandTotal - 100,
      method: "upi",
      raw: {},
      source: "webhook",
    });
    expect(result.status).toBe("needs_review");
    const order = await db.order.findUniqueOrThrow({ where: { id: placed.orderId } });
    expect(order.status).toBe("PENDING");
    expect(order.needsReview).toBe(true);
  });
});

describe("cash on delivery", () => {
  it("confirms immediately, decrements stock in the same transaction and records a COD payment row", async () => {
    // One unit keeps the total under the ₹10,000 COD limit from settings.
    const [, b] = variants;
    const before = await stockOf(b!.id);
    const cartId = await makeGuestCart([{ variant: b!, qty: 1 }]);
    const placed = await placeOrder(await orderInput({ paymentMethod: "COD" }), {
      userId: null,
      cartId,
    });
    expect(placed.razorpay).toBeNull();
    const order = await db.order.findUniqueOrThrow({
      where: { id: placed.orderId },
      include: { payments: true },
    });
    expect(order.status).toBe("CONFIRMED");
    expect(order.paymentStatus).toBe("PENDING");
    expect(order.payments).toHaveLength(1);
    expect(order.payments[0]).toMatchObject({
      provider: "COD",
      status: "CREATED",
      amount: placed.grandTotal,
    });
    expect(await stockOf(b!.id)).toBe(before - 1);
    expect(await db.stockReservation.count({ where: { orderId: placed.orderId } })).toBe(0);
    expect(await db.inventoryLog.count({ where: { refId: placed.orderId, reason: "SALE" } })).toBe(
      1,
    );
    expect(await db.cartItem.count({ where: { cartId } })).toBe(0);
  });

  it("is hidden when the total is over the COD limit", async () => {
    const [, b] = variants;
    const cartId = await makeGuestCart([{ variant: b!, qty: 3 }]);
    await expect(
      placeOrder(await orderInput({ paymentMethod: "COD" }), { userId: null, cartId }),
    ).rejects.toMatchObject({ code: "COD" });
  });

  it("is refused where the pincode does not allow it", async () => {
    const [, b] = variants;
    const cartId = await makeGuestCart([{ variant: b!, qty: 1 }]);
    await expect(
      placeOrder(
        await orderInput({
          paymentMethod: "COD",
          pincode: "793001",
          state: "Meghalaya",
          city: "Shillong",
        }),
        { userId: null, cartId },
      ),
    ).rejects.toMatchObject({ code: "COD" });
  });
});
