import { describe, expect, it } from "vitest";

import {
  allocate,
  cartSubtotal,
  evaluateCoupon,
  grandTotal,
  inclusiveTaxOf,
  lineTotal,
  priceCart,
  roundHalfUp,
  shippingEstimate,
  taxBreakdown,
  type CouponContext,
  type CouponRule,
  type PricingLine,
  type ShippingRateInput,
} from "@/lib/pricing";

const NOW = new Date("2026-09-10T06:00:00Z");
const ctx: CouponContext = { now: NOW, userRedemptions: 0, isFirstOrder: true };

function line(
  partial: Partial<PricingLine> & { id: string; unitPrice: number; qty: number },
): PricingLine {
  return {
    productId: `p-${partial.id}`,
    variantId: `v-${partial.id}`,
    taxRate: 5,
    weightGrams: 200,
    categoryIds: [],
    collectionIds: [],
    ...partial,
  };
}

function coupon(
  partial: Partial<CouponRule> & { code: string; type: CouponRule["type"] },
): CouponRule {
  return {
    value: 0,
    minOrderValue: 0,
    maxDiscount: null,
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
    ...partial,
  };
}

const STANDARD: ShippingRateInput = {
  type: "FLAT",
  baseRate: 9_900,
  perKgRate: null,
  freeAbove: 199_900,
};

function sumDiscounts(outcome: ReturnType<typeof evaluateCoupon>): number {
  if (!outcome.ok) throw new Error("expected ok");
  return Array.from(outcome.lineDiscounts.values()).reduce((s, v) => s + v, 0);
}

describe("rounding primitives", () => {
  it("rounds half up at the paisa", () => {
    expect(roundHalfUp(12.5)).toBe(13);
    expect(roundHalfUp(12.49)).toBe(12);
    expect(roundHalfUp(0.5)).toBe(1);
    expect(() => roundHalfUp(-1)).toThrow(RangeError);
  });

  it("allocates exactly with largest remainder and never exceeds a weight", () => {
    expect(allocate(100, [100, 100, 100])).toEqual([34, 33, 33]);
    // 50,000 over 210,599: floors 30,840 / 18,969 / 189 leave 2 paise for the two largest fractions.
    expect(allocate(50_000, [129_900, 79_900, 799])).toEqual([30_840, 18_970, 190]);
    expect(allocate(50_000, [129_900, 79_900, 799]).reduce((s, v) => s + v, 0)).toBe(50_000);
    expect(allocate(10, [10, 0])).toEqual([10, 0]);
    expect(allocate(0, [5, 5])).toEqual([0, 0]);
    expect(() => allocate(11, [5, 5])).toThrow(RangeError);
  });
});

describe("line and subtotal", () => {
  it("multiplies integers and sums", () => {
    expect(lineTotal(129_900, 3)).toBe(389_700);
    expect(
      cartSubtotal([
        line({ id: "a", unitPrice: 129_900, qty: 2 }),
        line({ id: "b", unitPrice: 79_900, qty: 1 }),
      ]),
    ).toBe(339_700);
    expect(() => lineTotal(100, 1.5)).toThrow(RangeError);
  });
});

