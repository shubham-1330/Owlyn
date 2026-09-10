import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAddress, deleteAddress, listAddresses } from "@/lib/account/addresses";
import { changePassword } from "@/lib/account/profile";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { cancelOrder } from "@/lib/orders/cancel";
import { placeOrder } from "@/lib/orders/create";
import { capturePayment } from "@/lib/orders/capture";
import { getOrderDetailForUser, listOrdersForUser, orderExistsForUser } from "@/lib/orders/queries";
import { trackOrder } from "@/lib/orders/track";
import { createReturnRequest, getReturnableOrder } from "@/lib/returns/service";

import {
  cleanupTestData,
  makeGuestCart,
  orderInput,
  pickVariants,
  stockOf,
  type TestVariant,
} from "./helpers";

/**
 * Account area: ownership in the data layer, cancellation side effects,
 * partial returns, address snapshots and the guest tracker.
 */

let variants: TestVariant[];
let userA: { id: string; email: string };
let userB: { id: string; email: string };

async function makeUser(tag: string) {
  const email = `it-${tag}-${randomUUID().slice(0, 6)}@example.com`;
  const user = await db.user.create({
    data: {
      email,
      name: `Integration ${tag}`,
      passwordHash: await hashPassword("owlyn-test-1234"),
      phone: "9800000099",
    },
    select: { id: true, email: true },
  });
  return user;
}

/** One cart per user is enforced by a unique index, so the previous test cart is dropped first. */
async function attachCart(cartId: string, userId: string) {
  await db.cart.deleteMany({ where: { userId, id: { not: cartId } } });
  await db.cart.update({ where: { id: cartId }, data: { userId, token: null } });
}

async function codOrderFor(
  user: { id: string; email: string },
  variant: TestVariant,
  qty = 1,
  couponCode?: string,
) {
  const cartId = await makeGuestCart([{ variant, qty }], couponCode);
  await attachCart(cartId, user.id);
  const input = await orderInput({
    paymentMethod: "COD",
    contact: { email: user.email, phone: "9800000099" },
  });
  return placeOrder(input, { userId: user.id, cartId });
}

/** A captured prepaid order: no COD limit, so larger quantities are fine. */
async function paidOrderFor(user: { id: string; email: string }, variant: TestVariant, qty = 1) {
  const cartId = await makeGuestCart([{ variant, qty }]);
  await attachCart(cartId, user.id);
  const placed = await placeOrder(
    await orderInput({ contact: { email: user.email, phone: "9800000099" } }),
    { userId: user.id, cartId },
  );
  const payment = await db.payment.findFirstOrThrow({ where: { orderId: placed.orderId } });
  await capturePayment({
    providerOrderId: payment.providerOrderId!,
    providerPaymentId: `pay_acct_${placed.orderNumber}`,
    amount: placed.grandTotal,
    method: "upi",
    raw: {},
    source: "webhook",
  });
  return placed;
}

beforeAll(async () => {
  variants = await pickVariants(3);
  await cleanupTestData(variants);
  await db.user.deleteMany({ where: { email: { startsWith: "it-" } } });
  [userA, userB] = await Promise.all([makeUser("a"), makeUser("b")]);
});

afterAll(async () => {
  await cleanupTestData(variants);
  await db.user.deleteMany({ where: { email: { startsWith: "it-" } } });
  await db.$disconnect();
});

