import { OrderConfirmationEmail, orderConfirmationSubject } from "@/emails/order-confirmation";
import { OrderNeedsReviewEmail } from "@/emails/order-status";
import type { OrderEmailData } from "@/emails/types";
import { db } from "@/lib/db";
import { formatDeliveryWindow } from "@/lib/delivery";
import { sendEmail } from "@/lib/email/send";
import { ensureInvoice } from "@/lib/invoices/service";
import { signOrderAccess } from "@/lib/orders/access";
import { isAddressSnapshot } from "@/lib/orders/types";
import { absoluteUrl } from "@/lib/site";

/**
 * Side effects after an order is confirmed or parked. Never inside the
 * transaction; failures are logged and the order stays correct without them.
 */

export async function orderEmailData(orderId: string): Promise<OrderEmailData | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { createdAt: "asc" } }, user: { select: { name: true } } },
  });
  if (!order) return null;
  const shipping = isAddressSnapshot(order.shippingAddress) ? order.shippingAddress : null;
  const window =
    order.estimatedDeliveryFrom && order.estimatedDeliveryTo
      ? formatDeliveryWindow({
          dispatch: order.estimatedDeliveryFrom,
          earliest: order.estimatedDeliveryFrom,
          latest: order.estimatedDeliveryTo,
          afterCutoff: false,
        })
      : null;
  return {
    orderNumber: order.orderNumber,
    customerName: shipping?.fullName ?? order.user?.name ?? "there",
    email: order.email,
    items: order.items.map((i) => ({
      name: i.name,
      size: i.size,
      color: i.color,
      qty: i.qty,
      net: i.lineTotal - i.discount,
    })),
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    grandTotal: order.grandTotal,
    paymentMethod: order.paymentMethod === "COD" ? "COD" : "RAZORPAY",
    couponCode: order.couponCode,
    shippingAddress: shipping ?? {
      fullName: "",
      line1: "",
      city: "",
      state: "",
      pincode: "",
      phone: order.phone,
    },
    deliveryWindow: window,
    orderUrl: absoluteUrl(`/checkout/success/${order.id}?t=${signOrderAccess(order.id)}`),
    siteUrl: absoluteUrl("/"),
  };
}

export async function afterOrderConfirmed(orderId: string): Promise<void> {
  try {
    const data = await orderEmailData(orderId);
    if (data) {
      const result = await sendEmail({
        to: data.email,
        subject: orderConfirmationSubject(data),
        react: <OrderConfirmationEmail order={data} />,
        tags: { type: "order_confirmation" },
      });
      await db.orderEvent.create({
        data: {
          orderId,
          type: "EMAIL",
          message: `Confirmation email sent (${result.delivered}).`,
          isCustomerVisible: false,
        },
      });
    }
  } catch (error) {
    console.error("Order confirmation email failed", orderId, error);
  }
  try {
    await ensureInvoice(orderId);
  } catch (error) {
    console.error("Invoice generation failed", orderId, error);
  }
}

export async function notifyOrderNeedsReview(orderId: string): Promise<void> {
  try {
    const [data, order] = await Promise.all([
      orderEmailData(orderId),
      db.order.findUnique({ where: { id: orderId }, select: { reviewReason: true } }),
    ]);
    if (!data) return;
    await sendEmail({
      to: data.email,
      subject: `About order ${data.orderNumber}`,
      react: (
        <OrderNeedsReviewEmail
          order={{ ...data, reason: order?.reviewReason ?? "we could not confirm stock." }}
        />
      ),
      tags: { type: "order_needs_review" },
    });
    await db.orderEvent.create({
      data: {
        orderId,
        type: "EMAIL",
        message: "Needs-review email sent.",
        isCustomerVisible: false,
      },
    });
  } catch (error) {
    console.error("Needs-review email failed", orderId, error);
  }
}
