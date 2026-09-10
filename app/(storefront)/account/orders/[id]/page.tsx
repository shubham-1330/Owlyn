import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/order-status-badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { CancelOrderButton } from "@/components/storefront/account/cancel-order-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { formatINR } from "@/lib/money";
import { getOrderDetailForUser } from "@/lib/orders/queries";
import type { AddressSnapshot } from "@/lib/orders/types";
import { RETURN_STATUS_LABEL } from "@/lib/returns/window";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function AddressBlock({ title, address }: { title: string; address: AddressSnapshot | null }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <h3 className="font-medium">{title}</h3>
      {address ? (
        <address className="leading-relaxed text-muted-foreground not-italic">
          {address.fullName}
          <br />
          {address.line1}
          {address.line2 ? (
            <>
              <br />
              {address.line2}
            </>
          ) : null}
          {address.landmark ? (
            <>
              <br />
              {address.landmark}
            </>
          ) : null}
          <br />
          {address.city}, {address.state} {address.pincode}
          <br />
          <span className="num">{address.phone}</span>
        </address>
      ) : (
        <p className="text-muted-foreground">Not recorded.</p>
      )}
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser("/account/orders")]);
  const order = await getOrderDetailForUser(id, user.id);
  if (!order) notFound();

  const latestShipment = order.shipments.at(-1) ?? null;
  const prepaid = order.paymentMethod === "RAZORPAY";
  const returnable = order.returnableUnits > 0;

  return (
    <>
      <header className="flex flex-col gap-3">
        <Link
          href="/account/orders"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          All orders
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl num md:text-3xl">{order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
        <p className="text-muted-foreground">
          {order.placedAt ? `Placed ${DATE.format(new Date(order.placedAt))}. ` : ""}
          {order.status === "CANCELLED" && order.cancelReason
            ? `Cancelled: ${order.cancelReason}`
            : order.deliveredAt
              ? `Delivered ${DATE.format(new Date(order.deliveredAt))}.`
              : order.deliveryWindow
                ? `Expected ${order.deliveryWindow}.`
                : ""}
        </p>
        {order.needsReview ? (
          <p className="border-l-2 border-talon pl-3 text-sm">
            Your payment arrived but we could not confirm every item. We will either send it or
            refund it in full within 2 working days and email you either way.
          </p>
        ) : null}
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <div className="flex flex-col gap-10">
          <section aria-labelledby="progress" className="flex flex-col gap-4">
            <h2 id="progress" className="text-lg">
              Progress
            </h2>
            <OrderTimeline timeline={order.timeline} shipment={latestShipment} />
          </section>

          <section aria-labelledby="items" className="flex flex-col gap-3">
            <h2 id="items" className="text-lg">
              Items
            </h2>
            <ul className="divide-y divide-border border-y border-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-4">
                  <div
                    className="relative w-16 shrink-0 overflow-hidden bg-slate"
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
                      {item.color} · {item.size} · Qty {item.qty} · {formatINR(item.unitPrice)} each
                    </span>
                  </div>
                  <span className="text-sm num">{formatINR(item.net)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="addresses" className="grid gap-6 sm:grid-cols-2">
            <h2 id="addresses" className="sr-only">
              Addresses
            </h2>
            <AddressBlock title="Delivering to" address={order.shippingAddress} />
            <AddressBlock title="Billing address" address={order.billingAddress} />
          </section>

          {order.customerNote ? (
            <section className="text-sm">
              <h3 className="font-medium">Your note</h3>
              <p className="text-muted-foreground">{order.customerNote}</p>
            </section>
          ) : null}

          {order.returns.length > 0 ? (
            <section aria-labelledby="returns" className="flex flex-col gap-3">
              <h2 id="returns" className="text-lg">
                Returns on this order
              </h2>
              <ul className="flex flex-col gap-2 text-sm">
                {order.returns.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <span>
                      {r.type === "EXCHANGE" ? "Exchange" : "Return"} · {r.units}{" "}
                      {r.units === 1 ? "item" : "items"} · {DATE.format(new Date(r.createdAt))}
                    </span>
                    <Badge variant="outline">{RETURN_STATUS_LABEL[r.status] ?? r.status}</Badge>
                  </li>
                ))}
              </ul>
              <Link
                href="/account/returns"
                className="text-sm underline underline-offset-4 hover:text-primary"
              >
                Track returns
              </Link>
            </section>
          ) : null}

          <section aria-labelledby="activity" className="flex flex-col gap-3">
            <h2 id="activity" className="text-lg">
              Activity
            </h2>
            <ol className="flex flex-col gap-2 text-sm">
              {order.events.map((e) => (
                <li key={e.id} className="grid grid-cols-[auto_1fr] gap-x-4">
                  <time dateTime={e.createdAt} className="text-muted-foreground num">
                    {DATE_TIME.format(new Date(e.createdAt))}
                  </time>
                  <span>{e.message}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside
          className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start"
          aria-label="Payment and actions"
        >
          <dl className="flex flex-col gap-2 border border-border bg-slate p-5 text-sm num">
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

          <section className="flex flex-col gap-2 text-sm">
            <h2 className="font-medium">Payment</h2>
            {order.payments.length === 0 ? (
              <p className="text-muted-foreground">No payment recorded.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-muted-foreground">
                {order.payments.map((p) => (
                  <li key={p.id}>
                    {p.provider === "COD" ? "Cash on delivery" : "Razorpay"}
                    {p.method && p.method !== "cod" ? ` · ${p.method}` : ""} · {formatINR(p.amount)}{" "}
                    ·{" "}
                    {p.status === "CAPTURED"
                      ? `paid ${p.capturedAt ? DATE.format(new Date(p.capturedAt)) : ""}`
                      : p.provider === "COD" && p.status === "CREATED"
                        ? order.status === "CANCELLED"
                          ? "not collected"
                          : "payable on delivery"
                        : p.status.toLowerCase()}
                    {p.reference ? (
                      <>
                        {" "}
                        · ref <span className="num">{p.reference}</span>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {order.refunds.length > 0 ? (
              <ul className="flex flex-col gap-1 text-muted-foreground">
                {order.refunds.map((r) => (
                  <li key={r.id}>
                    Refund {formatINR(r.amount)} ·{" "}
                    {r.status === "COMPLETED"
                      ? "processed"
                      : r.status === "FAILED"
                        ? "failed, we are on it"
                        : "queued"}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="flex flex-col gap-2">
            {order.invoiceAvailable ? (
              <Button asChild variant="outline">
                <a href={`/api/invoices/${order.id}`}>Download tax invoice (PDF)</a>
              </Button>
            ) : null}
            {returnable ? (
              <Button asChild>
                <Link href={`/account/orders/${order.id}/return`}>Return or exchange</Link>
              </Button>
            ) : null}
            {order.canCancel ? (
              <CancelOrderButton
                orderId={order.id}
                orderNumber={order.orderNumber}
                prepaid={prepaid && order.paymentStatus === "PAID"}
              />
            ) : null}
            {order.returnWindow && !order.returnWindow.open && order.status !== "CANCELLED" ? (
              <p className="text-xs text-muted-foreground">
                The return window closed on {DATE.format(order.returnWindow.closesAt)}.
              </p>
            ) : order.returnWindow?.open && !returnable && order.deliveredAt ? (
              <p className="text-xs text-muted-foreground">
                Every item on this order is already in a return.
              </p>
            ) : order.returnWindow?.open ? (
              <p className="text-xs text-muted-foreground">
                Returns close in {order.returnWindow.daysLeft}{" "}
                {order.returnWindow.daysLeft === 1 ? "day" : "days"}.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
