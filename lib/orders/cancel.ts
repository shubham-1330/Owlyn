import { db } from "@/lib/db";
import { sendOrderCancelledEmail } from "@/lib/orders/after";
import { canCancel, ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { OrderError } from "@/lib/orders/types";

/**
 * Cancellation, usable by the customer (ownership enforced through userId)
 * and later by staff. One transaction: the order row is locked, stock goes
 * back with InventoryLog CANCEL rows, the coupon redemption is reversed, and
 * a prepaid order gets a PENDING Refund row for the admin refund action.
 */

export type CancelOrderInput = {
  orderId: string;
  /** When set, the order must belong to this user; otherwise it does not exist. */
  userId?: string | null;
  actorId?: string | null;
  reason: string;
  source: "customer" | "staff";
};

export type CancelOrderResult = {
  orderNumber: string;
  restocked: number;
  refundQueued: boolean;
};

export async function cancelOrder(input: CancelOrderInput): Promise<CancelOrderResult> {
  const now = new Date();
  const result = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: {
          items: true,
          payments: { where: { status: "CAPTURED" }, orderBy: { capturedAt: "desc" }, take: 1 },
        },
      });
      if (!order || (input.userId && order.userId !== input.userId)) {
        throw new OrderError("Order not found.", "NOT_FOUND");
      }
      if (!canCancel(order.status)) {
        throw new OrderError(
          order.status === "CANCELLED"
            ? `Order ${order.orderNumber} is already cancelled.`
            : `Order ${order.orderNumber} is ${ORDER_STATUS_LABEL[order.status].toLowerCase()} and can no longer be cancelled. You can return it once it arrives.`,
          "STATE",
        );
      }

      let restocked = 0;
      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.qty } },
        });
        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId,
            delta: item.qty,
            reason: "CANCEL",
            refId: order.id,
            note: order.orderNumber,
            actorId: input.actorId ?? null,
          },
        });
        if (item.productId) {
          await tx.product.updateMany({
            where: { id: item.productId, salesCount: { gte: item.qty } },
            data: { salesCount: { decrement: item.qty } },
          });
        }
        restocked += item.qty;
      }
      await tx.stockReservation.updateMany({
        where: { orderId: order.id, releasedAt: null },
        data: { releasedAt: now },
      });

      const redemption = await tx.couponRedemption.findUnique({
        where: { orderId: order.id },
        select: { id: true, couponId: true },
      });
      if (redemption) {
        await tx.couponRedemption.delete({ where: { id: redemption.id } });
        await tx.coupon.updateMany({
          where: { id: redemption.couponId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }

      let refundQueued = false;
      if (order.paymentStatus === "PAID") {
        await tx.refund.create({
          data: {
            orderId: order.id,
            paymentId: order.payments[0]?.id ?? null,
            amount: order.grandTotal,
            reason: `Order cancelled: ${input.reason}`,
            status: "PENDING",
          },
        });
        refundQueued = true;
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelReason: input.reason,
          events: {
            create: [
              {
                type: "STATUS",
                status: "CANCELLED",
                message:
                  input.source === "customer"
                    ? `Cancelled by you. ${input.reason}`
                    : `Cancelled by Owlyn. ${input.reason}`,
                actorId: input.actorId ?? null,
              },
              ...(refundQueued
                ? [
                    {
                      type: "REFUND" as const,
                      message:
                        "Refund queued. It reaches the original payment method within 5 to 7 working days once processed.",
                    },
                  ]
                : []),
            ],
          },
        },
      });

      return { orderNumber: order.orderNumber, restocked, refundQueued };
    },
    { timeout: 15_000 },
  );

  void sendOrderCancelledEmail(
    input.orderId,
    input.source === "customer" ? "You cancelled it before it shipped." : input.reason,
  );
  return result;
}