describe("PERCENT coupons", () => {
  it("rounds half-up per line and sums lines to the total", () => {
    // 12.5% of 129,900 = 16,237.5 -> 16,238; of 79,900 = 9,987.5 -> 9,988; of 799 = 99.875 -> 100
    const lines = [
      line({ id: "a", unitPrice: 129_900, qty: 1 }),
      line({ id: "b", unitPrice: 79_900, qty: 1 }),
      line({ id: "c", unitPrice: 799, qty: 1 }),
    ];
    const outcome = evaluateCoupon(
      coupon({ code: "half", type: "PERCENT", value: 12.5 }),
      lines,
      ctx,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.lineDiscounts.get("a")).toBe(16_238);
    expect(outcome.lineDiscounts.get("b")).toBe(9_988);
    expect(outcome.lineDiscounts.get("c")).toBe(100);
    expect(outcome.discountTotal).toBe(26_326);
    expect(sumDiscounts(outcome)).toBe(outcome.discountTotal);
    expect(outcome.code).toBe("HALF");
  });

  it("caps at maxDiscount and spreads the cap across lines exactly", () => {
    const lines = [
      line({ id: "a", unitPrice: 129_900, qty: 1 }),
      line({ id: "b", unitPrice: 79_900, qty: 1 }),
    ];
    const outcome = evaluateCoupon(
      coupon({ code: "WELCOME10", type: "PERCENT", value: 10, maxDiscount: 5_000 }),
      lines,
      ctx,
    );
    expect(outcome.ok && outcome.discountTotal).toBe(5_000);
    expect(sumDiscounts(outcome)).toBe(5_000);
    if (outcome.ok) {
      expect(outcome.lineDiscounts.get("a")).toBe(3_096);
      expect(outcome.lineDiscounts.get("b")).toBe(1_904);
    }
  });

  it("discounts only eligible lines on a partially eligible cart", () => {
    const lines = [
      line({ id: "sock", unitPrice: 79_900, qty: 2, categoryIds: ["cat-socks"] }),
      line({ id: "shoe", unitPrice: 549_900, qty: 1, categoryIds: ["cat-sneakers"] }),
    ];
    const outcome = evaluateCoupon(
      coupon({
        code: "SOCKS20",
        type: "PERCENT",
        value: 20,
        appliesTo: "CATEGORY",
        categoryIds: ["cat-socks"],
      }),
      lines,
      ctx,
    );
    expect(outcome.ok && outcome.discountTotal).toBe(31_960);
    if (outcome.ok) {
      expect(outcome.lineDiscounts.get("sock")).toBe(31_960);
      expect(outcome.lineDiscounts.has("shoe")).toBe(false);
    }
  });

  it("checks minOrderValue against the whole cart and says how much is missing", () => {
    const lines = [line({ id: "a", unitPrice: 99_900, qty: 1 })];
    const outcome = evaluateCoupon(
      coupon({ code: "FLAT300", type: "FLAT", value: 30_000, minOrderValue: 249_900 }),
      lines,
      ctx,
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.code).toBe("MIN_ORDER");
      expect(outcome.message).toBe("Add ₹1,500 more to use FLAT300.");
    }
  });
});

describe("coupon gates", () => {
  const lines = [line({ id: "a", unitPrice: 299_900, qty: 1 })];

  it("rejects unknown, inactive, not started, expired, exhausted, per-user and first-order-only", () => {
    expect(evaluateCoupon(null, lines, ctx)).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(
      evaluateCoupon(coupon({ code: "X", type: "FLAT", value: 100, isActive: false }), lines, ctx),
    ).toMatchObject({ ok: false, code: "INACTIVE" });
    expect(
      evaluateCoupon(
        coupon({ code: "X", type: "FLAT", value: 100, startsAt: new Date("2026-09-20T00:00:00Z") }),
        lines,
        ctx,
      ),
    ).toMatchObject({ ok: false, code: "NOT_STARTED", message: "X starts on 20 Sept 2026." });
    expect(
      evaluateCoupon(
        coupon({
          code: "LAUNCH25",
          type: "PERCENT",
          value: 25,
          endsAt: new Date("2026-08-11T00:00:00Z"),
        }),
        lines,
        ctx,
      ),
    ).toMatchObject({ ok: false, code: "EXPIRED", message: "LAUNCH25 expired on 11 Aug 2026." });
    expect(
      evaluateCoupon(
        coupon({ code: "X", type: "FLAT", value: 100, usageLimit: 500, usedCount: 500 }),
        lines,
        ctx,
      ),
    ).toMatchObject({ ok: false, code: "EXHAUSTED" });
    expect(
      evaluateCoupon(coupon({ code: "X", type: "FLAT", value: 100, perUserLimit: 1 }), lines, {
        ...ctx,
        userRedemptions: 1,
      }),
    ).toMatchObject({ ok: false, code: "PER_USER_LIMIT" });
    expect(
      evaluateCoupon(
        coupon({ code: "X", type: "FLAT", value: 100, isFirstOrderOnly: true }),
        lines,
        { ...ctx, isFirstOrder: false },
      ),
    ).toMatchObject({ ok: false, code: "FIRST_ORDER_ONLY" });
  });

  it("allows the last permitted use", () => {
    const outcome = evaluateCoupon(
      coupon({ code: "X", type: "FLAT", value: 100, usageLimit: 500, usedCount: 499 }),
      lines,
      ctx,
    );
    expect(outcome.ok).toBe(true);
  });

  it("rejects a targeted code that touches nothing in the cart", () => {
    const outcome = evaluateCoupon(
      coupon({
        code: "NIGHT20",
        type: "PERCENT",
        value: 20,
        appliesTo: "COLLECTION",
        collectionIds: ["night-run"],
      }),
      lines,
      ctx,
    );
    expect(outcome).toMatchObject({
      ok: false,
      code: "NOT_APPLICABLE",
      message: "NIGHT20 does not apply to anything in your bag.",
    });
  });
});

