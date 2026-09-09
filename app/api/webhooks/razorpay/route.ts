import { NextResponse } from "next/server";

import { handleRazorpayWebhook } from "@/lib/payments/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Razorpay posts here. The raw body is read before anything else so the HMAC matches byte for byte. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const outcome = await handleRazorpayWebhook({
    rawBody,
    signature: request.headers.get("x-razorpay-signature"),
    eventId: request.headers.get("x-razorpay-event-id"),
  });
  return NextResponse.json(outcome.body, { status: outcome.status });
}
