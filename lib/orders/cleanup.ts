import { db } from "@/lib/db";

/**
 * Reservations hold stock for a PENDING prepaid order until its TTL passes.
 * The cleanup releases expired reservations and cancels stale unpaid orders,
 * reversing their coupon redemption. Safe to run any number of times.
 */

export type CleanupResult = { releasedReservations: number; cancelledOrders: number };

export async function runOrderCleanup(now = new Date()): Promise<CleanupResult> {
  const released = await db.stockReservation.updateMany({
    where: { releasedAt: null, expiresAt: { lt: now } },
    data: { releasedAt: now },
  });

  const stale = await db.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: "PENDING",
      needsReview: false,
      expiresAt: { lt: now },
    },
    select: { id: true },
    take: 200,
  });
  let cancelled = 0;
  for (const order of stale) {
    if (await abandonUnpaidOrder(order.id, "Payment window closed.", now)) cancelled += 1;
  }
  return { releasedReservations: released.count, cancelledOrders: cancelled };
}

/**
 * Cancels a PENDING, unpaid order: releases its reservations, gives the
 * coupon use back, and records why. Returns false when the order has moved on
 * (paid, already cancelled), so a late webhook and the cleanup cannot fight.
 */
export async function abandonUnpaidOrder(
  orderId: string,
  reason: string,
  now = new Date(),
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentStatus: true, couponCode: true },
    });
    if (!order || order.status !== "PENDING" || order.paymentStatus === "PAID") return false;

    await tx.stockReservation.updateMany({
      where: { orderId, releasedAt: null },
      data: { releasedAt: now },
    });

    const redemption = await tx.couponRedemption.findUnique({
      where: { orderId },
      select: { id: true, couponId: true },
    });
    if (redemption) {
      await tx.couponRedemption.delete({ where: { id: redemption.id } });
      await tx.coupon.updateMany({
        where: { id: redemption.couponId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }

    await tx.payment.updateMany({
      where: { orderId, provider: "RAZORPAY", status: "CREATED" },
      data: { status: "FAILED", failureReason: reason },
    });
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        paymentStatus: "FAILED",
        cancelledAt: now,
        cancelReason: reason,
        events: {
          create: [{ type: "STATUS", status: "CANCELLED", message: `Cancelled. ${reason}` }],
        },
      },
    });
    return true;
  });
}
