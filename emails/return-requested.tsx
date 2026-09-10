import { Button, Column, Row, Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailLayout, emailStyles } from "./layout";

export type ReturnRequestedEmailData = {
  orderNumber: string;
  customerName: string;
  type: "RETURN" | "EXCHANGE";
  items: Array<{ name: string; size: string; color: string; qty: number }>;
  pickupCity: string;
  returnsUrl: string;
  siteUrl: string;
};

export function ReturnRequestedEmail({ data }: { data: ReturnRequestedEmailData }) {
  const first = data.customerName.split(" ")[0] || "there";
  const noun = data.type === "EXCHANGE" ? "exchange" : "return";
  return (
    <EmailLayout
      preview={`We have your ${noun} request for ${data.orderNumber}.`}
      heading={`We have your ${noun} request.`}
      siteUrl={data.siteUrl}
    >
      <Text style={emailStyles.text}>
        Thanks, {first}. We will look at it within 2 working days and email you when the pickup from{" "}
        {data.pickupCity} is booked. Keep the items unworn, with tags, in the original packaging.
      </Text>
      <Section>
        {data.items.map((item, i) => (
          <Row key={i}>
            <Column style={emailStyles.tableCell}>
              {item.name} · {item.color} · {item.size}
            </Column>
            <Column style={emailStyles.tableCellRight}>Qty {item.qty}</Column>
          </Row>
        ))}
      </Section>
      <Section>
        <Button href={data.returnsUrl} style={emailStyles.button}>
          Track the {noun}
        </Button>
      </Section>
    </EmailLayout>
  );
}
