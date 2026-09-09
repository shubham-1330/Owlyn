"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { estimateDeliveryWindow, formatDeliveryWindow } from "@/lib/delivery";
import { activeProductWhere } from "@/lib/queries/products";
import { getStoreConfig } from "@/lib/queries/settings";
import { getShippingZones, lookupPincode } from "@/lib/queries/shipping";
import { createRateLimiter, retryAfterSeconds } from "@/lib/rate-limit";
import { findZoneForPincode, shippingCharge } from "@/lib/shipping";
import { backInStockSchema, deliveryEstimateSchema } from "@/lib/validations/catalog";

export type NotifyState = { status: "idle" | "success" | "error"; message?: string };

const notifyByEmail = createRateLimiter({ name: "notify-email", limit: 3, windowSeconds: 3600 });
const notifyByIp = createRateLimiter({ name: "notify-ip", limit: 20, windowSeconds: 3600 });

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** "Notify me" for an out-of-stock size. Rate limited per email and per IP. */
export async function requestBackInStock(
  _prev: NotifyState,
  formData: FormData,
): Promise<NotifyState> {
  const parsed = backInStockSchema.safeParse({
    variantId: formData.get("variantId"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: z.flattenError(parsed.error).fieldErrors.email?.[0] ?? "Check the email address.",
    };
  }
  const { variantId, email } = parsed.data;

  const [byIp, byEmail] = await Promise.all([
    notifyByIp.limit(await clientIp()),
    notifyByEmail.limit(email),
  ]);
  const blocked = [byIp, byEmail].find((r) => !r.success);
  if (blocked) {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds(blocked) / 60));
    return {
      status: "error",
      message: `Too many requests. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
    };
  }

  const variant = await db.productVariant.findFirst({
    where: { id: variantId, isActive: true, product: activeProductWhere },
    select: {
      id: true,
      stock: true,
      size: true,
      colorName: true,
      product: { select: { name: true } },
    },
  });
  if (!variant) return { status: "error", message: "That size is no longer available." };
  if (variant.stock > 0)
    return {
      status: "success",
      message: "Good news, this size is back in stock. Refresh the page to add it.",
    };

  const user = await getSessionUser();
  await db.backInStockRequest.upsert({
    where: { email_variantId: { email, variantId } },
    update: { status: "PENDING", notifiedAt: null, userId: user?.id ?? null },
    create: { email, variantId, userId: user?.id ?? null },
  });

  return {
    status: "success",
    message: `We will email ${email} when ${variant.product.name} in ${variant.colorName}, ${variant.size} is back.`,
  };
}

export type DeliveryOption = {
  name: string;
  window: string;
  charge: number;
  freeAbove: number | null;
};

export type DeliveryEstimate =
  | {
      status: "ok";
      pincode: string;
      place: string;
      cod: boolean;
      afterCutoff: boolean;
      options: DeliveryOption[];
    }
  | { status: "unserviceable"; message: string }
  | { status: "error"; message: string };

const ESTIMATE_PARCEL_GRAMS = 500;

export async function getDeliveryEstimate(input: {
  pincode: string;
  unitPrice: number;
}): Promise<DeliveryEstimate> {
  const parsed = deliveryEstimateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: z.flattenError(parsed.error).fieldErrors.pincode?.[0] ?? "Enter a 6-digit pincode.",
    };
  }
  const { pincode, unitPrice } = parsed.data;

  const [row, zones, config] = await Promise.all([
    lookupPincode(pincode),
    getShippingZones(),
    getStoreConfig(),
  ]);
  if (row && !row.isServiceable) {
    return { status: "unserviceable", message: `We do not deliver to ${row.city} ${pincode} yet.` };
  }
  const zone =
    (row?.zoneId ? zones.find((z) => z.id === row.zoneId) : undefined) ??
    findZoneForPincode(pincode, zones);
  if (!zone || zone.rates.length === 0) {
    return { status: "unserviceable", message: "We do not deliver to this pincode yet." };
  }

  const now = new Date();
  let afterCutoff = false;
  const options = zone.rates.map((rate) => {
    const window = estimateDeliveryWindow({
      now,
      cutoffHour: config.dispatchCutoffHour,
      minDays: rate.minDays,
      maxDays: rate.maxDays,
    });
    afterCutoff = window.afterCutoff;
    return {
      name: rate.name,
      window: formatDeliveryWindow(window),
      charge: shippingCharge(rate, unitPrice, ESTIMATE_PARCEL_GRAMS),
      freeAbove: rate.freeAbove,
    };
  });

  return {
    status: "ok",
    pincode,
    place: row ? `${row.city}, ${row.state}` : zone.name,
    cod: row ? row.codAvailable : zone.codAvailable,
    afterCutoff,
    options,
  };
}