describe("ownership lives in the query", () => {
  it("another customer's order id reads as missing, not forbidden", async () => {
    const [a] = variants;
    const placed = await codOrderFor(userA, a!);
    expect(await orderExistsForUser(placed.orderId, userA.id)).toBe(true);
    expect(await orderExistsForUser(placed.orderId, userB.id)).toBe(false);
    expect(await getOrderDetailForUser(placed.orderId, userB.id)).toBeNull();
    expect((await getOrderDetailForUser(placed.orderId, userA.id))?.orderNumber).toBe(
      placed.orderNumber,
    );
    expect(
      (await listOrdersForUser(userB.id, { page: 1, status: undefined, q: undefined })).total,
    ).toBe(0);
    await expect(
      cancelOrder({
        orderId: placed.orderId,
        userId: userB.id,
        reason: "not mine",
        source: "customer",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await getReturnableOrder(placed.orderId, userB.id)).toBeNull();
  });
});

describe("cancellation", () => {
  it("restocks with CANCEL inventory rows, frees the coupon and queues nothing for COD", async () => {
    const [, b] = variants;
    const coupon = await db.coupon.create({
      data: {
        code: `IT-CANCEL-${Date.now().toString(36).toUpperCase()}`,
        type: "PERCENT",
        value: 10,
        usageLimit: 1,
        isActive: true,
      },
    });
    const before = await stockOf(b!.id);
    const placed = await codOrderFor(userA, b!, 2, coupon.code);
    expect(await stockOf(b!.id)).toBe(before - 2);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(1);

    const result = await cancelOrder({
      orderId: placed.orderId,
      userId: userA.id,
      actorId: userA.id,
      reason: "Ordered by mistake",
      source: "customer",
    });
    expect(result).toMatchObject({
      orderNumber: placed.orderNumber,
      restocked: 2,
      refundQueued: false,
    });
    expect(await stockOf(b!.id)).toBe(before);
    expect(
      await db.inventoryLog.count({ where: { refId: placed.orderId, reason: "CANCEL" } }),
    ).toBe(1);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(0);
    expect(await db.couponRedemption.count({ where: { orderId: placed.orderId } })).toBe(0);
    const order = await db.order.findUniqueOrThrow({
      where: { id: placed.orderId },
      include: { refunds: true, events: true },
    });
    expect(order.status).toBe("CANCELLED");
    expect(order.cancelReason).toBe("Ordered by mistake");
    expect(order.refunds).toHaveLength(0);
    expect(
      order.events.some(
        (e) => e.status === "CANCELLED" && e.message.startsWith("Cancelled by you"),
      ),
    ).toBe(true);

    // The coupon can be used again now.
    const again = await codOrderFor(userA, b!, 1, coupon.code);
    expect(again.orderNumber).not.toBe(placed.orderNumber);
    await expect(
      cancelOrder({
        orderId: placed.orderId,
        userId: userA.id,
        reason: "twice",
        source: "customer",
      }),
    ).rejects.toMatchObject({ code: "STATE" });
  });

  it("queues a PENDING refund for a paid order and refuses once shipped", async () => {
    const [a] = variants;
    const placed = await paidOrderFor(userA, a!);
    const before = await stockOf(a!.id);

    const result = await cancelOrder({
      orderId: placed.orderId,
      userId: userA.id,
      reason: "Changed my mind",
      source: "customer",
    });
    expect(result.refundQueued).toBe(true);
    expect(await stockOf(a!.id)).toBe(before + 1);
    const refund = await db.refund.findFirstOrThrow({ where: { orderId: placed.orderId } });
    expect(refund).toMatchObject({ status: "PENDING", amount: placed.grandTotal });

    const shipped = await codOrderFor(userA, a!);
    await db.order.update({ where: { id: shipped.orderId }, data: { status: "SHIPPED" } });
    await expect(
      cancelOrder({
        orderId: shipped.orderId,
        userId: userA.id,
        reason: "late",
        source: "customer",
      }),
    ).rejects.toMatchObject({ code: "STATE" });
    expect(
      await db.inventoryLog.count({ where: { refId: shipped.orderId, reason: "CANCEL" } }),
    ).toBe(0);
  });
});

describe("returns", () => {
  it("allows a partial return, keeps the rest returnable, and stops at the ordered quantity", async () => {
    const [, , c] = variants;
    const placed = await paidOrderFor(userA, c!, 3);
    const deliveredAt = new Date(Date.now() - 2 * 86_400_000);
    await db.order.update({
      where: { id: placed.orderId },
      data: { status: "DELIVERED", deliveredAt },
    });
    const stockBefore = await stockOf(c!.id);

    const first = await getReturnableOrder(placed.orderId, userA.id);
    expect(first?.window.open).toBe(true);
    expect(first?.items[0]).toMatchObject({ ordered: 3, returned: 0, remaining: 3 });
    const orderItemId = first!.items[0]!.orderItemId;
    const pickup = {
      fullName: "Integration a",
      phone: "9800000099",
      line1: "1 Test Lane",
      line2: undefined,
      landmark: undefined,
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034",
      country: "IN" as const,
      type: "HOME" as const,
    };

    await createReturnRequest({
      orderId: placed.orderId,
      userId: userA.id,
      type: "RETURN",
      reason: "SIZE_SMALL",
      comment: undefined,
      items: [{ orderItemId, qty: 1, reason: "SIZE_SMALL" }],
      pickupAddress: pickup,
      photos: [],
    });
    const after = await getReturnableOrder(placed.orderId, userA.id);
    expect(after?.items[0]).toMatchObject({ ordered: 3, returned: 1, remaining: 2 });
    expect((await db.order.findUniqueOrThrow({ where: { id: placed.orderId } })).status).toBe(
      "RETURN_REQUESTED",
    );
    // Returns never restock on their own.
    expect(await stockOf(c!.id)).toBe(stockBefore);

    await expect(
      createReturnRequest({
        orderId: placed.orderId,
        userId: userA.id,
        type: "RETURN",
        reason: "DAMAGED",
        comment: undefined,
        items: [{ orderItemId, qty: 3, reason: "DAMAGED" }],
        pickupAddress: pickup,
        photos: [],
      }),
    ).rejects.toMatchObject({ code: "STATE" });

    await createReturnRequest({
      orderId: placed.orderId,
      userId: userA.id,
      type: "EXCHANGE",
      reason: "SIZE_LARGE",
      comment: "UK 9 please",
      items: [{ orderItemId, qty: 2, reason: "SIZE_LARGE" }],
      pickupAddress: pickup,
      photos: [],
    });
    const done = await getReturnableOrder(placed.orderId, userA.id);
    expect(done?.items[0]!.remaining).toBe(0);
    const detail = await getOrderDetailForUser(placed.orderId, userA.id);
    expect(detail?.returns).toHaveLength(2);
    expect(detail?.returnableUnits).toBe(0);
  });

  it("refuses a return after the window closes and for someone else's order", async () => {
    const [a] = variants;
    const placed = await codOrderFor(userA, a!);
    await db.order.update({
      where: { id: placed.orderId },
      data: { status: "DELIVERED", deliveredAt: new Date(Date.now() - 30 * 86_400_000) },
    });
    const view = await getReturnableOrder(placed.orderId, userA.id);
    expect(view?.window.open).toBe(false);
    const pickup = {
      fullName: "Integration a",
      phone: "9800000099",
      line1: "1 Test Lane",
      line2: undefined,
      landmark: undefined,
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034",
      country: "IN" as const,
      type: "HOME" as const,
    };
    const items = [
      { orderItemId: view!.items[0]!.orderItemId, qty: 1, reason: "QUALITY" as const },
    ];
    await expect(
      createReturnRequest({
        orderId: placed.orderId,
        userId: userA.id,
        type: "RETURN",
        reason: "QUALITY",
        comment: undefined,
        items,
        pickupAddress: pickup,
        photos: [],
      }),
    ).rejects.toMatchObject({ code: "STATE" });
    await expect(
      createReturnRequest({
        orderId: placed.orderId,
        userId: userB.id,
        type: "RETURN",
        reason: "QUALITY",
        comment: undefined,
        items,
        pickupAddress: pickup,
        photos: [],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("addresses", () => {
  it("deleting an address leaves the order's snapshot untouched and promotes a new default", async () => {
    const [a] = variants;
    const placed = await codOrderFor(userA, a!);
    const base = {
      fullName: "Integration a",
      phone: "9800000099",
      line1: "1 Test Lane",
      line2: undefined,
      landmark: undefined,
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034",
      country: "IN" as const,
      type: "HOME" as const,
    };
    const first = await createAddress(userA.id, { ...base, isDefault: false });
    const second = await createAddress(userA.id, {
      ...base,
      line1: "2 Test Lane",
      isDefault: false,
    });
    expect(first.isDefault).toBe(true);
    expect(second.isDefault).toBe(false);

    expect(await deleteAddress(userB.id, first.id)).toBe(false);
    expect(await deleteAddress(userA.id, first.id)).toBe(true);
    const remaining = await listAddresses(userA.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ id: second.id, isDefault: true });

    const order = await db.order.findUniqueOrThrow({
      where: { id: placed.orderId },
      select: { shippingAddress: true },
    });
    expect(order.shippingAddress).toMatchObject({ line1: "1 Test Lane", pincode: "560034" });
  });
});

describe("guest tracking", () => {
  it("matches on email or phone and returns nothing otherwise", async () => {
    const [a] = variants;
    const placed = await codOrderFor(userA, a!);
    expect(
      (await trackOrder({ orderNumber: placed.orderNumber, contact: userA.email.toUpperCase() }))
        ?.status,
    ).toBe("CONFIRMED");
    expect(
      (await trackOrder({ orderNumber: placed.orderNumber, contact: "+91 98000 00099" }))?.timeline
        .steps[0]?.state,
    ).toBe("current");
    expect(await trackOrder({ orderNumber: placed.orderNumber, contact: userB.email })).toBeNull();
    expect(await trackOrder({ orderNumber: "OWL-2026-999999", contact: userA.email })).toBeNull();
  });
});

describe("password change", () => {
  it("needs the current password, stores the new hash and bumps the session version", async () => {
    const before = await db.user.findUniqueOrThrow({
      where: { id: userA.id },
      select: { sessionVersion: true },
    });
    await expect(
      changePassword(userA.id, { currentPassword: "wrong", newPassword: "owlyn-new-5678" }),
    ).rejects.toMatchObject({ field: "currentPassword" });
    const result = await changePassword(userA.id, {
      currentPassword: "owlyn-test-1234",
      newPassword: "owlyn-new-5678",
    });
    expect(result.sessionVersion).toBe(before.sessionVersion + 1);
    const user = await db.user.findUniqueOrThrow({
      where: { id: userA.id },
      select: { passwordHash: true },
    });
    expect(await verifyPassword(user.passwordHash!, "owlyn-new-5678")).toBe(true);
  });
});
