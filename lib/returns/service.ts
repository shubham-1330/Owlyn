import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { sendReturnRequestedEmail } from "@/lib/orders/after";
import { isAddressSnapshot, OrderError, type AddressSnapshot } from "@/lib/orders/types";
import { getStoreConfig } from "@/lib/queries/settings";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  returnableQuantities,
  returnReasonLabel,
  returnWindow,
  type ReturnWindow,
} from "@/lib/returns/window";
import { storage } from "@/lib/storage";
import type { ReturnRequestInput } from "@/lib/validations/account";

/**
 * Returns and exchanges. Every read and write is scoped by userId in the
 * query itself; a miss is null, which pages turn into a 404. Returns never
 * restock: that happens when staff mark the parcel received (Phase 7).
 */

const RETURNABLE_STATUSES = new Set(["DELIVERED", "RETURN_REQUESTED", "RETURNED"]);

export type ReturnableItem = {
  orderItemId: string;
  name: string;
  size: string;
  color: string;
  image: string | null;
  unitNet: number;
  ordered: number;
  returned: number;
  remaining: number;
};

export type ReturnableOrder = {
  orderId: string;
  orderNumber: string;
  status: string;
  deliveredAt: string;
  window: ReturnWindow;
  items: ReturnableItem[];
  pickupDefault: AddressSnapshot | null;
  priorRequests: number;
};

async function loadReturnable(orderId: string, userId: string, now: Date) {
  const [order, config] = await Promise.all([
    db.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        returnRequests: { include: { items: true } },
      },
    }),
    getStoreConfig(),
  ]);
  if (!order || !order.deliveredAt || !RETURNABLE_STATUSES.has(order.status)) return null;
  const window = returnWindow({
    deliveredAt: order.deliveredAt,
    windowDays: config.returnsWindowDays,
    now,
  });
  const quantities = returnableQuantities(
    order.items.map((i) => ({ orderItemId: i.id, qty: i.qty })),
    order.returnRequests.flatMap((r) =>
      r.items.map((ri) => ({ orderItemId: ri.orderItemId, qty: ri.qty, requestStatus: r.status })),
    ),
  );
  return { order, window, quantities };
}

export async function getReturnableOrder(
  orderId: string,
  userId: string,
  now = new Date(),
): Promise<ReturnableOrder | null> {
  const loaded = await loadReturnable(orderId, userId, now);
  if (!loaded) return null;
  const { order, window, quantities } = loaded;
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    deliveredAt: order.deliveredAt!.toISOString(),
    window,
    items: order.items.map((i) => {
      const q = quantities.get(i.id)!;
      return {
        orderItemId: i.id,
        name: i.name,
        size: i.size,
        color: i.color,
        image: i.image,
        unitNet: Math.round((i.lineTotal - i.discount) / i.qty),
        ordered: q.ordered,
        returned: q.returned,
        remaining: q.remaining,
      };
    }),
    pickupDefault: isAddressSnapshot(order.shippingAddress) ? order.shippingAddress : null,
    priorRequests: order.returnRequests.length,
  };
}

export type ReturnPhoto = { buffer: Buffer; contentType: string };

