import { db } from "@/lib/db";
import { formatDeliveryWindow } from "@/lib/delivery";
import { buildTimeline, type Timeline } from "@/lib/orders/status";
import { isAddressSnapshot } from "@/lib/orders/types";

/**
 * Guest tracking: order number plus the email or the mobile number on the
 * order. A wrong pair is null, and the caller shows one generic message, so
 * the response never says whether the order number exists.
 */

export type TrackView = {
  orderNumber: string;
  status: string;
  placedAt: string | null;
  deliveryWindow: string | null;
  city: string | null;
  itemCount: number;
  items: Array<{ name: string; size: string; color: string; qty: number }>;
  timeline: Timeline;
  shipment: { courier: string; awb: string; trackingUrl: string | null; status: string } | null;
};

function normalisePhone(value: string): string {
  return value.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=[6-9]\d{9}$)/, "");
}

export async function trackOrder(input: {
  orderNumber: string;
  contact: string;
}): Promise<TrackView | null> {
  const order = await db.order.findUnique({
    where: { orderNumber: input.orderNumber },
    include: {
      items: { select: { name: true, size: true, color: true, qty: true } },
      events: { where: { type: "STATUS" }, orderBy: { createdAt: "asc" } },
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) return null;

  const contact = input.contact.trim().toLowerCase();
  const emailMatch = contact === order.email.toLowerCase();
  const phoneMatch = normalisePhone(contact) === normalisePhone(order.phone);
  if (!emailMatch && !phoneMatch) return null;

  const shipment = order.shipments[0] ?? null;
  const shipping = isAddressSnapshot(order.shippingAddress) ? order.shippingAddress : null;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.placedAt?.toISOString() ?? null,
    deliveryWindow:
      order.estimatedDeliveryFrom && order.estimatedDeliveryTo
        ? formatDeliveryWindow({
            dispatch: order.estimatedDeliveryFrom,
            earliest: order.estimatedDeliveryFrom,
            latest: order.estimatedDeliveryTo,
            afterCutoff: false,
          })
        : null,
    city: shipping?.city ?? null,
    itemCount: order.items.reduce((s, i) => s + i.qty, 0),
    items: order.items,
    timeline: buildTimeline({
      status: order.status,
      events: order.events,
      placedAt: order.placedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
    }),
    shipment: shipment
      ? {
          courier: shipment.courier,
          awb: shipment.awb,
          trackingUrl: shipment.trackingUrl,
          status: shipment.status,
        }
      : null,
  };
}
