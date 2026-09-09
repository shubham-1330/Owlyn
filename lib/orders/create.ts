import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { cartTag } from "@/lib/cache";
import { couponContextFor, toCouponRule } from "@/lib/cart/load";
import { db } from "@/lib/db";
import { estimateDeliveryWindow } from "@/lib/delivery";
import { signOrderAccess } from "@/lib/orders/access";
import { afterOrderConfirmed } from "@/lib/orders/after";
import { abandonUnpaidOrder } from "@/lib/orders/cleanup";
import { nextOrderNumber } from "@/lib/orders/order-number";
import { orderTaxSplit, placeOfSupply } from "@/lib/orders/tax";
import { OrderError, type AddressSnapshot } from "@/lib/orders/types";
import { createRazorpayOrder, isRazorpayConfigured, razorpayKeyId } from "@/lib/payments/razorpay";
import { priceCart, type PricingLine } from "@/lib/pricing";
import { getStoreConfig } from "@/lib/queries/settings";
import { getShippingZones, lookupPincode } from "@/lib/queries/shipping";
import { findZoneForPincode } from "@/lib/shipping";
import type { AddressInput, PlaceOrderInput } from "@/lib/validations/checkout";

/**
 * Order creation. The client sends an address, a shipping rate id and a
 * payment method. Everything about money comes from the server-side bag and
 * lib/pricing; the invariant throw in priceCart stays live here on purpose.
 *
 * Inside one transaction: variants are locked FOR UPDATE and checked against
 * stock minus active reservations, the coupon row is locked and its limits
 * re-checked before the redemption is written and usedCount incremented,
 * the order number comes from a sequence, and then either stock is
 * decremented immediately (COD) or reserved with a TTL (prepaid).
 */

export type PlaceOrderContext = { userId: string | null; cartId: string };

export type PlaceOrderResult = {
  orderId: string;
  orderNumber: string;
  grandTotal: number;
  paymentMethod: "RAZORPAY" | "COD";
  accessToken: string;
  razorpay: { orderId: string; amount: number; currency: string; keyId: string } | null;
};

function snapshot(address: AddressInput): AddressSnapshot {
  return {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    landmark: address.landmark,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
  };
}

