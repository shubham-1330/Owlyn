import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { OrderConfirmationEmail, orderConfirmationSubject } from "./order-confirmation";
import {
  OrderCancelledEmail,
  OrderDeliveredEmail,
  OrderNeedsReviewEmail,
  OrderOutForDeliveryEmail,
  OrderShippedEmail,
  RefundProcessedEmail,
} from "./order-status";
import type { OrderEmailData } from "./types";

const order: OrderEmailData = {
  orderNumber: "OWL-2026-000123",
  customerName: "Asha Iyer",
  email: "asha.iyer@example.com",
  items: [
    { name: "Hush Court 1", size: "UK 8", color: "Ink", qty: 2, net: 1_099_800 },
    { name: "Roost Crew Sock, 3-pack", size: "S/M", color: "Ink", qty: 1, net: 79_900 },
  ],
  subtotal: 1_179_700,
  discountTotal: 30_000,
  shippingTotal: 0,
  taxTotal: 176_000,
  grandTotal: 1_149_700,
  paymentMethod: "RAZORPAY",
  couponCode: "FLAT300",
  shippingAddress: {
    fullName: "Asha Iyer",
    line1: "14, 3rd Cross",
    line2: "Koramangala",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    phone: "9876543210",
  },
  deliveryWindow: "Sat 12 Sept to Tue 15 Sept",
  orderUrl: "http://localhost:3000/checkout/success/order-1",
  siteUrl: "http://localhost:3000",
};

describe("order emails render", () => {
  it("confirmation carries the order number, items, totals and address", async () => {
    const html = await render(<OrderConfirmationEmail order={order} />);
    expect(html).toContain("OWL-2026-000123");
    expect(html).toContain("Hush Court 1");
    expect(html).toContain("₹11,497");
    expect(html).toContain("FLAT300");
    expect(html).toContain("Koramangala");
    expect(html).toContain("Sat 12 Sept to Tue 15 Sept");
    expect(orderConfirmationSubject(order)).toBe("Order OWL-2026-000123 is confirmed");
    const text = await render(<OrderConfirmationEmail order={order} />, { plainText: true });
    expect(text).toContain("Track order");
  });

  it("COD confirmation says the courier collects payment", async () => {
    const html = await render(
      <OrderConfirmationEmail order={{ ...order, paymentMethod: "COD" }} />,
    );
    expect(html).toContain("pay the courier on delivery");
  });

  it("shipped, out for delivery, delivered, cancelled, refund and review templates render", async () => {
    const shipment = {
      ...order,
      courier: "Delhivery",
      awb: "AWB123456789",
      trackingUrl: "https://example.com/track/AWB123456789",
    };
    expect(await render(<OrderShippedEmail order={shipment} />)).toContain("AWB123456789");
    expect(await render(<OrderOutForDeliveryEmail order={shipment} />)).toContain(
      "Out for delivery",
    );
    expect(await render(<OrderDeliveredEmail order={order} />)).toContain(
      "Start a return or exchange",
    );
    expect(
      await render(
        <OrderCancelledEmail order={order} reason="You cancelled it before it shipped." />,
      ),
    ).toContain("was cancelled");
    expect(
      await render(
        <RefundProcessedEmail
          order={{ ...order, refundAmount: 1_149_700, refundReason: "Order cancelled" }}
        />,
      ),
    ).toContain("₹11,497");
    expect(
      await render(
        <OrderNeedsReviewEmail
          order={{ ...order, reason: "Stock ran out before payment was captured." }}
        />,
      ),
    ).toContain("refund it in full");
  });
});
