import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SuccessLive } from "@/components/storefront/checkout/success-live";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/guards";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { formatINR } from "@/lib/money";
import { getOrderForCustomer, type OrderView } from "@/lib/orders/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orderId: string }>; searchParams: Promise<{ t?: string }> };

/**
 * Post-checkout page. No loading boundary sits above it, so notFound() here
 * is a real 404 for a wrong id, someone else's order, or a bad guest token.
 */
export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const [{ orderId }, { t }, user] = await Promise.all([params, searchParams, getSessionUser()]);
  const order = await getOrderForCustomer(orderId, { userId: user?.id ?? null, token: t ?? null });
  if (!order) notFound();

  const tokenQuery = t ? `?t=${encodeURIComponent(t)}` : "";
  const state = stateOf(order);

  return (
    <div className={cn(CONTAINER, GUTTER, "py-10 md:py-14")}>
      <SuccessLive
        status={order.status}
        paymentStatus={order.paymentStatus}
        paymentMethod={order.paymentMethod}
        expiresAt={order.expiresAt}
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <Badge variant={state.badge}>{state.label}</Badge>
            <h1 className="text-3xl md:text-4xl">{state.heading}</h1>
            <p className="measure text-muted-foreground">{state.body(order)}</p>
            <p className="text-sm">
              Order <span className="font-medium num">{order.orderNumber}</span>. A copy has gone to{" "}
              {order.email}.
            </p>
          </header>

          <section aria-labelledby="items-heading" className="flex flex-col gap-2">
            <h2 id="items-heading" className="text-lg">
              What you ordered
            </h2>
            <ul className="divide-y divide-border border-y border-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-4">
                  <div
                    className="relative w-16 shrink-0 overflow-hidden border border-border bg-slate"
                    style={{ aspectRatio: "3 / 4" }}
                  >
                    {item.image ? (
                      <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    {item.slug ? (
                      <Link
                        href={`/products/${item.slug}`}
                        className="truncate font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="truncate font-medium">{item.name}</span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {item.color} · {item.size} · Qty {item.qty}
                    </span>
                  </div>
                  <span className="text-sm num">{formatINR(item.net)}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-8 sm:grid-cols-2">
            <section aria-labelledby="ship-heading" className="flex flex-col gap-2 text-sm">
              <h2 id="ship-heading" className="text-lg">
                Delivering to
              </h2>
              {order.shippingAddress ? (
                <address className="leading-relaxed text-muted-foreground not-italic">
                  <span className="text-foreground">{order.shippingAddress.fullName}</span>
                  <br />
                  {order.shippingAddress.line1}
                  {order.shippingAddress.line2 ? (
                    <>
                      <br />
                      {order.shippingAddress.line2}
                    </>
                  ) : null}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                  {order.shippingAddress.pincode}
                  <br />
                  {order.shippingAddress.phone}
                </address>
              ) : null}
              {order.deliveryWindow ? (
                <p>
                  {order.shippingMethod ?? "Shipping"}: expected{" "}
                  <span className="font-medium">{order.deliveryWindow}</span>.
                </p>
              ) : null}
            </section>
            <section aria-labelledby="pay-heading" className="flex flex-col gap-2 text-sm">
              <h2 id="pay-heading" className="text-lg">
                Payment
              </h2>
              <p className="text-muted-foreground">
                {order.paymentMethod === "COD" ? "Cash on delivery. " : "Paid online. "}
                {paymentLine(order)}
              </p>
              {order.invoiceAvailable ? (
                <Button asChild variant="outline" className="w-fit">
                  <a href={`/api/invoices/${order.id}${tokenQuery}`}>Download tax invoice (PDF)</a>
                </Button>
              ) : null}
            </section>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/collections/new-in">Continue shopping</Link>
            </Button>
            {user ? (
              <Button asChild variant="outline">
                <Link href="/account/orders">Your orders</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link
                  href={`/register?next=${encodeURIComponent(`/checkout/success/${order.id}${tokenQuery}`)}`}
                >
                  Create an account to track it
                </Link>
              </Button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Order totals">
          <dl className="flex flex-col gap-2 border border-border bg-background p-5 text-sm num">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatINR(order.subtotal)}</dd>
            </div>
            {order.discountTotal > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Discount{order.couponCode ? ` (${order.couponCode})` : ""}
                </dt>
                <dd className="text-success">−{formatINR(order.discountTotal)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{order.shippingMethod ?? "Shipping"}</dt>
              <dd>{order.shippingTotal === 0 ? "Free" : formatINR(order.shippingTotal)}</dd>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>{order.isInterState ? "Includes IGST" : "Includes CGST + SGST"}</dt>
              <dd>{formatINR(order.taxTotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
              <dt>Total</dt>
              <dd className="text-talon">{formatINR(order.grandTotal)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

function paymentLine(order: OrderView): string {
  if (order.paymentMethod === "COD")
    return `Keep ${formatINR(order.grandTotal)} ready for the courier; UPI and cards work at the door too.`;
  if (order.paymentStatus === "PAID") return `${formatINR(order.grandTotal)} received.`;
  if (order.paymentStatus === "PENDING") return "We are waiting for the bank to confirm.";
  if (order.paymentStatus === "FAILED") return "The payment did not go through.";
  return `Payment status: ${order.paymentStatus.toLowerCase().replace("_", " ")}.`;
}

function stateOf(order: OrderView): {
  label: string;
  badge: "success" | "brass" | "alert" | "muted";
  heading: string;
  body: (o: OrderView) => string;
} {
  if (order.needsReview) {
    return {
      label: "Payment received",
      badge: "brass",
      heading: "Your payment arrived. We hit a snag.",
      body: () =>
        "We could not confirm every item after the payment came through. We will either send it or refund it in full within 2 working days, and we will email you either way.",
    };
  }
  if (order.status === "CANCELLED") {
    return {
      label: "Cancelled",
      badge: "alert",
      heading: "This order was cancelled.",
      body: () =>
        "The payment window closed before we heard from the bank. If any amount was charged, it is refunded automatically within 5 to 7 working days. Your bag is still here whenever you are ready.",
    };
  }
  if (order.status === "PENDING") {
    return {
      label: "Confirming payment",
      badge: "muted",
      heading: "Almost there.",
      body: () =>
        "We are waiting for the bank to confirm your payment. This page updates on its own; you can close it and we will email you the moment it lands.",
    };
  }
  return {
    label: "Confirmed",
    badge: "success",
    heading: "It is yours.",
    body: (o) =>
      o.deliveryWindow
        ? `We will pack it today or tomorrow and it should reach you ${o.deliveryWindow}.`
        : "We will pack it today or tomorrow and email you when it ships.",
  };
}