const cartSelect = {
  id: true,
  userId: true,
  couponCode: true,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      qty: true,
      variant: {
        select: {
          id: true,
          sku: true,
          size: true,
          colorName: true,
          price: true,
          stock: true,
          isActive: true,
          weightGrams: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              basePrice: true,
              taxRate: true,
              hsnCode: true,
              status: true,
              deletedAt: true,
              images: {
                where: { kind: "IMAGE" },
                orderBy: { position: "asc" },
                select: { url: true, variant: { select: { colorName: true } } },
              },
              categories: { select: { id: true } },
              collections: { select: { collectionId: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartSelect;

export async function placeOrder(
  input: PlaceOrderInput,
  ctx: PlaceOrderContext,
): Promise<PlaceOrderResult> {
  const now = new Date();
  const [cart, config, zones] = await Promise.all([
    db.cart.findUnique({ where: { id: ctx.cartId }, select: cartSelect }),
    getStoreConfig(),
    getShippingZones(),
  ]);
  if (!cart || cart.items.length === 0) throw new OrderError("Your bag is empty.", "EMPTY");
  if (cart.userId && cart.userId !== ctx.userId)
    throw new OrderError("This bag belongs to another account.", "FORBIDDEN");

  // Shipping zone and rate for the delivery pincode.
  const shipping = input.shippingAddress;
  const pin = await lookupPincode(shipping.pincode);
  if (pin && !pin.isServiceable) {
    throw new OrderError(
      `We do not deliver to ${pin.city} ${shipping.pincode} yet.`,
      "UNSERVICEABLE",
    );
  }
  const zone =
    (pin?.zoneId ? zones.find((z) => z.id === pin.zoneId) : undefined) ??
    findZoneForPincode(shipping.pincode, zones);
  if (!zone) throw new OrderError("We do not deliver to this pincode yet.", "UNSERVICEABLE");
  const rate = zone.rates.find((r) => r.id === input.shippingRateId);
  if (!rate) throw new OrderError("Pick a shipping method for this pincode.", "RATE");

  // Pricing lines from the live bag; nothing from the client.
  const lines: PricingLine[] = [];
  const meta = new Map<
    string,
    {
      productId: string;
      variantId: string;
      name: string;
      slug: string;
      sku: string;
      size: string;
      color: string;
      image: string | null;
      hsnCode: string | null;
    }
  >();
  for (const item of cart.items) {
    const v = item.variant;
    const p = v.product;
    if (!v.isActive || p.status !== "ACTIVE" || p.deletedAt !== null) {
      throw new OrderError(
        `${p.name} (${v.colorName}, ${v.size}) is no longer available. Remove it from your bag.`,
        "UNAVAILABLE",
      );
    }
    lines.push({
      id: item.id,
      productId: p.id,
      variantId: v.id,
      unitPrice: v.price ?? p.basePrice,
      qty: item.qty,
      taxRate: p.taxRate,
      weightGrams: v.weightGrams,
      categoryIds: p.categories.map((c) => c.id),
      collectionIds: p.collections.map((c) => c.collectionId),
    });
    const image =
      p.images.find((img) => img.variant?.colorName === v.colorName) ?? p.images[0] ?? null;
    meta.set(item.id, {
      productId: p.id,
      variantId: v.id,
      name: p.name,
      slug: p.slug,
      sku: v.sku,
      size: v.size,
      color: v.colorName,
      image: image?.url ?? null,
      hsnCode: p.hsnCode,
    });
  }

  const couponRow = cart.couponCode
    ? await db.coupon.findUnique({ where: { code: cart.couponCode } })
    : null;
  const couponCtx = await couponContextFor(ctx.userId, cart.couponCode);
  const totals = priceCart({
    lines,
    coupon: couponRow ? toCouponRule(couponRow) : null,
    couponContext: { now, ...couponCtx },
    shippingRate: {
      type: rate.type,
      baseRate: rate.baseRate,
      perKgRate: rate.perKgRate,
      freeAbove: rate.freeAbove,
    },
  });
  if (cart.couponCode && !totals.coupon) {
    throw new OrderError(
      totals.couponError?.message ??
        `${cart.couponCode} no longer applies. Remove it and try again.`,
      "COUPON",
    );
  }
  if (input.expectedTotal !== undefined && input.expectedTotal !== totals.grandTotal) {
    throw new OrderError(
      "Your bag changed while you were checking out. Review the totals and try again.",
      "TOTAL_CHANGED",
    );
  }

  const codAllowed =
    (pin ? pin.codAvailable : zone.codAvailable) && totals.grandTotal <= config.codLimit;
  if (input.paymentMethod === "COD" && !codAllowed) {
    throw new OrderError("Cash on delivery is not available for this order.", "COD");
  }
  if (input.paymentMethod === "RAZORPAY" && !isRazorpayConfigured()) {
    throw new OrderError(
      "Online payment is not available right now. Choose cash on delivery.",
      "RAZORPAY",
    );
  }

  const pos = placeOfSupply(shipping.state, config.address.state);
  const taxSplit = orderTaxSplit(totals.taxTotal, pos.isInterState);
  const window = estimateDeliveryWindow({
    now,
    cutoffHour: config.dispatchCutoffHour,
    minDays: rate.minDays,
    maxDays: rate.maxDays,
  });
  const isCod = input.paymentMethod === "COD";
  const expiresAt = new Date(now.getTime() + config.reservationMinutes * 60_000);
  const shippingSnapshot = snapshot(shipping);
  const billingSnapshot =
    input.billingSameAsShipping || !input.billingAddress
      ? shippingSnapshot
      : snapshot(input.billingAddress);

  const created = await db.$transaction(
    async (tx) => {
      const variantIds = Array.from(new Set(lines.map((l) => l.variantId))).sort();
      const locked = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
        SELECT id, stock FROM "ProductVariant" WHERE id IN (${Prisma.join(variantIds)}) ORDER BY id FOR UPDATE`;
      const stockOf = new Map(locked.map((r) => [r.id, r.stock]));
      const reserved = await tx.stockReservation.groupBy({
        by: ["variantId"],
        where: { variantId: { in: variantIds }, releasedAt: null, expiresAt: { gt: now } },
        _sum: { qty: true },
      });
      const reservedOf = new Map(reserved.map((r) => [r.variantId, r._sum.qty ?? 0]));
      for (const line of lines) {
        const available =
          (stockOf.get(line.variantId) ?? 0) - (reservedOf.get(line.variantId) ?? 0);
        if (line.qty > available) {
          const m = meta.get(line.id)!;
          throw new OrderError(
            available <= 0
              ? `${m.name} (${m.color}, ${m.size}) just sold out.`
              : `Only ${available} of ${m.name} (${m.color}, ${m.size}) left; your bag asks for ${line.qty}.`,
            "STOCK",
          );
        }
      }

      if (totals.coupon && couponRow) {
        const [lockedCoupon] = await tx.$queryRaw<
          Array<{ usedCount: number; usageLimit: number | null; perUserLimit: number | null }>
        >`
          SELECT "usedCount", "usageLimit", "perUserLimit" FROM "Coupon" WHERE id = ${couponRow.id} FOR UPDATE`;
        if (!lockedCoupon) throw new OrderError(`${couponRow.code} no longer exists.`, "COUPON");
        if (lockedCoupon.usageLimit !== null && lockedCoupon.usedCount >= lockedCoupon.usageLimit) {
          throw new OrderError(`${couponRow.code} has been used up.`, "COUPON");
        }
        if (ctx.userId && lockedCoupon.perUserLimit !== null) {
          const used = await tx.couponRedemption.count({
            where: { couponId: couponRow.id, userId: ctx.userId },
          });
          if (used >= lockedCoupon.perUserLimit)
            throw new OrderError(`You have already used ${couponRow.code}.`, "COUPON");
        }
        await tx.coupon.update({
          where: { id: couponRow.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const orderNumber = await nextOrderNumber(tx, now);
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: ctx.userId,
          email: input.contact.email,
          phone: input.contact.phone,
          status: isCod ? "CONFIRMED" : "PENDING",
          paymentStatus: "PENDING",
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          shippingTotal: totals.shippingTotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          currency: "INR",
          couponCode: totals.coupon?.code ?? null,
          shippingMethod: rate.name,
          shippingRateId: rate.id,
          shippingAddress: shippingSnapshot as unknown as Prisma.InputJsonValue,
          billingAddress: billingSnapshot as unknown as Prisma.InputJsonValue,
          customerNote: input.customerNote ?? null,
          cartId: cart.id,
          paymentMethod: input.paymentMethod,
          placeOfSupply: pos.state,
          isInterState: pos.isInterState,
          ...taxSplit,
          expiresAt: isCod ? null : expiresAt,
          placedAt: now,
          confirmedAt: isCod ? now : null,
          estimatedDeliveryFrom: window.earliest,
          estimatedDeliveryTo: window.latest,
          items: {
            create: totals.lines.map((l) => {
              const m = meta.get(l.id)!;
              return {
                productId: m.productId,
                variantId: m.variantId,
                name: m.name,
                slug: m.slug,
                sku: m.sku,
                size: m.size,
                color: m.color,
                image: m.image,
                unitPrice: l.unitPrice,
                qty: l.qty,
                discount: l.discount,
                taxRate: l.taxRate,
                taxAmount: l.taxAmount,
                hsnCode: m.hsnCode,
                lineTotal: l.lineTotal,
              };
            }),
          },
          events: {
            create: [
              {
                type: "STATUS",
                status: isCod ? "CONFIRMED" : "PENDING",
                message: isCod
                  ? "Order placed. Cash on delivery."
                  : "Order placed. Waiting for payment.",
              },
            ],
          },
        },
        select: { id: true, orderNumber: true },
      });

      if (totals.coupon && couponRow) {
        await tx.couponRedemption.create({
          data: {
            couponId: couponRow.id,
            userId: ctx.userId,
            orderId: order.id,
            discount: totals.discountTotal,
          },
        });
      }

      if (isCod) {
        for (const line of totals.lines) {
          await tx.productVariant.update({
            where: { id: line.variantId },
            data: { stock: { decrement: line.qty } },
          });
          await tx.inventoryLog.create({
            data: {
              variantId: line.variantId,
              delta: -line.qty,
              reason: "SALE",
              refId: order.id,
              note: order.orderNumber,
            },
          });
          await tx.product.update({
            where: { id: line.productId },
            data: { salesCount: { increment: line.qty } },
          });
        }
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: "COD",
            method: "cod",
            amount: totals.grandTotal,
            status: "CREATED",
          },
        });
        // The order is confirmed, so the bag can go.
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
      } else {
        await tx.stockReservation.createMany({
          data: totals.lines.map((l) => ({
            variantId: l.variantId,
            orderId: order.id,
            qty: l.qty,
            expiresAt,
          })),
        });
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: "RAZORPAY",
            amount: totals.grandTotal,
            status: "CREATED",
          },
        });
      }

      if (ctx.userId && input.saveAddress) {
        const count = await tx.address.count({ where: { userId: ctx.userId } });
        await tx.address.create({
          data: {
            userId: ctx.userId,
            ...shippingSnapshot,
            type: shipping.type,
            isDefault: count === 0,
          },
        });
      }

      return order;
    },
    { timeout: 15_000 },
  );

  let razorpay: PlaceOrderResult["razorpay"] = null;
  if (!isCod) {
    try {
      const rzp = await createRazorpayOrder({
        amountPaise: totals.grandTotal,
        receipt: created.orderNumber,
        notes: { orderId: created.id, orderNumber: created.orderNumber },
      });
      await db.payment.updateMany({
        where: { orderId: created.id, provider: "RAZORPAY" },
        data: { providerOrderId: rzp.id },
      });
      razorpay = {
        orderId: rzp.id,
        amount: rzp.amount,
        currency: rzp.currency,
        keyId: razorpayKeyId(),
      };
    } catch (error) {
      console.error("Razorpay order creation failed", error);
      await abandonUnpaidOrder(created.id, "Could not start the payment.");
      throw new OrderError(
        "We could not start the payment. Nothing was charged. Please try again.",
        "RAZORPAY",
      );
    }
  } else {
    revalidateTag(cartTag(cart.id));
    void afterOrderConfirmed(created.id);
  }

  return {
    orderId: created.id,
    orderNumber: created.orderNumber,
    grandTotal: totals.grandTotal,
    paymentMethod: input.paymentMethod,
    accessToken: signOrderAccess(created.id),
    razorpay,
  };
}
