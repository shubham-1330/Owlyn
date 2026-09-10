import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { formatDeliveryWindow } from "@/lib/delivery";
import { verifyOrderAccess } from "@/lib/orders/access";
import { buildTimeline, canCancel, type Timeline } from "@/lib/orders/status";
import { isAddressSnapshot, type AddressSnapshot } from "@/lib/orders/types";
import { getStoreConfig } from "@/lib/queries/settings";
import { returnableQuantities, returnWindow, type ReturnWindow } from "@/lib/returns/window";
import type { OrdersQuery } from "@/lib/validations/account";

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

const viewInclude = {
  items: { orderBy: { createdAt: "asc" as const } },
  events: { where: { isCustomerVisible: true }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof viewInclude }>;

function windowFor(order: {
  estimatedDeliveryFrom: Date | null;
  estimatedDeliveryTo: Date | null;
}) {
  return order.estimatedDeliveryFrom && order.estimatedDeliveryTo
    ? formatDeliveryWindow({
        dispatch: order.estimatedDeliveryFrom,
        earliest: order.estimatedDeliveryFrom,
        latest: order.estimatedDeliveryTo,
        afterCutoff: false,
      })
    : null;
}

function toView(order: OrderRow): OrderView {
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
    deliveryWindow: windowFor(order),
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

export async function getOrderForCustomer(
  orderId: string,
  access: OrderAccess,
): Promise<OrderView | null> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: viewInclude });
  if (!order) return null;
  const owns = access.userId !== null && order.userId === access.userId;
  if (!owns && !verifyOrderAccess(access.token, orderId)) return null;
  return toView(order);
}

/** Existence + ownership check, cheap. */
export async function canAccessOrder(orderId: string, access: OrderAccess): Promise<boolean> {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  if (!order) return false;
  return (
    (access.userId !== null && order.userId === access.userId) ||
    verifyOrderAccess(access.token, orderId)
  );
}

/** For the account segment layout: does this order exist and belong to the user? */
export async function orderExistsForUser(orderId: string, userId: string): Promise<boolean> {
  const count = await db.order.count({ where: { id: orderId, userId } });
  return count > 0;
}

export type OrderDetail = OrderView & {
  billingAddress: AddressSnapshot | null;
  customerNote: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  timeline: Timeline;
  shipments: Array<{
    id: string;
    courier: string;
    awb: string;
    trackingUrl: string | null;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    method: string | null;
    status: string;
    amount: number;
    capturedAt: string | null;
    reference: string | null;
  }>;
  refunds: Array<{ id: string; amount: number; status: string; reason: string; createdAt: string }>;
  returns: Array<{ id: string; type: string; status: string; createdAt: string; units: number }>;
  canCancel: boolean;
  returnWindow: ReturnWindow | null;
  returnableUnits: number;
};

