import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { capturePayment, failPayment, processRefund } from "@/lib/orders/capture";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";

/**
 * Razorpay webhook processing, separated from the route so it can be tested
 * with a locally signed body. Unsigned or badly signed deliveries are
 * rejected before the body is parsed. Each delivery is recorded under its
 * event id first; a replay hits the unique constraint and returns 200 with
 * "duplicate" without touching the order.
 */

export type WebhookOutcome = { status: number; body: { ok: boolean; result: string } };

type RazorpayPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id: string;
        order_id: string | null;
        amount: number;
        method?: string;
        error_description?: string | null;
        error_reason?: string | null;
      };
    };
    refund?: { entity?: { id: string; payment_id: string; amount: number } };
  };
};

async function dispatch(event: string, payload: RazorpayPayload): Promise<string> {
  switch (event) {
    case "payment.captured": {
      const p = payload.payload?.payment?.entity;
      if (!p?.id || !p.order_id) return "ignored: no payment entity";
      const result = await capturePayment({
        providerOrderId: p.order_id,
        providerPaymentId: p.id,
        amount: Number(p.amount),
        method: p.method ?? null,
        raw: p,
        source: "webhook",
      });
      return `payment.captured: ${result.status}`;
    }
    case "payment.failed": {
      const p = payload.payload?.payment?.entity;
      if (!p?.id || !p.order_id) return "ignored: no payment entity";
      const result = await failPayment({
        providerOrderId: p.order_id,
        providerPaymentId: p.id,
        reason: p.error_description ?? p.error_reason ?? null,
        method: p.method ?? null,
        raw: p,
      });
      return `payment.failed: ${result.status}`;
    }
    case "refund.processed": {
      const r = payload.payload?.refund?.entity;
      if (!r?.id || !r.payment_id) return "ignored: no refund entity";
      const result = await processRefund({
        providerRefundId: r.id,
        providerPaymentId: r.payment_id,
        amount: Number(r.amount),
        raw: r,
      });
      return `refund.processed: ${result.status}`;
    }
    default:
      return `ignored: ${event}`;
  }
}

export async function handleRazorpayWebhook(input: {
  rawBody: string;
  signature: string | null;
  eventId: string | null;
}): Promise<WebhookOutcome> {
  if (!verifyWebhookSignature(input.rawBody, input.signature)) {
    return { status: 400, body: { ok: false, result: "invalid signature" } };
  }

  let payload: RazorpayPayload;
  try {
    payload = JSON.parse(input.rawBody) as RazorpayPayload;
  } catch {
    return { status: 400, body: { ok: false, result: "invalid json" } };
  }
  const event = typeof payload.event === "string" ? payload.event : "unknown";
  const eventId = input.eventId ?? createHash("sha256").update(input.rawBody).digest("hex");

  // The unique (provider, eventId) index is the dedupe; skipDuplicates makes
  // a replay a quiet count of 0 instead of a logged constraint error.
  const inserted = await db.webhookEvent.createMany({
    data: [{ provider: "razorpay", eventId, event, payload: payload as Prisma.InputJsonValue }],
    skipDuplicates: true,
  });
  if (inserted.count === 0) {
    return { status: 200, body: { ok: true, result: "duplicate" } };
  }

  try {
    const result = await dispatch(event, payload);
    await db.webhookEvent.update({
      where: { provider_eventId: { provider: "razorpay", eventId } },
      data: { processedAt: new Date() },
    });
    return { status: 200, body: { ok: true, result } };
  } catch (error) {
    // Drop the record so the provider's retry can be processed again.
    await db.webhookEvent.deleteMany({ where: { provider: "razorpay", eventId } });
    console.error("Razorpay webhook failed", error);
    return { status: 500, body: { ok: false, result: "processing failed" } };
  }
}