describe("FLAT coupons", () => {
  it("spreads the amount across eligible lines and never exceeds their subtotal", () => {
    const lines = [
      line({ id: "a", unitPrice: 129_900, qty: 1 }),
      line({ id: "b", unitPrice: 79_900, qty: 2 }),
    ];
    const outcome = evaluateCoupon(
      coupon({ code: "FLAT300", type: "FLAT", value: 30_000 }),
      lines,
      ctx,
    );
    expect(sumDiscounts(outcome)).toBe(30_000);
    if (outcome.ok) {
      // 30,000 × 129,900 / 289,700 = 13,451.85 and 16,548.15; the remainder paisa goes to the larger fraction.
      expect(outcome.lineDiscounts.get("a")).toBe(13_452);
      expect(outcome.lineDiscounts.get("b")).toBe(16_548);
    }
    const tiny = evaluateCoupon(
      coupon({ code: "BIG", type: "FLAT", value: 999_900 }),
      [line({ id: "a", unitPrice: 79_900, qty: 1 })],
      ctx,
    );
    expect(tiny.ok && tiny.discountTotal).toBe(79_900);
  });
});

describe("BXGY coupons", () => {
  const socks = coupon({
    code: "SOCKS3",
    type: "BXGY",
    bxgyBuyQty: 2,
    bxgyGetQty: 1,
    appliesTo: "CATEGORY",
    categoryIds: ["cat-socks"],
  });

  it("makes the cheapest eligible unit free, even across lines", () => {
    const lines = [
      line({ id: "crew", unitPrice: 79_900, qty: 2, categoryIds: ["cat-socks"] }),
      line({ id: "run", unitPrice: 69_900, qty: 1, categoryIds: ["cat-socks"] }),
    ];
    const outcome = evaluateCoupon(socks, lines, ctx);
    expect(outcome.ok && outcome.discountTotal).toBe(69_900);
    if (outcome.ok) {
      expect(outcome.lineDiscounts.get("run")).toBe(69_900);
      expect(outcome.lineDiscounts.has("crew")).toBe(false);
    }
  });

  it("frees one unit per complete set and ignores ineligible lines", () => {
    const lines = [
      line({ id: "crew", unitPrice: 79_900, qty: 6, categoryIds: ["cat-socks"] }),
      line({ id: "shoe", unitPrice: 549_900, qty: 1, categoryIds: ["cat-sneakers"] }),
    ];
    const outcome = evaluateCoupon(socks, lines, ctx);
    expect(outcome.ok && outcome.discountTotal).toBe(2 * 79_900);
  });

  it("explains what is missing when a set is incomplete", () => {
    const lines = [line({ id: "crew", unitPrice: 79_900, qty: 2, categoryIds: ["cat-socks"] })];
    expect(evaluateCoupon(socks, lines, ctx)).toMatchObject({
      ok: false,
      code: "NOT_APPLICABLE",
      message: "Add 1 more eligible item to use SOCKS3.",
    });
  });
});

describe("shipping and tax", () => {
  it("charges flat rates below the threshold and nothing at or above it", () => {
    expect(
      shippingEstimate({
        rate: STANDARD,
        subtotalAfterDiscount: 199_899,
        weightGrams: 500,
        freeShipping: false,
      }),
    ).toBe(9_900);
    expect(
      shippingEstimate({
        rate: STANDARD,
        subtotalAfterDiscount: 199_900,
        weightGrams: 500,
        freeShipping: false,
      }),
    ).toBe(0);
    expect(
      shippingEstimate({
        rate: null,
        subtotalAfterDiscount: 100,
        weightGrams: 500,
        freeShipping: false,
      }),
    ).toBe(0);
  });

  it("adds weight steps beyond the first kilo", () => {
    const remote: ShippingRateInput = {
      type: "WEIGHT",
      baseRate: 14_900,
      perKgRate: 6_000,
      freeAbove: 299_900,
    };
    expect(
      shippingEstimate({
        rate: remote,
        subtotalAfterDiscount: 1_000,
        weightGrams: 2_400,
        freeShipping: false,
      }),
    ).toBe(26_900);
  });

  it("backs GST out of inclusive nets and groups by rate", () => {
    expect(inclusiveTaxOf(105_000, 5)).toBe(5_000);
    expect(inclusiveTaxOf(118_000, 18)).toBe(18_000);
    expect(inclusiveTaxOf(129_900, 5)).toBe(6_186); // 6,185.71 rounds up
    const breakdown = taxBreakdown([
      { net: 129_900, taxRate: 5 },
      { net: 79_900, taxRate: 5 },
      { net: 549_900, taxRate: 18 },
    ]);
    expect(breakdown.byRate).toEqual({ 5: 6_186 + 3_805, 18: 83_883 });
    expect(breakdown.taxTotal).toBe(6_186 + 3_805 + 83_883);
  });

  it("grand total is subtotal minus discount plus shipping", () => {
    expect(grandTotal({ subtotal: 339_700, discountTotal: 30_000, shippingTotal: 9_900 })).toBe(
      319_600,
    );
    expect(() => grandTotal({ subtotal: 100, discountTotal: 200, shippingTotal: 0 })).toThrow(
      RangeError,
    );
  });
});

