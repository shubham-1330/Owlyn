import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { FormMessage } from "@/components/forms/field";
import { EmptyState } from "@/components/storefront/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { formatINR } from "@/lib/money";
import { listReturnsForUser } from "@/lib/returns/service";
import { RETURN_STATUS_LABEL, returnReasonLabel } from "@/lib/returns/window";

export const metadata: Metadata = { title: "Returns", robots: { index: false } };

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const NEXT_STEP: Record<string, string> = {
  REQUESTED: "We look at every request within 2 working days.",
  APPROVED: "Approved. We are booking the pickup.",
  PICKUP_SCHEDULED: "Pickup booked. Keep the items packed and the tags on.",
  RECEIVED: "Back with us. The refund or exchange is being processed.",
  COMPLETED: "Done.",
  REJECTED: "We could not accept this one. Check your email for why.",
  CANCELLED: "Cancelled.",
};

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ raised?: string }>;
}) {
  const [{ raised }, user] = await Promise.all([searchParams, requireUser("/account/returns")]);
  const returns = await listReturnsForUser(user.id);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl">Returns and exchanges</h1>
        <p className="text-muted-foreground">
          {returns.length === 0
            ? "Nothing sent back so far."
            : `${returns.length} ${returns.length === 1 ? "request" : "requests"}.`}
        </p>
        {raised ? (
          <FormMessage tone="success">
            Request received for order {raised}. We will email you within 2 working days.
          </FormMessage>
        ) : null}
      </header>

      {returns.length === 0 ? (
        <EmptyState
          title="No returns raised."
          description="If something does not fit, start from the order page within 7 days of delivery. Unworn, tags on, and the exchange is free."
          action={
            <Button asChild variant="outline">
              <Link href="/account/orders">Your orders</Link>
            </Button>
          }
          className="py-8"
        />
      ) : (
        <ul className="flex flex-col gap-6">
          {returns.map((r) => (
            <li key={r.id} className="flex flex-col gap-4 border border-border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {r.type === "EXCHANGE" ? "Exchange" : "Return"} on{" "}
                    <Link
                      href={`/account/orders/${r.orderId}`}
                      className="num underline-offset-4 hover:underline"
                    >
                      {r.orderNumber}
                    </Link>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Raised {DATE.format(new Date(r.createdAt))} · {returnReasonLabel(r.reason)}
                    {r.photoCount > 0
                      ? ` · ${r.photoCount} ${r.photoCount === 1 ? "photo" : "photos"}`
                      : ""}
                  </span>
                </div>
                <Badge
                  variant={
                    r.status === "COMPLETED"
                      ? "success"
                      : r.status === "REJECTED"
                        ? "alert"
                        : "outline"
                  }
                >
                  {RETURN_STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              </div>
              <ul className="flex flex-col gap-2">
                {r.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <div
                      className="relative w-10 shrink-0 overflow-hidden bg-slate"
                      style={{ aspectRatio: "3 / 4" }}
                    >
                      {item.image ? (
                        <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />
                      ) : null}
                    </div>
                    <span className="flex-1">
                      {item.name} · {item.color} · {item.size} · Qty {item.qty}
                    </span>
                    <span className="text-muted-foreground">{returnReasonLabel(item.reason)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                {NEXT_STEP[r.status] ?? ""}
                {r.refund
                  ? ` Refund of ${formatINR(r.refund.amount)} ${r.refund.status === "COMPLETED" ? "processed" : "queued"}.`
                  : ""}
              </p>
              {r.comment ? <p className="text-sm">Your note: {r.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
