import { writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { capturePayment } from "@/lib/orders/capture";
import { placeOrder } from "@/lib/orders/create";
import type { PlaceOrderInput } from "@/lib/validations/checkout";

import { pickVariants, rateFor, type TestVariant } from "./helpers";

/**
 * Not a test: a fixture builder for manual checks of the account area.
 * Run with DEMO_ORDERS=1 to give Asha (customer A) a cancellable order, a
 * delivered order and a shipped order, and Ravi (customer B) one order.
 * Skipped otherwise so the normal suite never touches demo accounts.
 */

const enabled = process.env.DEMO_ORDERS === "1";

async function setUserCart(
  userId: string,
  items: Array<{ variant: TestVariant; qty: number }>,
  couponCode?: string,
) {
  const cart = await db.cart.upsert({
    where: { userId },
    update: { couponCode: couponCode ?? null },
    create: { userId, couponCode: couponCode ?? null },
    select: { id: true },
  });
  await db.cartItem.deleteMany({ where: { cartId: cart.id } });
  await db.cartItem.createMany({
    data: items.map((i) => ({
      cartId: cart.id,
      variantId: i.variant.id,
      qty: i.qty,
      priceAtAdd: i.variant.price,
    })),
  });
  return cart.id;
}

async function input(
  user: { email: string; phone: string | null },
  method: "COD" | "RAZORPAY",
): Promise<PlaceOrderInput> {
  return {
    paymentMethod: method,
    contact: { email: user.email, phone: user.phone ?? "9876543210" },
    shippingAddress: {
      fullName: "Asha Iyer",
      phone: user.phone ?? "9876543210",
      line1: "14, 3rd Cross, 5th Block",
      line2: "Koramangala",
      landmark: undefined,
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034",
      country: "IN",
      type: "HOME",
    },
    billingSameAsShipping: true,
    shippingRateId: await rateFor("560034"),
    saveAddress: false,
    customerNote: undefined,
  };
}

describe.skipIf(!enabled)("demo orders for the account area", () => {
  it("creates orders for customer A and customer B", async () => {
    const asha = await db.user.findUniqueOrThrow({ where: { email: "asha.iyer@example.com" } });
    const ravi = await db.user.upsert({
      where: { email: "ravi.menon@example.com" },
      update: {},
      create: {
        email: "ravi.menon@example.com",
        name: "Ravi Menon",
        phone: "9811111111",
        passwordHash: await hashPassword("owlyn-demo-2026"),
        emailVerified: new Date(),
      },
    });
    const [v1, v2, v3] = await pickVariants(3);

    // A1: cancellable COD order with a coupon.
    const a1 = await placeOrder(await input(asha, "COD"), {
      userId: asha.id,
      cartId: await setUserCart(asha.id, [{ variant: v1!, qty: 1 }], "FLAT300"),
    });

    // A2: prepaid, captured, delivered yesterday: 2 units + 1 unit for a partial return.
    const a2 = await placeOrder(await input(asha, "RAZORPAY"), {
      userId: asha.id,
      cartId: await setUserCart(asha.id, [
        { variant: v2!, qty: 2 },
        { variant: v3!, qty: 1 },
      ]),
    });
    const a2Payment = await db.payment.findFirstOrThrow({ where: { orderId: a2.orderId } });
    await capturePayment({
      providerOrderId: a2Payment.providerOrderId!,
      providerPaymentId: `pay_demo_${a2.orderNumber}`,
      amount: a2.grandTotal,
      method: "upi",
      raw: {},
      source: "webhook",
    });
    const day = 86_400_000;
    const now = Date.now();
    await db.order.update({
      where: { id: a2.orderId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(now - day),
        events: {
          create: [
            {
              type: "STATUS",
              status: "PACKED",
              message: "Packed and ready.",
              createdAt: new Date(now - 4 * day),
            },
            {
              type: "STATUS",
              status: "SHIPPED",
              message: "Handed to Delhivery.",
              createdAt: new Date(now - 3 * day),
            },
            {
              type: "STATUS",
              status: "OUT_FOR_DELIVERY",
              message: "Out for delivery.",
              createdAt: new Date(now - day + 3_600_000),
            },
            {
              type: "STATUS",
              status: "DELIVERED",
              message: "Delivered.",
              createdAt: new Date(now - day + 5 * 3_600_000),
            },
          ],
        },
        shipments: {
          create: [
            {
              courier: "Delhivery",
              awb: "DL9988776655",
              trackingUrl: "https://www.delhivery.com/track/package/DL9988776655",
              status: "DELIVERED",
              shippedAt: new Date(now - 3 * day),
              deliveredAt: new Date(now - day),
            },
          ],
        },
      },
    });

    // A3: COD, shipped, in transit.
    const a3 = await placeOrder(await input(asha, "COD"), {
      userId: asha.id,
      cartId: await setUserCart(asha.id, [{ variant: v3!, qty: 1 }]),
    });
    await db.order.update({
      where: { id: a3.orderId },
      data: {
        status: "SHIPPED",
        events: {
          create: [
            {
              type: "STATUS",
              status: "PACKED",
              message: "Packed and ready.",
              createdAt: new Date(now - 2 * 3_600_000),
            },
            {
              type: "STATUS",
              status: "SHIPPED",
              message: "Handed to Bluedart.",
              createdAt: new Date(now - 3_600_000),
            },
          ],
        },
        shipments: {
          create: [
            {
              courier: "Bluedart",
              awb: "BD5544332211",
              trackingUrl: null,
              status: "IN_TRANSIT",
              shippedAt: new Date(now - 3_600_000),
            },
          ],
        },
      },
    });

    // B1: Ravi's order, for the cross-customer 404 check.
    const b1 = await placeOrder(
      {
        ...(await input(ravi, "COD")),
        shippingAddress: {
          ...(await input(ravi, "COD")).shippingAddress,
          fullName: "Ravi Menon",
          line1: "7, Lake View Road",
          line2: "Bandra West",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400050",
        },
        shippingRateId: await rateFor("400050"),
      },
      { userId: ravi.id, cartId: await setUserCart(ravi.id, [{ variant: v1!, qty: 1 }]) },
    );

    const out = { a1, a2, a3, b1 };
    await writeFile(
      process.env.DEMO_ORDERS_OUT ?? "demo-orders.json",
      JSON.stringify(out, null, 2),
    );
    expect(a1.orderId).toBeTruthy();
    expect(b1.orderId).toBeTruthy();
  });
});
