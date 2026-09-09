import { assertPaise, type Paise } from "@/lib/money";
import { cartSubtotal, evaluateCoupon, lineTotal } from "@/lib/pricing/coupon";
import { roundHalfUp } from "@/lib/pricing/round";
import type {
  CartTotals,
  CouponContext,
  CouponRule,
  PricedLine,
  PricingLine,
  ShippingRateInput,
  TaxBreakdown,
} from "@/lib/pricing/types";

/**
 * Shipping on the discounted merchandise total. A free-shipping coupon wins;
 * otherwise the rate's own threshold applies. No rate means nothing to charge.
 */
export function shippingEstimate(input: {
  rate: ShippingRateInput | null;
  subtotalAfterDiscount: Paise;
  weightGrams: number;
  freeShipping: boolean;
}): Paise {
  assertPaise(input.subtotalAfterDiscount, "subtotalAfterDiscount");
  if (input.freeShipping || !input.rate) return 0;
  const { rate } = input;
  if (rate.freeAbove !== null && input.subtotalAfterDiscount >= rate.freeAbove) return 0;
  if (rate.type === "FLAT") return rate.baseRate;
  const extraKg = Math.max(0, Math.ceil(input.weightGrams / 1000) - 1);
  return rate.baseRate + extraKg * (rate.perKgRate ?? 0);
}

/** GST contained in a tax-inclusive amount, half-up at the paisa. */
export function inclusiveTaxOf(net: Paise, ratePercent: number): Paise {
  assertPaise(net, "net");
  if (!Number.isInteger(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    throw new RangeError(`ratePercent must be a whole percent, received ${String(ratePercent)}`);
  }
  return roundHalfUp((net * ratePercent) / (100 + ratePercent));
}

export function taxBreakdown(lines: readonly Pick<PricedLine, "net" | "taxRate">[]): TaxBreakdown {
  const byRate: Record<number, Paise> = {};
  let taxTotal = 0;
  for (const line of lines) {
    const tax = inclusiveTaxOf(line.net, line.taxRate);
    byRate[line.taxRate] = (byRate[line.taxRate] ?? 0) + tax;
    taxTotal += tax;
  }
  return { taxTotal, byRate };
}

export function grandTotal(input: {
  subtotal: Paise;
  discountTotal: Paise;
  shippingTotal: Paise;
}): Paise {
  const total = input.subtotal - input.discountTotal + input.shippingTotal;
  if (total < 0) throw new RangeError("grandTotal cannot be negative");
  return total;
}

/**
 * The whole cart in one pass. Line nets are exact and sum to
 * subtotal minus discount; the function throws if they ever do not.
 */
export function priceCart(input: {
  lines: readonly PricingLine[];
  coupon: CouponRule | null;
  couponContext: CouponContext;
  shippingRate: ShippingRateInput | null;
}): CartTotals {
  const lines = input.lines.filter((line) => line.qty > 0);
  const subtotal = cartSubtotal(lines);

  const outcome = input.coupon ? evaluateCoupon(input.coupon, lines, input.couponContext) : null;
  const lineDiscounts = outcome?.ok ? outcome.lineDiscounts : new Map<string, Paise>();
  const discountTotal = outcome?.ok ? outcome.discountTotal : 0;
  const freeShipping = outcome?.ok ? outcome.freeShipping : false;

  const priced: PricedLine[] = lines.map((line) => {
    const total = lineTotal(line.unitPrice, line.qty);
    const discount = lineDiscounts.get(line.id) ?? 0;
    if (discount > total)
      throw new RangeError(`Discount ${discount} exceeds line total ${total} on ${line.id}`);
    const net = total - discount;
    return {
      ...line,
      lineTotal: total,
      discount,
      net,
      taxAmount: inclusiveTaxOf(net, line.taxRate),
    };
  });

  const netSum = priced.reduce((s, l) => s + l.net, 0);
  if (netSum !== subtotal - discountTotal) {
    throw new Error(
      `Pricing invariant broken: line nets ${netSum} != subtotal ${subtotal} - discount ${discountTotal}`,
    );
  }

  const shippingTotal =
    priced.length === 0
      ? 0
      : shippingEstimate({
          rate: input.shippingRate,
          subtotalAfterDiscount: subtotal - discountTotal,
          weightGrams: priced.reduce((s, l) => s + l.weightGrams * l.qty, 0),
          freeShipping,
        });
  const tax = taxBreakdown(priced);

  return {
    lines: priced,
    itemCount: priced.reduce((s, l) => s + l.qty, 0),
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal: tax.taxTotal,
    taxByRate: tax.byRate,
    grandTotal: grandTotal({ subtotal, discountTotal, shippingTotal }),
    freeShipping:
      freeShipping ||
      (input.shippingRate?.freeAbove !== null &&
        input.shippingRate !== null &&
        subtotal - discountTotal >= (input.shippingRate.freeAbove ?? Infinity) &&
        priced.length > 0),
    coupon: outcome?.ok ? { code: outcome.code, freeShipping: outcome.freeShipping } : null,
    couponError: outcome && !outcome.ok ? { code: outcome.code, message: outcome.message } : null,
  };
}
