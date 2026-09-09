import { Button, Link, Section, Text } from "@react-email/components";
import * as React from "react";

import { formatINR } from "@/lib/money";

import { EmailLayout, emailStyles } from "./layout";
import { OrderItemsTable } from "./order-parts";
import type { OrderEmailData, RefundEmailData, ReviewEmailData, ShipmentEmailData } from "./types";

export function OrderShippedEmail({ order }: { order: ShipmentEmailData }) {
  return (
    <EmailLayout
      preview={`Order ${order.orderNumber} has shipped.`}
      heading={`Order ${order.orderNumber} has shipped.`}
      siteUrl={order.siteUrl}
    >
      <Text style={emailStyles.text}>
        {order.courier} has it. Tracking number <span style={emailStyles.num}>{order.awb}</span>.
        {order.deliveryWindow ? ` Expected ${order.deliveryWindow}.` : ""}
      </Text>
      <OrderItemsTable order={order} />
      <Section>
        {order.trackingUrl ? (
          <Button href={order.trackingUrl} style={emailStyles.button}>
            Track with {order.courier}
          </Button>
        ) : (
          <Button href={order.orderUrl} style={emailStyles.button}>
            Track order
          </Button>
        )}
      </Section>
    </EmailLayout>
  );
}

export function OrderOutForDeliveryEmail({ order }: { order: ShipmentEmailData }) {
  return (
    <EmailLayout
      preview={`Order ${order.orderNumber} is out for delivery.`}
      heading="Out for delivery today."
      siteUrl={order.siteUrl}
    >
      <Text style={emailStyles.text}>
        {order.courier} is bringing order <span style={emailStyles.num}>{order.orderNumber}</span>{" "}
        today. Keep your phone handy for {order.shippingAddress.phone}.
      </Text>
      <OrderItemsTable order={order} />
    </EmailLayout>
  );
}

export function OrderDeliveredEmail({ order }: { order: OrderEmailData }) {
  return (
    <EmailLayout
      preview={`Order ${order.orderNumber} was delivered.`}
      heading="Delivered."
      siteUrl={order.siteUrl}
    >
      <Text style={emailStyles.text}>
        Order <span style={emailStyles.num}>{order.orderNumber}</span> has arrived. Wear it in.
      </Text>
      <Text style={emailStyles.text}>
        Wrong size? Exchanges are free within 7 days of delivery, unworn with tags.{" "}
        <Link href={order.orderUrl} style={{ color: "#46407a" }}>
          Start a return or exchange
        </Link>
        .
      </Text>
      <OrderItemsTable order={order} />
    </EmailLayout>
  );
}

export function OrderCancelledEmail({ order, reason }: { order: OrderEmailData; reason: string }) {
  return (
    <EmailLayout
      preview={`Order ${order.orderNumber} was cancelled.`}
      heading={`Order ${order.orderNumber} was cancelled.`}
      siteUrl={order.siteUrl}
    >
      <Text style={emailStyles.text}>{reason}</Text>
      {order.paymentMethod === "RAZORPAY" ? (
        <Text style={emailStyles.text}>
          If you were charged, the refund of {formatINR(order.grandTotal)} goes back to the original
          payment method within 5 to 7 working days.
        </Text>
      ) : null}
      <OrderItemsTable order={order} />
    </EmailLayout>
  );
}

export function RefundProcessedEmail({ order }: { order: RefundEmailData }) {
  return (
    <EmailLayout
      preview={`Refund of ${formatINR(order.refundAmount)} for ${order.orderNumber}.`}
      heading="Refund on its way."
      siteUrl={order.siteUrl}
    >
      <Text style={emailStyles.text}>
        {formatINR(order.refundAmount)} for order{" "}
        <span style={emailStyles.num}>{order.orderNumber}</span> has been refunded to your original
        payment method. Banks take 5 to 7 working days to show it.
      </Text>
      <Text style={emailStyles.muted}>Reason: {order.refundReason}</Text>
    </EmailLayout>
  );
}

export function OrderNeedsReviewEmail({ order }: { order: ReviewEmailData }) {
  return (
    <EmailLayout
      preview={`We need a moment with order ${order.orderNumber}.`}
      heading="Your payment arrived. We hit a snag."
      siteUrl={order.siteUrl}
    >
      <Text style={emailStyles.text}>
        Your payment of {formatINR(order.grandTotal)} for order{" "}
        <span style={emailStyles.num}>{order.orderNumber}</span> went through, but we could not
        confirm the order: {order.reason}
      </Text>
      <Text style={emailStyles.text}>
        Nobody has to do anything. We will either send it or refund it in full within 2 working
        days, and we will email you either way.
      </Text>
    </EmailLayout>
  );
}