const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function createReturnRequest(
  input: ReturnRequestInput & { userId: string; photos: ReturnPhoto[] },
  now = new Date(),
): Promise<{ id: string; orderNumber: string }> {
  if (input.photos.length > MAX_PHOTOS) {
    throw new OrderError(`Attach up to ${MAX_PHOTOS} photos.`, "STATE");
  }
  for (const photo of input.photos) {
    if (!PHOTO_TYPES[photo.contentType]) {
      throw new OrderError("Photos must be JPEG, PNG or WebP.", "STATE");
    }
    if (photo.buffer.byteLength > MAX_PHOTO_BYTES) {
      throw new OrderError("Each photo must be under 5 MB.", "STATE");
    }
  }

  // Stored before the transaction; a failed request leaves orphan files, which is cheaper than a partial request.
  const photoKeys: string[] = [];
  for (const photo of input.photos) {
    const key = `returns/${input.orderId}/${randomUUID()}.${PHOTO_TYPES[photo.contentType]}`;
    await storage().put(key, photo.buffer, photo.contentType);
    photoKeys.push(key);
  }

  const created = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: input.orderId, userId: input.userId },
        include: { items: true, returnRequests: { include: { items: true } } },
      });
      if (!order) throw new OrderError("Order not found.", "NOT_FOUND");
      if (!order.deliveredAt || !RETURNABLE_STATUSES.has(order.status)) {
        throw new OrderError(
          "This order has not been delivered yet, so there is nothing to return.",
          "STATE",
        );
      }
      const config = await getStoreConfig();
      const window = returnWindow({
        deliveredAt: order.deliveredAt,
        windowDays: config.returnsWindowDays,
        now,
      });
      if (!window.open) {
        throw new OrderError(
          `The ${config.returnsWindowDays}-day return window for ${order.orderNumber} closed on ${window.closesAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`,
          "STATE",
        );
      }
      const quantities = returnableQuantities(
        order.items.map((i) => ({ orderItemId: i.id, qty: i.qty })),
        order.returnRequests.flatMap((r) =>
          r.items.map((ri) => ({
            orderItemId: ri.orderItemId,
            qty: ri.qty,
            requestStatus: r.status,
          })),
        ),
      );
      const seen = new Set<string>();
      for (const item of input.items) {
        if (seen.has(item.orderItemId))
          throw new OrderError("Each item can be listed once.", "STATE");
        seen.add(item.orderItemId);
        const q = quantities.get(item.orderItemId);
        const line = order.items.find((i) => i.id === item.orderItemId);
        if (!q || !line) throw new OrderError("That item is not on this order.", "NOT_FOUND");
        if (item.qty > q.remaining) {
          throw new OrderError(
            q.remaining === 0
              ? `${line.name} (${line.color}, ${line.size}) is already in a return.`
              : `Only ${q.remaining} of ${line.name} (${line.color}, ${line.size}) can still be returned.`,
            "STATE",
          );
        }
      }

      const request = await tx.returnRequest.create({
        data: {
          orderId: order.id,
          type: input.type,
          reason: input.reason,
          comment: input.comment ?? null,
          pickupAddress: input.pickupAddress,
          photoKeys,
          items: {
            create: input.items.map((i) => ({
              orderItemId: i.orderItemId,
              qty: i.qty,
              reason: i.reason,
            })),
          },
        },
        select: { id: true },
      });
      const units = input.items.reduce((s, i) => s + i.qty, 0);
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: order.status === "DELIVERED" ? "RETURN_REQUESTED" : order.status,
          events: {
            create: [
              {
                type: "RETURN",
                status: order.status === "DELIVERED" ? "RETURN_REQUESTED" : null,
                message: `${input.type === "EXCHANGE" ? "Exchange" : "Return"} requested for ${units} ${units === 1 ? "item" : "items"}: ${returnReasonLabel(input.reason).toLowerCase()}.`,
                actorId: input.userId,
              },
            ],
          },
        },
      });
      return { id: request.id, orderNumber: order.orderNumber };
    },
    { timeout: 15_000 },
  );

  void sendReturnRequestedEmail(input.orderId, created.id);
  return created;
}

export type ReturnListItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  type: "RETURN" | "EXCHANGE";
  status: string;
  reason: string;
  comment: string | null;
  createdAt: string;
  resolvedAt: string | null;
  photoCount: number;
  items: Array<{
    name: string;
    size: string;
    color: string;
    image: string | null;
    qty: number;
    reason: string;
  }>;
  refund: { amount: number; status: string } | null;
};

export async function listReturnsForUser(userId: string): Promise<ReturnListItem[]> {
  const rows = await db.returnRequest.findMany({
    where: { order: { userId } },
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { id: true, orderNumber: true } },
      items: {
        include: { orderItem: { select: { name: true, size: true, color: true, image: true } } },
      },
      refund: { select: { amount: true, status: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    orderId: r.order.id,
    orderNumber: r.order.orderNumber,
    type: r.type,
    status: r.status,
    reason: r.reason,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    photoCount: r.photoKeys.length,
    items: r.items.map((i) => ({
      name: i.orderItem.name,
      size: i.orderItem.size,
      color: i.orderItem.color,
      image: i.orderItem.image,
      qty: i.qty,
      reason: i.reason,
    })),
    refund: r.refund,
  }));
}

/** Photo bytes for the request owner or staff; null for anyone else, so the route can 404. */
export async function getReturnPhoto(
  requestId: string,
  index: number,
  access: { userId: string | null; staff: boolean },
): Promise<{ body: Buffer; contentType: string } | null> {
  const request = await db.returnRequest.findFirst({
    where: access.staff
      ? { id: requestId }
      : { id: requestId, order: { userId: access.userId ?? "" } },
    select: { photoKeys: true },
  });
  const key = request?.photoKeys[index];
  if (!key) return null;
  const file = await storage().get(key);
  if (!file) return null;
  const ext = key.split(".").pop();
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { body: file.body, contentType };
}
