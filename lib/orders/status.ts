import type { OrderStatus, PaymentStatus, ShipmentStatus } from "@prisma/client";

/**
 * Order status vocabulary shared by the storefront and the admin. Pure:
 * labels, tones and the fulfilment timeline are derived from data passed in.
 */

export type StatusTone = "default" | "brass" | "dusk" | "outline" | "muted" | "alert" | "success";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  PENDING: "muted",
  CONFIRMED: "brass",
  PACKED: "brass",
  SHIPPED: "dusk",
  OUT_FOR_DELIVERY: "dusk",
  DELIVERED: "success",
  CANCELLED: "alert",
  RETURN_REQUESTED: "outline",
  RETURNED: "outline",
  REFUNDED: "muted",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Payment pending",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  PENDING: "muted",
  PAID: "success",
  FAILED: "alert",
  REFUNDED: "outline",
  PARTIALLY_REFUNDED: "outline",
};

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  CREATED: "Label created",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  RETURNED_TO_ORIGIN: "Returned to sender",
};

export const FULFILMENT_STEPS = [
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export type FulfilmentStep = (typeof FULFILMENT_STEPS)[number];

/** A customer may cancel until the parcel leaves. */
export function canCancel(status: OrderStatus): boolean {
  return status === "CONFIRMED" || status === "PACKED";
}

/** Statuses that come after delivery and therefore keep every fulfilment step complete. */
export function isPostDelivery(status: OrderStatus): boolean {
  return (
    status === "DELIVERED" ||
    status === "RETURN_REQUESTED" ||
    status === "RETURNED" ||
    status === "REFUNDED"
  );
}

export type TimelineEvent = {
  type: string;
  status: OrderStatus | null;
  createdAt: Date | string;
};

export type TimelineStep = {
  key: FulfilmentStep;
  label: string;
  state: "done" | "current" | "upcoming";
  /** ISO timestamp of the event that reached this step, when one exists. */
  at: string | null;
};

export type Timeline = {
  steps: TimelineStep[];
  /** A status outside the happy path (cancelled, returned, refunded), shown after the steps. */
  terminal: { status: OrderStatus; label: string; at: string | null } | null;
};

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

/**
 * Derives the Confirmed → Packed → Shipped → Out for delivery → Delivered
 * timeline from the order status and its status events. A cancelled order
 * keeps the steps it reached and gets a terminal marker; post-delivery
 * statuses show every step done plus the terminal status.
 */
export function buildTimeline(input: {
  status: OrderStatus;
  events: TimelineEvent[];
  placedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  cancelledAt?: Date | string | null;
}): Timeline {
  const reachedAt = new Map<OrderStatus, string>();
  for (const event of input.events) {
    if (event.type !== "STATUS" || !event.status) continue;
    // Latest event wins so a re-fired status shows its most recent time.
    reachedAt.set(event.status, iso(event.createdAt)!);
  }
  if (input.deliveredAt && !reachedAt.has("DELIVERED")) {
    reachedAt.set("DELIVERED", iso(input.deliveredAt)!);
  }
  if (input.placedAt && !reachedAt.has("CONFIRMED") && input.status !== "PENDING") {
    reachedAt.set("CONFIRMED", iso(input.placedAt)!);
  }

  const post = isPostDelivery(input.status);
  const currentIndex = post
    ? FULFILMENT_STEPS.length
    : FULFILMENT_STEPS.indexOf(input.status as FulfilmentStep);

  // For a cancelled order, the furthest step with a recorded event counts as reached.
  const reachedIndex =
    input.status === "CANCELLED"
      ? FULFILMENT_STEPS.reduce((max, step, i) => (reachedAt.has(step) ? i : max), -1)
      : currentIndex;

  const steps: TimelineStep[] = FULFILMENT_STEPS.map((key, i) => {
    let state: TimelineStep["state"];
    if (input.status === "CANCELLED") state = i <= reachedIndex ? "done" : "upcoming";
    else if (post) state = "done";
    else if (i < currentIndex) state = "done";
    else if (i === currentIndex) state = "current";
    else state = "upcoming";
    return {
      key,
      label: ORDER_STATUS_LABEL[key],
      state,
      at: state === "upcoming" ? null : (reachedAt.get(key) ?? null),
    };
  });

  let terminal: Timeline["terminal"] = null;
  if (input.status === "CANCELLED") {
    terminal = {
      status: "CANCELLED",
      label: ORDER_STATUS_LABEL.CANCELLED,
      at: reachedAt.get("CANCELLED") ?? iso(input.cancelledAt),
    };
  } else if (post && input.status !== "DELIVERED") {
    terminal = {
      status: input.status,
      label: ORDER_STATUS_LABEL[input.status],
      at: reachedAt.get(input.status) ?? null,
    };
  }

  return { steps, terminal };
}
