import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { runOrderCleanup } from "@/lib/orders/cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Releases expired reservations and cancels stale unpaid orders. Vercel cron calls GET; anything else may POST. */
async function run(request: Request) {
  if (!authorised(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await runOrderCleanup();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = run;
export const POST = run;
