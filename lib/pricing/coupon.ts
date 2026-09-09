import { formatINR, type Paise } from "@/lib/money";
import { allocate, roundHalfUp } from "@/lib/pricing/round";
import type { CouponContext, CouponOutcome, CouponRule, PricingLine } from "@/lib/pricing/types";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function lineTotal(unitPrice: Paise, qty: number): Paise {
  if (!Number.isInteger(qty) || qty < 0)
    throw new RangeError(`qty must be a non-negative integer, received ${String(qty)}`);
  return unitPrice * qty;
}

export function cartSubtotal(lines: readonly PricingLine[]): Paise {
  return lines.reduce((sum, line) => sum + lineTotal(line.unitPrice, line.qty), 0);
}

function fail(code: Exclude<CouponOutcome, { ok: true }>["code"], message: string): CouponOutcome {
  return { ok: false, code, message };
}

export function isLineEligible(coupon: CouponRule, line: PricingLine): boolean {
  switch (coupon.appliesTo) {
    case "ALL":
      return true;
    case "CATEGORY":
      return line.categoryIds.some((id) => coupon.categoryIds.includes(id));
    case "PRODUCT":
      return coupon.productIds.includes(line.productId);
    case "COLLECTION":
      return line.collectionIds.some((id) => coupon.collectionIds.includes(id));
  }
}

/** Cap a per-line discount map at `max`, redistributing proportionally when it binds. */
function capDiscounts(lineIds: string[], amounts: Paise[], max: Paise | null): Paise[] {
  const total = amounts.reduce((s, a) => s + a, 0);
  if (max === null || total <= max) return amounts;
  void lineIds;
  return allocate(max, amounts);
}

/**
 * Evaluates a coupon against a cart. Returns per-line discounts whose sum is
 * the discount total, so line nets always add up to the cart total.
 *
 * Rules the engine commits to:
 * - Within a dimension, the code either applies to a line or not; partially
 *   eligible carts discount only the eligible lines.
 * - PERCENT rounds half-up at the line level. A binding maxDiscount is spread
 *   across eligible lines proportionally with exact paise (largest remainder).
 * - FLAT is capped at the eligible subtotal and spread across eligible lines.
 * - BXGY makes the cheapest eligible units free: for every (buy + get) units,
 *   `get` of the cheapest units cost nothing.
 * - minOrderValue is checked against the whole cart subtotal before discount.
 */
export function evaluateCoupon(
  coupon: CouponRule | null,
  lines: readonly PricingLine[],
  ctx: CouponContext,
): CouponOutcome {
  if (!coupon) return fail("NOT_FOUND", "That code does not exist.");
  const code = coupon.code.toUpperCase();
  if (!coupon.isActive) return fail("INACTIVE", `${code} is not active right now.`);
  if (coupon.startsAt && coupon.startsAt > ctx.now) {
    return fail("NOT_STARTED", `${code} starts on ${DATE.format(coupon.startsAt)}.`);
  }
  if (coupon.endsAt && coupon.endsAt < ctx.now) {
    return fail("EXPIRED", `${code} expired on ${DATE.format(coupon.endsAt)}.`);
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return fail("EXHAUSTED", `${code} has been used up.`);
  }
  if (coupon.perUserLimit !== null && ctx.userRedemptions >= coupon.perUserLimit) {
    return fail("PER_USER_LIMIT", `You have already used ${code}.`);
  }
  if (coupon.isFirstOrderOnly && !ctx.isFirstOrder) {
    return fail("FIRST_ORDER_ONLY", `${code} is for first orders only.`);
  }

  const subtotal = cartSubtotal(lines);
  if (subtotal < coupon.minOrderValue) {
    return fail(
      "MIN_ORDER",
      `Add ${formatINR(coupon.minOrderValue - subtotal)} more to use ${code}.`,
    );
  }

  if (coupon.type === "FREE_SHIPPING") {
    return { ok: true, code, lineDiscounts: new Map(), discountTotal: 0, freeShipping: true };
  }

  const eligible = lines.filter((line) => line.qty > 0 && isLineEligible(coupon, line));
  if (eligible.length === 0) {
    return fail("NOT_APPLICABLE", `${code} does not apply to anything in your bag.`);
  }
  const ids = eligible.map((l) => l.id);
  const totals = eligible.map((l) => lineTotal(l.unitPrice, l.qty));

  let amounts: Paise[];
  switch (coupon.type) {
    case "PERCENT": {
      amounts = totals.map((t) => roundHalfUp((t * coupon.value) / 100));
      amounts = capDiscounts(ids, amounts, coupon.maxDiscount);
      break;
    }
    case "FLAT": {
      const eligibleSubtotal = totals.reduce((s, t) => s + t, 0);
      const amount = Math.min(
        coupon.value,
        eligibleSubtotal,
        coupon.maxDiscount ?? Number.MAX_SAFE_INTEGER,
      );
      amounts = allocate(amount, totals);
      break;
    }
    case "BXGY": {
      const buy = Math.max(1, coupon.bxgyBuyQty ?? 1);
      const get = Math.max(1, coupon.bxgyGetQty ?? 1);
      const units: Array<{ lineIndex: number; unitPrice: Paise }> = [];
      eligible.forEach((line, lineIndex) => {
        for (let i = 0; i < line.qty; i += 1) units.push({ lineIndex, unitPrice: line.unitPrice });
      });
      const sets = Math.floor(units.length / (buy + get));
      const freeCount = sets * get;
      if (freeCount === 0) {
        const needed = buy + get - units.length;
        return fail(
          "NOT_APPLICABLE",
          `Add ${needed} more eligible ${needed === 1 ? "item" : "items"} to use ${code}.`,
        );
      }
      units.sort((a, b) => a.unitPrice - b.unitPrice || a.lineIndex - b.lineIndex);
      amounts = eligible.map(() => 0);
      for (const unit of units.slice(0, freeCount))
        amounts[unit.lineIndex] = amounts[unit.lineIndex]! + unit.unitPrice;
      amounts = capDiscounts(ids, amounts, coupon.maxDiscount);
      break;
    }
    default:
      return fail("NOT_APPLICABLE", `${code} cannot be applied.`);
  }

  const lineDiscounts = new Map<string, Paise>();
  amounts.forEach((amount, i) => {
    if (amount > 0) lineDiscounts.set(ids[i]!, amount);
  });
  const discountTotal = amounts.reduce((s, a) => s + a, 0);
  if (discountTotal === 0) {
    return fail("NOT_APPLICABLE", `${code} does not reduce anything in your bag.`);
  }
  return { ok: true, code, lineDiscounts, discountTotal, freeShipping: false };
}
