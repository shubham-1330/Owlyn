import { describe, expect, it } from "vitest";

import { signOrderAccess, verifyOrderAccess } from "@/lib/orders/access";
import {
  formatInvoiceNumber,
  formatOrderNumber,
  ORDER_NUMBER_PATTERN,
} from "@/lib/orders/order-number";
import { lineTaxSplit, normaliseState, orderTaxSplit, placeOfSupply } from "@/lib/orders/tax";
import {
  signCheckout,
  signWebhookBody,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "@/lib/payments/razorpay";
import { priceCart, type PricingLine } from "@/lib/pricing";

process.env.AUTH_SECRET ??= "test-secret-for-order-access-tokens";

describe("order and invoice numbers", () => {
  it("formats zero-padded sequences", () => {
    expect(formatOrderNumber(123, 2026)).toBe("OWL-2026-000123");
    expect(formatOrderNumber(1n, 2026)).toBe("OWL-2026-000001");
    expect(formatInvoiceNumber(42, 2026)).toBe("OWL-INV-2026-000042");
    expect(ORDER_NUMBER_PATTERN.test("OWL-2026-000123")).toBe(true);
    expect(ORDER_NUMBER_PATTERN.test("OWL-26-1")).toBe(false);
  });
});

describe("place of supply", () => {
  it("normalises spelling and aliases", () => {
    expect(normaliseState(" Karnataka ")).toBe("karnataka");
    expect(normaliseState("KA")).toBe("karnataka");
    expect(normaliseState("Jammu & Kashmir")).toBe("jammu and kashmir");
    expect(normaliseState("New Delhi")).toBe("delhi");
  });

  it("splits CGST+SGST in-state and IGST out-of-state", () => {
    expect(placeOfSupply("Karnataka", "Karnataka").isInterState).toBe(false);
    expect(placeOfSupply("Maharashtra", "Karnataka").isInterState).toBe(true);
    expect(orderTaxSplit(1_001, false)).toEqual({ cgstTotal: 500, sgstTotal: 501, igstTotal: 0 });
    expect(orderTaxSplit(1_001, true)).toEqual({ cgstTotal: 0, sgstTotal: 0, igstTotal: 1_001 });
    expect(lineTaxSplit(99, false)).toEqual({ cgst: 49, sgst: 50, igst: 0 });
  });
});

describe("razorpay signatures", () => {
  const keySecret = "rzp_test_secret";
  const webhookSecret = "whsec_test";

  it("accepts a correctly signed checkout callback and rejects a tampered one", () => {
    const signature = signCheckout("order_A", "pay_B", keySecret);
    expect(
      verifyCheckoutSignature({ orderId: "order_A", paymentId: "pay_B", signature }, keySecret),
    ).toBe(true);
    expect(
      verifyCheckoutSignature({ orderId: "order_A", paymentId: "pay_C", signature }, keySecret),
    ).toBe(false);
    expect(
      verifyCheckoutSignature({ orderId: "order_A", paymentId: "pay_B", signature: "" }, keySecret),
    ).toBe(false);
    expect(verifyCheckoutSignature({ orderId: "order_A", paymentId: "pay_B", signature }, "")).toBe(
      false,
    );
  });

  it("accepts a signed webhook body and rejects unsigned or altered bodies", () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1" } } },
    });
    const signature = signWebhookBody(body, webhookSecret);
    expect(verifyWebhookSignature(body, signature, webhookSecret)).toBe(true);
    expect(verifyWebhookSignature(body + " ", signature, webhookSecret)).toBe(false);
    expect(verifyWebhookSignature(body, null, webhookSecret)).toBe(false);
    expect(verifyWebhookSignature(body, signature, "")).toBe(false);
    expect(verifyWebhookSignature(body, "deadbeef", webhookSecret)).toBe(false);
  });
});

describe("guest order access tokens", () => {
  it("verifies only the matching order and expires", () => {
    const now = Date.UTC(2026, 8, 10);
    const token = signOrderAccess("order-1", 30, now);
    expect(verifyOrderAccess(token, "order-1", now)).toBe(true);
    expect(verifyOrderAccess(token, "order-2", now)).toBe(false);
    expect(verifyOrderAccess(token, "order-1", now + 31 * 86_400_000)).toBe(false);
    expect(verifyOrderAccess("garbage", "order-1", now)).toBe(false);
    expect(verifyOrderAccess(null, "order-1", now)).toBe(false);
  });
});

describe("invoice arithmetic from the pricing engine", () => {
  const lines: PricingLine[] = [
    {
      id: "a",
      productId: "p1",
      variantId: "v1",
      unitPrice: 129_900,
      qty: 1,
      taxRate: 5,
      weightGrams: 180,
      categoryIds: [],
      collectionIds: [],
    },
    {
      id: "b",
      productId: "p2",
      variantId: "v2",
      unitPrice: 79_900,
      qty: 1,
      taxRate: 5,
      weightGrams: 150,
      categoryIds: [],
      collectionIds: [],
    },
    {
      id: "c",
      productId: "p3",
      variantId: "v3",
      unitPrice: 799,
      qty: 1,
      taxRate: 18,
      weightGrams: 60,
      categoryIds: [],
      collectionIds: [],
    },
  ];

  it("per-line tax sums to taxTotal and line nets plus shipping equal grandTotal, with uneven leftover paise", () => {
    // 50,000 spread over 210,599 gives floors of 30,840 / 18,969 / 189 and two leftover paise.
    const totals = priceCart({
      lines,
      coupon: {
        code: "CAP",
        type: "PERCENT",
        value: 40,
        minOrderValue: 0,
        maxDiscount: 50_000,
        usageLimit: null,
        perUserLimit: null,
        usedCount: 0,
        startsAt: null,
        endsAt: null,
        appliesTo: "ALL",
        categoryIds: [],
        productIds: [],
        collectionIds: [],
        bxgyBuyQty: null,
        bxgyGetQty: null,
        isFirstOrderOnly: false,
        isActive: true,
      },
      couponContext: {
        now: new Date("2026-09-10T00:00:00Z"),
        userRedemptions: 0,
        isFirstOrder: true,
      },
      shippingRate: { type: "FLAT", baseRate: 9_900, perKgRate: null, freeAbove: 199_900 },
    });

    const discounts = totals.lines.map((l) => l.discount);
    expect(discounts).toEqual([30_840, 18_970, 190]);
    // Per-line 40% discounts are [51_960, 31_960, 320]; the 50_000 cap is
    // allocated in that ratio. Floors sum to 49_998, so two lines get an
    // extra paise from the largest remainders and one does not.
    const perLine40 = [51_960, 31_960, 320];
    const floors = perLine40.map((d) => Math.floor((50_000 * d) / 84_240));
    expect(discounts.map((d, i) => d - floors[i]!)).toEqual([0, 1, 1]);

    const lineTaxSum = totals.lines.reduce((s, l) => s + l.taxAmount, 0);
    expect(lineTaxSum).toBe(totals.taxTotal);

    const lineNetSum = totals.lines.reduce((s, l) => s + l.net, 0);
    expect(lineNetSum + totals.shippingTotal).toBe(totals.grandTotal);

    for (const interState of [false, true]) {
      const split = orderTaxSplit(totals.taxTotal, interState);
      const perLine = totals.lines.map((l) => lineTaxSplit(l.taxAmount, interState));
      expect(perLine.reduce((s, x) => s + x.cgst + x.sgst + x.igst, 0)).toBe(
        split.cgstTotal + split.sgstTotal + split.igstTotal,
      );
    }
  });
});
