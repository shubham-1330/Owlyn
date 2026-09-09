import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { cartTag } from "@/lib/cache";
import { db } from "@/lib/db";
import { afterOrderConfirmed, notifyOrderNeedsReview } from "@/lib/orders/after";

/**
 * The PAID transition. One function serves the verified browser callback and
 * the webhook, so whichever arrives first completes the order and the other
 * finds it already captured and does nothing.
 *
 * Inside the transaction: the order row is locked, the variants are locked
 * FOR UPDATE, stock is checked and decremented with InventoryLog rows, the
 * reservations are released, the order goes CONFIRMED + PAID and the bag is
 * cleared. If the money arrived but stock is gone, the order is parked for
 * review with a PENDING refund row instead of being fulfilled.
 */

export type CaptureInput = {
  providerOrderId: string;
  providerPaymentId: string;
  amount: number;
  method: string | null;
  signature?: string | null;
  raw: unknown;
  source: "webhook" | "callback";
};

export type CaptureResult =
  | { status: "captured"; orderId: string }
  | { status: "already_captured"; orderId: string }
  | { status: "needs_review"; orderId: string; reason: string }
  | { status: "not_found" };

export async function capturePayment(input: CaptureInput): Promise<CaptureResult> {
  const now = new Date();
  const result = await db.$transaction(
    async (tx): Promise<CaptureResult & { cartId?: string | null }> => {
      const paymentRow = await tx.payment.findFirst({
        where: { providerOrderId: input.providerOrderId, provider: "RAZORPAY" },
        orderBy: { createdAt: "asc" },
        select: { id: true, orderId: true },
      });
      if (!paymentRow) return { status: "not_found" };

      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${paymentRow.orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: paymentRow.orderId },
        include: { items: true, payments: true },
      });
      if (!order) return { status: "not_found" };

      const existing = order.payments.find((p) => p.providerPaymentId === input.providerPaymentId);
      if (existing?.status === "CAPTURED" || order.paymentStatus === "PAID") {
        return { status: "already_captured", orderId: order.id };
      }

      // Record the capture on the row created at placement (or on the row for this payment id).
      const target = existing ?? order.payments.find((p) => p.id === paymentRow.id)!;
      await tx.payment.update({
        where: { id: target.id },
        data: {
          providerPaymentId: input.providerPaymentId,
          signature: input.signature ?? undefined,
          method: input.method,
          amount: input.amount,
          status: "CAPTURED",
          capturedAt: now,
          rawPayload: input.raw as Prisma.InputJsonValue,
        },
      });

      const park = async (reason: string): Promise<CaptureResult> => {
        await tx.stockReservation.updateMany({
          where: { orderId: order.id, releasedAt: null },
          data: { releasedAt: now },
        });
        await tx.refund.create({
          data: {
            orderId: order.id,
            paymentId: target.id,
            amount: input.amount,
            reason,
            status: "PENDING",
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            needsReview: true,
            reviewReason: reason,
            events: {
              create: [
                {
                  type: "PAYMENT",
                  message: `Payment captured (${input.method ?? "online"}).`,
                  isCustomerVisible: false,
                },
                { type: "NOTE", message: `Needs review: ${reason}`, isCustomerVisible: false },
              ],
            },
          },
        });
        return { status: "needs_review", orderId: order.id, reason };
      };

      if (order.status === "CANCELLED") {
        return park(
          "Payment captured after the order was cancelled because the payment window had closed.",
        );
      }
      if (input.amount !== order.grandTotal) {
        return park(
          `Captured amount ${input.amount} paise does not match the order total ${order.grandTotal} paise.`,
        );
      }

      const variantIds = Array.from(
        new Set(order.items.map((i) => i.variantId).filter((v): v is string => Boolean(v))),
      ).sort();
      const locked = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
        SELECT id, stock FROM "ProductVariant" WHERE id IN (${Prisma.join(variantIds)}) ORDER BY id FOR UPDATE`;
      const stockOf = new Map(locked.map((r) => [r.id, r.stock]));
      const short = order.items.filter(
        (i) => !i.variantId || (stockOf.get(i.variantId) ?? 0) < i.qty,
      );
      if (short.length > 0) {
        return park(
          `Stock ran out before payment was captured: ${short.map((i) => `${i.name} (${i.color}, ${i.size})`).join(", ")}.`,
        );
      }

      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId! },
          data: { stock: { decrement: item.qty } },
        });
        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId!,
            delta: -item.qty,
            reason: "SALE",
            refId: order.id,
            note: order.orderNumber,
          },
        });
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { salesCount: { increment: item.qty } },
          });
        }
      }
      await tx.stockReservation.updateMany({
        where: { orderId: order.id, releasedAt: null },
        data: { releasedAt: now },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
          confirmedAt: now,
          events: {
            create: [
              { type: "PAYMENT", message: `Payment received (${input.method ?? "online"}).` },
              { type: "STATUS", status: "CONFIRMED", message: "Order confirmed." },
            ],
          },
        },
      });
      if (order.cartId) {
        await tx.cartItem.deleteMany({ where: { cartId: order.cartId } });
        await tx.cart.updateMany({ where: { id: order.cartId }, data: { couponCode: null } });
      }
      return { status: "captured", orderId: order.id, cartId: order.cartId };
    },
    { timeout: 15_000 },
  );

  if (result.status === "captured") {
    if (result.cartId) revalidateTag(cartTag(result.cartId));
    void afterOrderConfirmed(result.orderId);
  } else if (result.status === "needs_review") {
    void notifyOrderNeedsReview(result.orderId);
  }
  return result;
}

/** A failed attempt. The order stays PENDING so the shopper can retry until it expires. */
export async function failPayment(input: {
  providerOrderId: string;
  providerPaymentId: string;
  reason: string | null;
  method: string | null;
  raw: unknown;
}): Promise<{ status: "recorded" | "ignored" | "not_found" }> {
  const base = await db.payment.findFirst({
    where: { providerOrderId: input.providerOrderId, provider: "RAZORPAY" },
    select: { orderId: true, order: { select: { paymentStatus: true } } },
  });
  if (!base) return { status: "not_found" };
  if (base.order.paymentStatus === "PAID") return { status: "ignored" };

  await db.payment.upsert({
    where: { providerPaymentId: input.providerPaymentId },
    update: {
      status: "FAILED",
      failureReason: input.reason,
      rawPayload: input.raw as Prisma.InputJsonValue,
    },
    create: {
      orderId: base.orderId,
      provider: "RAZORPAY",
      providerOrderId: input.providerOrderId,
      providerPaymentId: input.providerPaymentId,
      method: input.method,
      amount: 0,
      status: "FAILED",
      failureReason: input.reason,
      rawPayload: input.raw as Prisma.InputJsonValue,
    },
  });
  await db.orderEvent.create({
    data: {
      orderId: base.orderId,
      type: "PAYMENT",
      message: `Payment attempt failed${input.reason ? `: ${input.reason}` : "."}`,
      isCustomerVisible: false,
    },
  });
  return { status: "recorded" };
}

/** refund.processed from the provider. Links to a PENDING refund row when one matches, else creates one. */
export async function processRefund(input: {
  providerRefundId: string;
  providerPaymentId: string;
  amount: number;
  raw: unknown;
}): Promise<{ status: "recorded" | "already" | "not_found" }> {
  const payment = await db.payment.findUnique({
    where: { providerPaymentId: input.providerPaymentId },
    select: { id: true, orderId: true, amount: true },
  });
  if (!payment) return { status: "not_found" };
  const existing = await db.refund.findUnique({
    where: { providerRefundId: input.providerRefundId },
    select: { id: true, status: true },
  });
  if (existing?.status === "COMPLETED") return { status: "already" };

  const now = new Date();
  await db.$transaction(async (tx) => {
    const pending = existing
      ? null
      : await tx.refund.findFirst({
          where: {
            orderId: payment.orderId,
            providerRefundId: null,
            status: { in: ["PENDING", "PROCESSING"] },
            amount: input.amount,
          },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
    if (existing) {
      await tx.refund.update({
        where: { id: existing.id },
        data: {
          status: "COMPLETED",
          processedAt: now,
          rawPayload: input.raw as Prisma.InputJsonValue,
        },
      });
    } else if (pending) {
      await tx.refund.update({
        where: { id: pending.id },
        data: {
          providerRefundId: input.providerRefundId,
          status: "COMPLETED",
          processedAt: now,
          rawPayload: input.raw as Prisma.InputJsonValue,
        },
      });
    } else {
      await tx.refund.create({
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          amount: input.amount,
          reason: "Refund processed by provider",
          status: "COMPLETED",
          providerRefundId: input.providerRefundId,
          processedAt: now,
          rawPayload: input.raw as Prisma.InputJsonValue,
        },
      });
    }
    const refunded = await tx.refund.aggregate({
      where: { orderId: payment.orderId, status: "COMPLETED" },
      _sum: { amount: true },
    });
    const total = refunded._sum.amount ?? 0;
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: total >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED",
        events: {
          create: [
            {
              type: "REFUND",
              message: `Refund of ${(input.amount / 100).toFixed(2)} INR processed.`,
            },
          ],
        },
      },
    });
  });
  return { status: "recorded" };
}
