import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReturnForm } from "@/components/storefront/account/return-form";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { getOrderDetailForUser } from "@/lib/orders/queries";
import { getReturnableOrder } from "@/lib/returns/service";

export const metadata: Metadata = { title: "Return or exchange", robots: { index: false } };

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser("/account/orders")]);
  const returnable = await getReturnableOrder(id, user.id);

  if (!returnable) {
    // The segment layout already proved the order is this user's; it is just not returnable yet.
    const order = await getOrderDetailForUser(id, user.id);
    if (!order) notFound();
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl md:text-3xl">Nothing to return yet.</h1>
        <p className="measure text-muted-foreground">
          {order.status === "CANCELLED"
            ? `Order ${order.orderNumber} was cancelled, so there is nothing to send back.`
            : `Returns open once order ${order.orderNumber} is delivered. We will email you when it arrives.`}
        </p>
        <Button asChild variant="outline">
          <Link href={`/account/orders/${order.id}`}>Back to the order</Link>
        </Button>
      </div>
    );
  }

  const remaining = returnable.items.reduce((s, i) => s + i.remaining, 0);

  return (
    <>
      <header className="flex flex-col gap-2">
        <Link
          href={`/account/orders/${returnable.orderId}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Order {returnable.orderNumber}
        </Link>
        <h1 className="text-2xl md:text-3xl">Return or exchange</h1>
        <p className="text-muted-foreground">
          {returnable.window.open
            ? `Delivered ${DATE.format(new Date(returnable.deliveredAt))}. Returns close ${DATE.format(returnable.window.closesAt)}, ${returnable.window.daysLeft} ${returnable.window.daysLeft === 1 ? "day" : "days"} from now. Unworn, tags on, original packaging.`
            : `The return window for this order closed on ${DATE.format(returnable.window.closesAt)}.`}
        </p>
      </header>

      {!returnable.window.open ? (
        <p className="measure text-sm text-muted-foreground">
          If something arrived damaged or wrong, write to support and quote the order number; we
          look at those outside the window.
        </p>
      ) : remaining === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="measure text-muted-foreground">
            Every item on this order is already in a return. Track it from your returns page.
          </p>
          <Button asChild variant="outline">
            <Link href="/account/returns">Your returns</Link>
          </Button>
        </div>
      ) : (
        <ReturnForm order={returnable} />
      )}
    </>
  );
}
