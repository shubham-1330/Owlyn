/**
 * Money in Owlyn is always an integer number of paise (1 rupee = 100 paise).
 * Nothing in this module, or anywhere else, holds rupees as a float.
 */

export type Paise = number;

const INR_WHOLE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const INR_WITH_PAISE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Throws if `value` is not a safe integer. Use at every boundary where money enters. */
export function assertPaise(value: unknown, label = "amount"): asserts value is Paise {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TypeError(`${label} must be an integer number of paise, received ${String(value)}`);
  }
}

/** Convert a rupee amount (e.g. from a form) to paise. Rounds to the nearest paisa. */
export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) {
    throw new TypeError(`rupees must be a finite number, received ${String(rupees)}`);
  }
  return Math.round(rupees * 100);
}

/** Display only. Never feed the result back into arithmetic. */
export function paiseToRupees(paise: Paise): number {
  assertPaise(paise);
  return paise / 100;
}

/**
 * Format paise for display in Indian currency style: ₹4,499 or ₹12,34,567.50.
 * Whole-rupee amounts drop the decimals unless `showPaise` is set.
 */
export function formatINR(paise: Paise, options: { showPaise?: boolean } = {}): string {
  assertPaise(paise);
  const hasFraction = paise % 100 !== 0;
  const formatter = options.showPaise || hasFraction ? INR_WITH_PAISE : INR_WHOLE;
  return formatter.format(paise / 100);
}

/** `percent` of `paise`, rounded to the nearest paisa. 12.5% of 10000 → 1250. */
export function percentOf(paise: Paise, percent: number): Paise {
  assertPaise(paise);
  if (!Number.isFinite(percent) || percent < 0) {
    throw new RangeError(`percent must be a non-negative number, received ${String(percent)}`);
  }
  return Math.round((paise * percent) / 100);
}

/** Whole-number percentage off between an MRP and a selling price; 0 when there is no saving. */
export function discountPercent(compareAtPrice: Paise | null | undefined, price: Paise): number {
  assertPaise(price, "price");
  if (compareAtPrice == null) return 0;
  assertPaise(compareAtPrice, "compareAtPrice");
  if (compareAtPrice <= price || compareAtPrice <= 0) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** Sum a list of paise amounts. */
export function sumPaise(values: readonly Paise[]): Paise {
  return values.reduce<Paise>((total, value) => {
    assertPaise(value);
    return total + value;
  }, 0);
}

/** Clamp to a non-negative amount. Handy after subtracting discounts. */
export function nonNegative(paise: Paise): Paise {
  assertPaise(paise);
  return paise < 0 ? 0 : paise;
}
