import { db } from "@/lib/db";
import { formatDeliveryWindow } from "@/lib/delivery";
import { verifyOrderAccess } from "@/lib/orders/access";
import { isAddressSnapshot, type AddressSnapshot } from "@/lib/orders/types";

/**
 * Customer-facing order reads. Ownership is decided here, in the data layer:
 * the session must own the order, or the caller must hold a valid signed
 * guest token for that order id. Anything else is null, which pages turn
 * into a 404 so existence never leaks.
 */

export type OrderView = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: "RAZORPAY" | "COD" | null;
  needsReview: boolean;
  email: string;
  phone: string;
  placedAt: string | null;
  expiresAt: string | null;
  deliveryWindow: string | null;
  shippingMethod: string | null;
  shippingAddress: AddressSnapshot | null;
  items: Array<{
    id: string;
    name: string;
    slug: string | null;
    size: string;
    color: string;
    image: string | null;
    qty: number;
    unitPrice: number;
    discount: number;
    net: number;
  }>;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  isInterState: boolean;
  grandTotal: number;
  couponCode: string | null;
  invoiceAvailable: boolean;
  events: Array<{
    id: string;
    type: string;
    status: string | null;
    message: string;
    createdAt: string;
  }>;
};

export type OrderAccess = { userId: string | null; token: string | null };

export async function getOrderForCustomer(
  orderId: string,
  access: OrderAccess,
): Promise<OrderView | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      events: { where: { isCustomerVisible: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return null;

  const owns = access.userId !== null && order.userId === access.userId;
  const tokenOk = verifyOrderAccess(access.token, orderId);
  if (!owns && !tokenOk) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod:
      order.paymentMethod === "COD"
        ? "COD"
        : order.paymentMethod === "RAZORPAY"
          ? "RAZORPAY"
          : null,
    needsReview: order.needsReview,
    email: order.email,
    phone: order.phone,
    placedAt: order.placedAt?.toISOString() ?? null,
    expiresAt: order.expiresAt?.toISOString() ?? null,
    deliveryWindow:
      order.estimatedDeliveryFrom && order.estimatedDeliveryTo
        ? formatDeliveryWindow({
            dispatch: order.estimatedDeliveryFrom,
            earliest: order.estimatedDeliveryFrom,
            latest: order.estimatedDeliveryTo,
            afterCutoff: false,
          })
        : null,
    shippingMethod: order.shippingMethod,
    shippingAddress: isAddressSnapshot(order.shippingAddress) ? order.shippingAddress : null,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.name,
      slug: i.slug,
      size: i.size,
      color: i.color,
      image: i.image,
      qty: i.qty,
      unitPrice: i.unitPrice,
      discount: i.discount,
      net: i.lineTotal - i.discount,
    })),
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    cgstTotal: order.cgstTotal,
    sgstTotal: order.sgstTotal,
    igstTotal: order.igstTotal,
    isInterState: order.isInterState,
    grandTotal: order.grandTotal,
    couponCode: order.couponCode,
    invoiceAvailable: order.status !== "PENDING" && order.status !== "CANCELLED",
    events: order.events.map((e) => ({
      id: e.id,
      type: e.type,
      status: e.status,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

/** Existence + ownership check for layouts, cheap. */
export async function canAccessOrder(orderId: string, access: OrderAccess): Promise<boolean> {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  if (!order) return false;
  return (
    (access.userId !== null && order.userId === access.userId) ||
    verifyOrderAccess(access.token, orderId)
  );
}
