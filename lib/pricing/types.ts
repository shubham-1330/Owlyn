import type { CouponAppliesTo, CouponType } from "@prisma/client";

import type { Paise } from "@/lib/money";

/**
 * Inputs to the pricing engine. Everything the engine needs is passed in:
 * no clock, no database, no settings lookups. Money is integer paise.
 */

export type PricingLine = {
  id: string;
  productId: string;
  variantId: string;
  unitPrice: Paise;
  qty: number;
  /** Whole-percent GST included in the price. */
  taxRate: number;
  weightGrams: number;
  categoryIds: readonly string[];
  collectionIds: readonly string[];
};

export type CouponRule = {
  code: string;
  type: CouponType;
  /** PERCENT: whole percent. FLAT: paise. */
  value: number;
  minOrderValue: Paise;
  maxDiscount: Paise | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  appliesTo: CouponAppliesTo;
  categoryIds: readonly string[];
  productIds: readonly string[];
  collectionIds: readonly string[];
  bxgyBuyQty: number | null;
  bxgyGetQty: number | null;
  isFirstOrderOnly: boolean;
  isActive: boolean;
};

export type CouponContext = {
  now: Date;
  /** How many times this user has already redeemed this coupon. */
  userRedemptions: number;
  /** True when the user has no completed orders. */
  isFirstOrder: boolean;
};

export type CouponErrorCode =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "PER_USER_LIMIT"
  | "FIRST_ORDER_ONLY"
  | "MIN_ORDER"
  | "NOT_APPLICABLE";

export type CouponOutcome =
  | {
      ok: true;
      code: string;
      /** Discount allocated to each line, by line id. Missing means zero. */
      lineDiscounts: ReadonlyMap<string, Paise>;
      discountTotal: Paise;
      freeShipping: boolean;
    }
  | { ok: false; code: CouponErrorCode; message: string };

export type ShippingRateInput = {
  type: "FLAT" | "WEIGHT";
  baseRate: Paise;
  perKgRate: Paise | null;
  /** Discounted merchandise total at or above which shipping is free. */
  freeAbove: Paise | null;
};

export type PricedLine = PricingLine & {
  lineTotal: Paise;
  discount: Paise;
  /** lineTotal minus discount; what the customer pays for this line. */
  net: Paise;
  /** GST contained in `net`. */
  taxAmount: Paise;
};

export type TaxBreakdown = {
  taxTotal: Paise;
  /** Tax per whole-percent rate, e.g. { 5: 1200, 18: 900 }. */
  byRate: Record<number, Paise>;
};

export type CartTotals = {
  lines: PricedLine[];
  itemCount: number;
  subtotal: Paise;
  discountTotal: Paise;
  shippingTotal: Paise;
  taxTotal: Paise;
  taxByRate: Record<number, Paise>;
  grandTotal: Paise;
  freeShipping: boolean;
  coupon: { code: string; freeShipping: boolean } | null;
  couponError: { code: CouponErrorCode; message: string } | null;
};
