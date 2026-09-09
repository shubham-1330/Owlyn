import { Button, Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailLayout, emailStyles } from "./layout";
import { AddressBlock, OrderItemsTable, OrderTotals } from "./order-parts";
import type { OrderEmailData } from "./types";

export function OrderConfirmationEmail({ order }: { order: OrderEmailData }) {
  const first = order.customerName.split(" ")[0] || "there";
  return (
    <EmailLayout
      preview={`Order ${order.orderNumber} is confirmed.`}
      heading={`Order ${order.orderNumber} is confirmed.`}
      siteUrl={order.siteUrl}
    >
      <Text style={emailStyles.text}>
        Thanks, {first}.{" "}
        {order.paymentMethod === "COD"
          ? "You will pay the courier on delivery."
          : "Your payment went through."}{" "}
        {order.deliveryWindow
          ? `Expected delivery ${order.deliveryWindow}.`
          : "We will email you when it ships."}
      </Text>
      <OrderItemsTable order={order} />
      <OrderTotals order={order} />
      <AddressBlock order={order} />
      <Section>
        <Button href={order.orderUrl} style={emailStyles.button}>
          Track order
        </Button>
      </Section>
    </EmailLayout>
  );
}

export function orderConfirmationSubject(order: OrderEmailData): string {
  return `Order ${order.orderNumber} is confirmed`;
}
