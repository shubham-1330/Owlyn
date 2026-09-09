import { Column, Row, Section, Text } from "@react-email/components";
import * as React from "react";

import { formatINR } from "@/lib/money";

import { emailStyles } from "./layout";
import type { OrderEmailData } from "./types";

export function OrderItemsTable({ order }: { order: OrderEmailData }) {
  return (
    <Section>
      {order.items.map((item, i) => (
        <Row key={i}>
          <Column style={emailStyles.tableCell}>
            <Text style={{ margin: 0, fontSize: "14px" }}>
              {item.name}
              <br />
              <span style={{ color: "#5c636b", fontSize: "13px" }}>
                {item.color} · {item.size} · Qty {item.qty}
              </span>
            </Text>
          </Column>
          <Column style={emailStyles.tableCellRight}>{formatINR(item.net)}</Column>
        </Row>
      ))}
    </Section>
  );
}

export function OrderTotals({ order }: { order: OrderEmailData }) {
  const rows: Array<[string, string]> = [
    ["Subtotal", formatINR(order.subtotal)],
    ...(order.discountTotal > 0
      ? [
          [
            `Discount${order.couponCode ? ` (${order.couponCode})` : ""}`,
            `−${formatINR(order.discountTotal)}`,
          ] as [string, string],
        ]
      : []),
    ["Shipping", order.shippingTotal === 0 ? "Free" : formatINR(order.shippingTotal)],
    ["Includes GST", formatINR(order.taxTotal)],
  ];
  return (
    <Section style={{ borderTop: "1px solid #d3d6d2", marginTop: "12px", paddingTop: "8px" }}>
      {rows.map(([label, value]) => (
        <Row key={label}>
          <Column style={{ ...emailStyles.tableCell, color: "#5c636b" }}>{label}</Column>
          <Column style={emailStyles.tableCellRight}>{value}</Column>
        </Row>
      ))}
      <Row>
        <Column style={{ ...emailStyles.tableCell, fontWeight: 600 }}>Total</Column>
        <Column style={{ ...emailStyles.tableCellRight, fontWeight: 600 }}>
          {formatINR(order.grandTotal)}
        </Column>
      </Row>
    </Section>
  );
}

export function AddressBlock({ order }: { order: OrderEmailData }) {
  const a = order.shippingAddress;
  return (
    <Text style={emailStyles.text}>
      <strong>Delivering to</strong>
      <br />
      {a.fullName}
      <br />
      {a.line1}
      {a.line2 ? (
        <>
          <br />
          {a.line2}
        </>
      ) : null}
      <br />
      {a.city}, {a.state} {a.pincode}
      <br />
      {a.phone}
    </Text>
  );
}
