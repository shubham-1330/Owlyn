"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { trackOrder } from "@/lib/orders/track";
import { createRateLimiter, retryAfterSeconds } from "@/lib/rate-limit";
import { trackSchema } from "@/lib/validations/account";

import type { TrackState } from "./state";

const limiter = createRateLimiter({ name: "track", limit: 10, windowSeconds: 600 });

/** One message for every miss: a wrong number and a wrong contact read the same. */
const MISS =
  "We could not match that order number with that email or mobile number. Check both against your confirmation email and try again.";

export async function trackOrderAction(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const values = {
    orderNumber: String(formData.get("orderNumber") ?? ""),
    contact: String(formData.get("contact") ?? ""),
  };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const limited = await limiter.limit(ip);
  if (!limited.success) {
    return {
      status: "error",
      message: `Too many lookups. Try again in ${retryAfterSeconds(limited)} seconds.`,
      values,
    };
  }
  const parsed = trackSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
      values,
    };
  }
  const view = await trackOrder(parsed.data);
  if (!view) return { status: "error", message: MISS, values };
  return { status: "found", view };
}