/** Full detail for the account order page. Null unless the order is the user's. */
export async function getOrderDetailForUser(
  orderId: string,
  userId: string,
  now = new Date(),
): Promise<OrderDetail | null> {
  const [order, config] = await Promise.all([
    db.order.findFirst({
      where: { id: orderId, userId },
      include: {
        ...viewInclude,
        shipments: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { createdAt: "asc" } },
        refunds: { orderBy: { createdAt: "asc" } },
        returnRequests: { orderBy: { createdAt: "asc" }, include: { items: true } },
      },
    }),
    getStoreConfig(),
  ]);
  if (!order) return null;

  const window = order.deliveredAt
    ? returnWindow({ deliveredAt: order.deliveredAt, windowDays: config.returnsWindowDays, now })
    : null;
  const quantities = returnableQuantities(
    order.items.map((i) => ({ orderItemId: i.id, qty: i.qty })),
    order.returnRequests.flatMap((r) =>
      r.items.map((ri) => ({ orderItemId: ri.orderItemId, qty: ri.qty, requestStatus: r.status })),
    ),
  );
  const returnableUnits = Array.from(quantities.values()).reduce((s, q) => s + q.remaining, 0);

  return {
    ...toView(order),
    billingAddress: isAddressSnapshot(order.billingAddress) ? order.billingAddress : null,
    customerNote: order.customerNote,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelReason: order.cancelReason,
    timeline: buildTimeline({
      status: order.status,
      events: order.events,
      placedAt: order.placedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
    }),
    shipments: order.shipments.map((s) => ({
      id: s.id,
      courier: s.courier,
      awb: s.awb,
      trackingUrl: s.trackingUrl,
      status: s.status,
      shippedAt: s.shippedAt?.toISOString() ?? null,
      deliveredAt: s.deliveredAt?.toISOString() ?? null,
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      method: p.method,
      status: p.status,
      amount: p.amount,
      capturedAt: p.capturedAt?.toISOString() ?? null,
      reference: p.providerPaymentId,
    })),
    refunds: order.refunds.map((r) => ({
      id: r.id,
      amount: r.amount,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    })),
    returns: order.returnRequests.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      units: r.items.reduce((s, i) => s + i.qty, 0),
    })),
    canCancel: canCancel(order.status),
    returnWindow: window,
    returnableUnits:
      window?.open &&
      (order.status === "DELIVERED" ||
        order.status === "RETURN_REQUESTED" ||
        order.status === "RETURNED")
        ? returnableUnits
        : 0,
  };
}

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  placedAt: string | null;
  deliveryWindow: string | null;
  itemCount: number;
  preview: Array<{ name: string; image: string | null }>;
};

export type OrderListPage = {
  orders: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

export const ORDERS_PAGE_SIZE = 10;

export async function listOrdersForUser(
  userId: string,
  query: OrdersQuery,
): Promise<OrderListPage> {
  const where: Prisma.OrderWhereInput = {
    userId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { orderNumber: { contains: query.q.toUpperCase() } } : {}),
  };
  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        grandTotal: true,
        placedAt: true,
        estimatedDeliveryFrom: true,
        estimatedDeliveryTo: true,
        items: { orderBy: { createdAt: "asc" }, select: { name: true, image: true, qty: true } },
      },
    }),
  ]);
  return {
    orders: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      grandTotal: o.grandTotal,
      placedAt: o.placedAt?.toISOString() ?? null,
      deliveryWindow: windowFor(o),
      itemCount: o.items.reduce((s, i) => s + i.qty, 0),
      preview: o.items.slice(0, 3).map((i) => ({ name: i.name, image: i.image })),
    })),
    total,
    page: query.page,
    pageSize: ORDERS_PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
  };
}

export type AccountSummary = {
  name: string | null;
  email: string;
  phone: string | null;
  memberSince: string;
  recentOrders: OrderListItem[];
  orderCount: number;
  defaultAddress: AddressSnapshot | null;
  wishlistCount: number;
  openReturns: Array<{
    id: string;
    orderNumber: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
};

const OPEN_RETURN_STATUSES = ["REQUESTED", "APPROVED", "PICKUP_SCHEDULED", "RECEIVED"] as const;

export async function getAccountSummary(userId: string): Promise<AccountSummary | null> {
  const [user, recent, address, openReturns] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true, wishlistItems: true } },
      },
    }),
    listOrdersForUser(userId, { page: 1, status: undefined, q: undefined }),
    db.address.findFirst({ where: { userId, isDefault: true } }),
    db.returnRequest.findMany({
      where: { order: { userId }, status: { in: [...OPEN_RETURN_STATUSES] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        order: { select: { orderNumber: true } },
      },
    }),
  ]);
  if (!user) return null;
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    memberSince: user.createdAt.toISOString(),
    recentOrders: recent.orders.slice(0, 3),
    orderCount: user._count.orders,
    defaultAddress: address
      ? {
          fullName: address.fullName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2 ?? undefined,
          landmark: address.landmark ?? undefined,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: address.country,
        }
      : null,
    wishlistCount: user._count.wishlistItems,
    openReturns: openReturns.map((r) => ({
      id: r.id,
      orderNumber: r.order.orderNumber,
      type: r.type,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