describe("priceCart", () => {
  const lines = [
    line({ id: "tee", unitPrice: 129_900, qty: 2, taxRate: 5, weightGrams: 180 }),
    line({ id: "shoe", unitPrice: 549_900, qty: 1, taxRate: 18, weightGrams: 760 }),
    line({ id: "sock", unitPrice: 79_900, qty: 1, taxRate: 5, weightGrams: 150 }),
  ];

  it("keeps line nets summing to the cart total with a percent coupon and a cap", () => {
    const totals = priceCart({
      lines,
      coupon: coupon({ code: "WELCOME10", type: "PERCENT", value: 10, maxDiscount: 50_000 }),
      couponContext: ctx,
      shippingRate: STANDARD,
    });
    expect(totals.subtotal).toBe(889_600);
    expect(totals.discountTotal).toBe(50_000);
    expect(totals.lines.reduce((s, l) => s + l.net, 0)).toBe(
      totals.subtotal - totals.discountTotal,
    );
    expect(totals.lines.reduce((s, l) => s + l.discount, 0)).toBe(totals.discountTotal);
    expect(totals.shippingTotal).toBe(0);
    expect(totals.freeShipping).toBe(true);
    expect(totals.grandTotal).toBe(839_600);
    expect(totals.taxTotal).toBe(totals.lines.reduce((s, l) => s + l.taxAmount, 0));
    expect(totals.itemCount).toBe(4);
  });

  it("a flat discount can pull the cart below the free-shipping threshold", () => {
    const small = [
      line({ id: "a", unitPrice: 109_900, qty: 1 }),
      line({ id: "b", unitPrice: 99_900, qty: 1 }),
    ];
    const withFlat = priceCart({
      lines: small,
      coupon: coupon({ code: "FLAT300", type: "FLAT", value: 30_000 }),
      couponContext: ctx,
      shippingRate: STANDARD,
    });
    expect(withFlat.subtotal).toBe(209_800);
    expect(withFlat.discountTotal).toBe(30_000);
    expect(withFlat.shippingTotal).toBe(9_900);
    expect(withFlat.freeShipping).toBe(false);
    expect(withFlat.grandTotal).toBe(189_700);
  });

  it("a free-shipping coupon zeroes shipping regardless of the threshold", () => {
    const totals = priceCart({
      lines: [line({ id: "a", unitPrice: 99_900, qty: 1 })],
      coupon: coupon({ code: "FREESHIP", type: "FREE_SHIPPING" }),
      couponContext: ctx,
      shippingRate: STANDARD,
    });
    expect(totals.discountTotal).toBe(0);
    expect(totals.shippingTotal).toBe(0);
    expect(totals.freeShipping).toBe(true);
    expect(totals.coupon).toEqual({ code: "FREESHIP", freeShipping: true });
  });

  it("keeps the cart priced and reports why a coupon failed", () => {
    const totals = priceCart({
      lines: [line({ id: "a", unitPrice: 99_900, qty: 1 })],
      coupon: coupon({ code: "FLAT300", type: "FLAT", value: 30_000, minOrderValue: 249_900 }),
      couponContext: ctx,
      shippingRate: STANDARD,
    });
    expect(totals.discountTotal).toBe(0);
    expect(totals.coupon).toBeNull();
    expect(totals.couponError).toEqual({
      code: "MIN_ORDER",
      message: "Add ₹1,500 more to use FLAT300.",
    });
    expect(totals.grandTotal).toBe(99_900 + 9_900);
  });

  it("ignores zero-quantity lines and prices an empty cart to zero", () => {
    const totals = priceCart({
      lines: [line({ id: "a", unitPrice: 100, qty: 0 })],
      coupon: null,
      couponContext: ctx,
      shippingRate: STANDARD,
    });
    expect(totals.lines).toHaveLength(0);
    expect(totals.grandTotal).toBe(0);
    expect(totals.shippingTotal).toBe(0);
    expect(totals.freeShipping).toBe(false);
  });
});
